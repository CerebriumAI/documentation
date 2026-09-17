# cerebrium.toml

One file per app, read by `cerebrium deploy` and `cerebrium run`.

Two rules to internalise before editing one:

1. **A key you leave out is set to the default, not left alone.** A deploy replaces the whole app
   record. If a previous deploy or `cerebrium apps scale` set `max_replicas = 20` and the TOML
   you deploy has no `max_replicas`, the app goes back to 1. Keep every value that matters in the
   file.
2. **A key the CLI does not recognise is not rejected locally.** A misspelled `max_replica` does
   not fail the deploy in the CLI, it just does nothing there. The whole file is uploaded
   verbatim, so the backend sees the key too and is free to reject it. Check spelling against the
   tables below rather than trusting a successful deploy. A TOML that does not parse at all does
   fail the deploy.

Defaults below are what the API applies when the key is absent. Where a published table
disagrees, prefer these, and set anything that matters explicitly.

## `[cerebrium.deployment]`

| Key | Applied when omitted | Notes |
| --- | --- | --- |
| `name` | required | App name. |
| `python_version` | `3.11` | `3.10`, `3.11`, `3.12` and `3.13` are accepted. Changing it forces a full rebuild. |
| `disable_auth` | `true` | **`true` means the endpoint is public.** Set `false` for anything real. |
| `include` | `["./*", "main.py", "cerebrium.toml"]` | Keep model weights out of it. |
| `exclude` | `[".*"]` | |
| `shell_commands` | `[]` | Run at the end of the build. |
| `pre_build_commands` | `[]` | Run before dependencies install. |
| `docker_base_image_url` | `debian:bookworm-slim` | Changing it forces a full rebuild. |
| `use_uv` | `false` | uv instead of pip. Much faster on large dependency trees. |
| `deployment_initialization_timeout` | `600` | Seconds, 60 to 830. Raise it when weights load slowly. |

`cerebrium init` scaffolds `disable_auth = true`. That is a convenience for a first curl, not a
production default. Treat flipping it to `false` as part of the first real deploy.

## `[cerebrium.runtime]`

| Key | Applied when omitted | Notes |
| --- | --- | --- |
| `container_runtime` | platform default | `"v1"` is runc, `"v2"` is gvisor. Any other value fails the deploy locally. |

The sub-tables in the next two sections sit under the same heading and can be set alongside
`container_runtime`.

## `[cerebrium.runtime.custom]`

Only for a custom web server (FastAPI, ASGI, WebSockets, custom batching) or a Dockerfile build.
Omit the section to use the default Cortex runtime.

| Key | Applied when omitted | Notes |
| --- | --- | --- |
| `port` | `8000` | Must match the port inside `entrypoint`. |
| `entrypoint` | required | A list (`["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`) or a single string. The list form is unambiguous, prefer it. |
| `healthcheck_endpoint` | `""` (TCP ping) | Non-200 marks the instance unhealthy and restarts it. |
| `readycheck_endpoint` | `""` (TCP ping) | Non-200 removes the instance from routing. |
| `dockerfile_path` | unset | Build from a Dockerfile instead. The path must exist locally, and the image then owns its own dependencies and Python version. |

## `[cerebrium.runtime.deepgram]` and `[cerebrium.runtime.rime]`

Partner service runtimes. The table name is the partner, and an app uses one of them or neither.
Omit both unless you are deploying that partner's image.

| Key | Applied when omitted | Notes |
| --- | --- | --- |
| `port` | partner default | Port the partner service listens on. |
| `model_name` | partner default | Partner model identifier, for example `arcana` or `mist`. |
| `language` | partner default | Language code, for example `en`. |

```toml
[cerebrium.runtime.deepgram]
model_name = "arcana"
language = "en"
```

## `[cerebrium.hardware]`

| Key | Applied when omitted | Accepted |
| --- | --- | --- |
| `cpu` | `2.0` | Depends on the compute type and the plan. See `references/hardware.md`. |
| `memory` | `4.0` | GB of host RAM, not VRAM. Same limits apply. |
| `compute` | `"CPU"` | One identifier, or a preference-ordered list of up to 5 from the same family. |
| `gpu_count` | `1` when `compute` is an accelerator, `0` for `CPU` | Per-type maximum, capped again by the plan. |
| `provider` | platform picks | `aws`, `crusoe` or `nebius`. |
| `region` | platform picks | See `references/hardware.md`. |

## `[cerebrium.scaling]`

| Key | Applied when omitted | Accepted | Notes |
| --- | --- | --- | --- |
| `min_replicas` | `0` | 0 to 2000, capped by plan | Above 0 keeps warm capacity and bills for it. |
| `max_replicas` | `1` | 1 to 2000, capped by plan | The most common cause of unexplained queueing. Raise it before load. |
| `replica_concurrency` | `1` on an accelerator, `100` on CPU | >= 1 | In-flight requests per replica. |
| `scaling_metric` | `concurrency_utilization` | `concurrency_utilization`, `requests_per_second`, `cpu_utilization`, `memory_utilization` | |
| `scaling_target` | `100` | 1 to 100 for the utilization metrics, any positive rate for `requests_per_second` | |
| `scaling_buffer` | `0` | >= 0 | Extra replicas above what the metric asks for. Rejected with `cpu_utilization` or `memory_utilization`. |
| `cooldown` | `10` | 0 to 3600 seconds | Time at reduced load before scaling down. |
| `response_grace_period` | `900` | 16 to 43200 seconds | Also the ceiling on an async run, so 12 hours is the maximum. |
| `evaluation_interval_seconds` | `30` | 6 to 300 | Window metrics are evaluated over. |
| `load_balancing_algorithm` | `round-robin` | `round-robin`, `first-available`, `min-connections`, `random-choice-2` | `first-available` suits `replica_concurrency = 1` GPU work. |
| `compute_tier` | `interruptible` | `interruptible`, `protected` | `protected` is on-demand: higher availability, higher price. |
| `roll_out_duration_seconds` | `0` | 0 to 21600 | Gradual traffic shift to a new revision. Keep 0 while iterating. |

Two combinations the API rejects outright:

- `cpu_utilization` or `memory_utilization` with `min_replicas = 0`. These metrics need a running
  replica to measure, so set `min_replicas` to at least 1.
- `scaling_buffer` with either of those two metrics.

## Dependencies

```toml
[cerebrium.dependencies.pip]
torch = "==2.0.0"        # exact
transformers = "latest"
numpy = ">=1.26"

[cerebrium.dependencies.apt]
ffmpeg = "latest"

[cerebrium.dependencies.conda]
cudatoolkit = "11.7"

[cerebrium.dependencies.paths]
pip = "requirements.txt"
apt = "pkglist.txt"
```

## `[cerebrium.experimental]`

```toml
[cerebrium.experimental]
checkpointing = true
```

Turns on memory and GPU checkpointing (beta, availability varies by account). The container also
has to POST to `http://169.254.169.253:8234/checkpoint` once initialisation is done, so it is a
config change plus a code change. See `references/troubleshooting.md` for where it sits in the
cold-start order.

## What forces a full rebuild

Batch these edits together, they are the slow ones:

- `python_version`
- `docker_base_image_url`
- any `[cerebrium.dependencies.apt]` or `[cerebrium.dependencies.conda]` change

Pip-only changes and code changes are much cheaper.

## Worked example

```toml
[cerebrium.deployment]
name = "llm-inference"
python_version = "3.12"
disable_auth = false
include = ["./*", "main.py", "cerebrium.toml"]
exclude = [".*"]
use_uv = true
deployment_initialization_timeout = 800

[cerebrium.hardware]
cpu = 8
memory = 32.0
compute = ["HOPPER_H100", "AMPERE_A100_80GB"]
gpu_count = 1
region = "us-east-1"

[cerebrium.scaling]
min_replicas = 0
max_replicas = 10
replica_concurrency = 1
scaling_metric = "concurrency_utilization"
scaling_target = 100
cooldown = 60
compute_tier = "protected"

[cerebrium.dependencies.pip]
vllm = "latest"
```

## Private base images

Log in to the registry before deploying an app that pulls one:

```bash
docker login -u your-dockerhub-username     # not the bare `docker login` OAuth flow
```

## Checklist before deploying

- [ ] Every value that matters is in the file, including ones set by a previous `apps scale`
- [ ] `disable_auth` is deliberate, and `false` if the endpoint is not meant to be public
- [ ] `max_replicas` matches the traffic you expect, not the default 1
- [ ] `replica_concurrency` matches the workload (1 for one-request-per-GPU inference)
- [ ] `compute` uses an accepted identifier, and `cpu`, `memory` and `gpu_count` are inside that
      type's limits and the plan's (`references/hardware.md`)
- [ ] weights load from `/persistent-storage`, not baked into the image or in `include`
- [ ] custom runtime: the port in `entrypoint` equals `port`
- [ ] secrets are added with `cerebrium secrets add`, never hardcoded
