---
name: Cerebrium
description: >-
  Use for any Cerebrium task: deploying Python code to serverless GPU or CPU, writing or fixing
  cerebrium.toml, choosing hardware and regions, calling deployed endpoints (REST, streaming,
  WebSocket, async), autoscaling and concurrency, cold starts, secrets, CI/CD, and debugging a
  build or a running app from the terminal. Covers the cerebrium CLI, configuration defaults the
  API actually applies, accepted GPU identifiers with per-plan limits, and troubleshooting.
license: MIT
metadata:
  mintlify-proj: cerebrium
  version: "1.0"
---

# Cerebrium

Cerebrium runs Python workloads on serverless GPU and CPU: REST endpoints, SSE streaming,
WebSockets, and async jobs, with scale-to-zero and per-second billing. One `cerebrium.toml`
describes hardware, scaling, dependencies and runtime; one CLI (`cerebrium`) drives everything.

Reach for it when the workload is an inference API for an LLM, an embedding model or a vision
model; a real-time voice, video or streaming app; bursty traffic that should scale from zero
without holding idle GPUs; a deployment that has to run in several regions for latency or data
residency; or a migration off Replicate, Hugging Face or Mystic, each of which has a guide under
`https://cerebrium.ai/docs/migrations`.

This file carries the workflow and the rules. Load the reference that matches the task:

| Read | When |
| --- | --- |
| [`references/cli.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/cli.md) | Running any `cerebrium` command: the full surface, flags, non-interactive auth, CI/CD, which commands cost money. |
| [`references/config.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/config.md) | Writing or fixing `cerebrium.toml`: every key, the default the API applies when it is omitted, accepted ranges, rebuild triggers. |
| [`references/hardware.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/hardware.md) | Choosing `compute`, `gpu_count`, `region`, `provider`, `compute_tier`: accepted GPU identifiers, per-GPU and per-plan limits, regional availability, storage. |
| [`references/troubleshooting.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/troubleshooting.md) | A build that failed, an app that 5xxs or queues, slow cold starts, settings that reverted. |

## Rules for agents

1. **Deploys cost money.** `cerebrium deploy`, `cerebrium run` and `cerebrium apps scale` start
   billable compute, and `cerebrium apps delete` is destructive. State what will run on what
   hardware and get the user's confirmation before the first one in a session.
2. **`cerebrium run` is not local.** It packages the working directory, uploads it, and executes
   in the cloud on the hardware in `cerebrium.toml`. There is no local emulator.
3. **A `cerebrium.toml` key you leave out is reset to its default on deploy**, not left alone,
   and a misspelled key does nothing in the CLI while still reaching the backend. Keep every
   value that matters in the file, spelled as in [references/config.md](references/config.md).
4. **Never invent config keys or GPU identifiers.** Both are validated server-side and a wrong
   value fails the deploy. The accepted sets are in the references.
5. **Adapt an example before writing from scratch.** `https://github.com/CerebriumAI/examples`
   holds runnable references (vLLM, SDXL, Pipecat voice agents, ASGI apps), each with a working
   `cerebrium.toml`.
6. **Check the live docs when this skill does not cover it**, rather than guessing: the
   `cerebrium-docs` MCP server (search plus docs filesystem), any docs page as markdown by
   appending `.md` to its URL, or the index at `https://cerebrium.ai/docs/llms.txt`.

## First run: check state before acting

```bash
cerebrium version                   # installed? if not: pip install cerebrium
cerebrium projects current          # authenticated, and pointed at the intended project?
```

`cerebrium login` opens a browser and fails without a TTY. In CI or headless environments set
`CEREBRIUM_SERVICE_ACCOUNT_TOKEN` (or pass `--service-account-token`) instead: see
[`references/cli.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/cli.md).

## Zero to a deployed endpoint

Starting with no account: create one at `https://dashboard.cerebrium.ai`. The dashboard is also
where API keys and authentication tokens are created. Compute is billed per second; current rates
and any starting credit are at `https://www.cerebrium.ai/pricing`.

```bash
pip install cerebrium              # thin wrapper that fetches the Go binary on first use
cerebrium login                    # interactive only, needs an account
cerebrium init my-app && cd my-app
cerebrium deploy
```

The full loop:

1. Create an account at `https://dashboard.cerebrium.ai`, then `cerebrium login`.
2. `cerebrium init my-app` writes `main.py` and `cerebrium.toml`.
3. Write a function in `main.py` that takes and returns JSON-serialisable values. Everything at
   module scope runs once per replica at startup: load models there, not inside the function.
4. Set the config
   ([`references/config.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/config.md)).
   Do not skip `disable_auth` (the scaffold ships `true`, which makes the endpoint public) or
   `max_replicas` (default 1, the most common cause of queueing).
5. `cerebrium run main.py::run --prompt "test"` executes remotely on the configured hardware.
6. `cerebrium deploy` builds, uploads, starts the app, and prints the endpoint. Build output
   streams from this command and nowhere else.
7. Once running, `cerebrium logs APP_NAME` shows runtime logs.

## Choosing the runtime

Cortex is the default and needs no configuration. A custom runtime means the container starts
your own web server, and you own routing, middleware and auth. Opt in by adding
`[cerebrium.runtime.custom]` with an `entrypoint` and a matching `port`.

| The app | Runtime | Why |
| --- | --- | --- |
| A Python function you want reachable as an endpoint | Cortex | Cerebrium builds the route, parses the request, applies auth. |
| Streaming output token by token | Cortex | `yield` from the function and the response is SSE. A custom runtime buys nothing here. |
| FastAPI, ASGI, Gradio, anything already serving its own HTTP | Custom | Two servers cannot both own the port. |
| WebSockets, or anything bidirectional | Custom | Cortex serves HTTP only. Clients connect over `wss://`. |
| A self-contained server such as vLLM or Triton, custom batching, custom auth | Custom | The process is already the server. |

## Choosing a scaling metric

`scaling_metric` picks what the autoscaler watches, `scaling_target` is the level it holds.

| `scaling_metric` | Reach for it when | `scaling_target` means |
| --- | --- | --- |
| `concurrency_utilization` (default) | GPU inference, and anything whose request times vary | Percent of `replica_concurrency` held per replica. At `replica_concurrency = 200`, target 80 holds 160 in flight. |
| `requests_per_second` | You have measured a rate one replica sustains | Requests per second per replica. Target 5 holds 5 req/s. |
| `cpu_utilization` | CPU-bound work | Percent of `cpu`. At `cpu = 2`, target 80 holds 1.6 cores. |
| `memory_utilization` | Memory-bound work | Percent of `memory`. At `memory = 10`, target 80 holds 8 GB. |

`cpu_utilization` and `memory_utilization` need a live replica to measure, so the API rejects
both with `min_replicas = 0`, and rejects `scaling_buffer` alongside either. Ranges, the rest of
`[cerebrium.scaling]`, and how to pick `load_balancing_algorithm` are in
[`references/config.md`](https://github.com/CerebriumAI/cerebrium-skills/blob/master/skills/cerebrium/references/config.md).

## Calling the endpoint

```
POST https://api.cerebrium.ai/v4/{PROJECT_ID}/{APP_NAME}/{FUNCTION_NAME}
```

`PROJECT_ID` already includes its `p-` prefix (`p-abcd1234`), so the path reads
`/v4/p-abcd1234/my-app/run`. Do not add a second `p-`.

```bash
curl -X POST 'https://api.cerebrium.ai/v4/p-abcd1234/my-app/run' \
  -H 'Authorization: Bearer <JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "hello"}'
```

Response: `{ "run_id": "...", "run_time_ms": 326.34, "result": { ... } }`

- The token comes from the API Keys page of the dashboard, or from a service account.
- With `disable_auth = true` the endpoint takes unauthenticated requests from anyone.
- A function whose name starts with `_` is not exposed. Use that for helpers.
- **Streaming**: `yield` from the function; the response is `text/event-stream` (SSE).
- **Async**: append `?async=true` for fire-and-forget, bounded by `response_grace_period`
  (default 900 seconds, ceiling 12 hours).
- **WebSockets**: require a custom runtime (`[cerebrium.runtime.custom]`) and a `wss://` client.
- Regional hostnames such as `api.aws.us-east-1.cerebrium.ai` still resolve but proxy through
  the global router and add latency. Prefer `api.cerebrium.ai`.

## Secrets and automatic environment variables

```bash
cerebrium secrets add KEY=VALUE OTHER=VALUE   # project-wide; --app APP_ID scopes to one app
```

Secrets arrive as environment variables, read at container start, so an existing replica needs a
restart or redeploy to see a new one. Set automatically for every app: `APP_NAME`, `PROJECT_ID`
(`p-` prefixed), `BUILD_ID`, and `HF_HOME` (`/persistent-storage/.cache/huggingface`).
