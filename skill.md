---
name: Cerebrium
description: Use when deploying serverless AI/ML workloads, building real-time inference APIs, configuring auto-scaling for GPU or CPU apps, managing containerized Python applications, or optimizing cold-start performance for production inference endpoints.
license: MIT
metadata:
    mintlify-proj: cerebrium
    version: "1.0"
---

# Cerebrium Skill

## Product Summary

Cerebrium is a serverless GPU/CPU platform for deploying real-time AI workloads with automatic scaling, low cold starts, and pay-per-second billing. Deploy Python apps as REST APIs, streaming endpoints, WebSockets, or async tasks using a single `cerebrium.toml` configuration file. The CLI (`cerebrium init`, `cerebrium deploy`, `cerebrium run`) handles containerization, dependency management, and infrastructure orchestration automatically. Key files: `cerebrium.toml` (configuration), `main.py` (app code), `requirements.txt` (optional dependencies). Primary docs: https://cerebrium.ai/docs

## When to Use

Reach for Cerebrium when:
- Deploying inference APIs for LLMs, embeddings, or vision models
- Building real-time voice, video, or streaming applications
- Needing automatic scaling from zero to thousands of concurrent requests
- Optimizing cold-start latency for production workloads
- Running GPU-intensive workloads with pay-per-use pricing
- Managing multi-region deployments for global latency
- Replacing Hugging Face Spaces, Replicate, or Mystic deployments
- Testing code snippets in the cloud with `cerebrium run`

## Quick Reference

### CLI Commands

| Command | Purpose |
|---------|---------|
| `cerebrium login` | Authenticate CLI session |
| `cerebrium init <name>` | Create new project with `cerebrium.toml` and `main.py` |
| `cerebrium run main.py::function --arg value` | Execute function in cloud (testing/iteration) |
| `cerebrium deploy` | Build and deploy app as persistent endpoint |
| `cerebrium deploy -y` | Deploy without confirmation |

### Core Configuration Sections

| Section | Purpose | Key Fields |
|---------|---------|-----------|
| `[cerebrium.deployment]` | App metadata, Python version, dependencies | `name`, `python_version`, `disable_auth`, `use_uv` |
| `[cerebrium.hardware]` | CPU, memory, GPU specs | `cpu`, `memory`, `compute`, `gpu_count`, `region` |
| `[cerebrium.scaling]` | Auto-scaling behavior | `min_replicas`, `max_replicas`, `replica_concurrency`, `scaling_metric`, `scaling_target` |
| `[cerebrium.runtime.custom]` | Custom web server (FastAPI, etc.) | `entrypoint`, `port`, `healthcheck_endpoint` |
| `[cerebrium.dependencies.pip]` | Python packages | `torch = "latest"`, `transformers = "==4.30.0"` |

### Endpoint URL Format

```
https://api.cerebrium.ai/v4/p-{PROJECT_ID}/{APP_NAME}/{FUNCTION_NAME}
```

### Authentication

- Default: `disable_auth = true` (endpoints public)
- Secure: `disable_auth = false` (requires JWT token from API Keys dashboard)
- Token passed as: `Authorization: Bearer <JWT_TOKEN>`

### Automatic Environment Variables

- `APP_NAME` — app name
- `PROJECT_ID` — project ID
- `BUILD_ID` — current build ID
- `HF_HOME` — `/persistent-storage/.cache/huggingface` (HuggingFace model cache)

## Decision Guidance

### When to Use Cortex vs Custom Runtime

| Scenario | Use | Reason |
|----------|-----|--------|
| Simple function-to-endpoint | Cortex (default) | Automatic REST API, minimal config |
| FastAPI/Flask app | Custom runtime | Full control over routing, auth, middleware |
| WebSocket or streaming | Custom runtime | Cortex doesn't support bidirectional comms |
| Gradio/Streamlit dashboard | Custom runtime | Requires ASGI server |
| LLM with vLLM/TensorRT | Custom runtime | Self-contained server, no Python wrapper |

### Scaling Metric Selection

| Metric | Best For | Example |
|--------|----------|---------|
| `concurrency_utilization` (default) | GPU inference, variable request times | `replica_concurrency=1`, `scaling_target=100` |
| `requests_per_second` | Benchmarked throughput targets | `scaling_target=5` maintains 5 req/s |
| `cpu_utilization` | CPU-bound workloads | `cpu=2`, `scaling_target=80` maintains 1.6 CPUs |
| `memory_utilization` | Memory-constrained apps | `memory=10`, `scaling_target=80` maintains 8GB |

### Compute Tier Trade-off

| Tier | Cost | Interruption Risk | Use Case |
|------|------|-------------------|----------|
| `interruptible` (default) | Base rate | May be interrupted/relocated | Dev, batch, cost-sensitive |
| `protected` | 2x base rate | No interruptions | Production, long-running requests, SLA-critical |

### Load Balancing Algorithm

| Algorithm | Best For | Tradeoff |
|-----------|----------|----------|
| `first-available` (default for `replica_concurrency <= 3`) | GPU inference | Maximizes warm replica utilization, uneven distribution |
| `round-robin` | Uniform request times | Even distribution over time, consistent p50 |
| `min-connections` | Variable request times (LLMs) | Best p90/p99 tail latency, higher selection overhead |
| `random-choice-2` | High-throughput, many replicas | O(1) selection, near-optimal distribution |

## Workflow

### 1. Initialize and Configure

```bash
cerebrium init my-app
cd my-app
```

Edit `cerebrium.toml`:
- Set `name`, `python_version`, hardware (`cpu`, `memory`, `compute`)
- Add dependencies under `[cerebrium.dependencies.pip]`
- Configure scaling: `min_replicas`, `max_replicas`, `replica_concurrency`
- For custom servers, add `[cerebrium.runtime.custom]` with `entrypoint` and `port`

### 2. Write App Code

Create `main.py` with a function:

```python
def predict(prompt: str):
    # Your inference logic
    return {"result": "output"}
```

For custom runtime (FastAPI):

```python
from fastapi import FastAPI
app = FastAPI()

@app.post("/predict")
def predict(prompt: str):
    return {"result": "output"}
```

### 3. Test Locally (Optional)

```bash
cerebrium run main.py::predict --prompt "test"
```

This executes in the cloud without deploying.

### 4. Deploy

```bash
cerebrium deploy
```

The CLI:
- Uploads code and dependencies
- Builds container image
- Creates persistent endpoint
- Returns endpoint URL in dashboard

### 5. Call Endpoint

```bash
curl -X POST https://api.cerebrium.ai/v4/p-xxx/my-app/predict \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello"}'
```

### 6. Monitor and Iterate

- Check dashboard for logs, metrics, cold-start times
- Update `cerebrium.toml` and redeploy
- Use `cerebrium run` for quick testing before full deploy

## Common Gotchas

- **Auth disabled by default**: `disable_auth = true` makes endpoints public. Set to `false` for production.
- **Port mismatch**: Custom runtime `entrypoint` port must match `port` in config.
- **Secrets require restart**: Update secrets in dashboard, then restart container or redeploy.
- **GPU concurrency = 1**: GPU apps default to `replica_concurrency = 1`. Increase only if batching is handled in code.
- **Cold starts with `min_replicas = 0`**: Set `min_replicas > 0` to keep warm instances, but costs increase.
- **Python version changes trigger full rebuild**: Changing `python_version` rebuilds entire image; batch changes together.
- **APT/Conda changes trigger full rebuild**: System package changes are slower than pip-only updates.
- **Private Docker images need auth**: Public images (no namespace) work; namespaced images (e.g., `bob/image`) require `docker login -u username`.
- **Async functions run max 12 hours**: Bounded by `response_grace_period` (default 900s). Increase if needed.
- **Streaming requires custom runtime**: Cortex runtime doesn't support SSE or WebSocket streaming.
- **HuggingFace token in secrets**: Store as `HF_TOKEN` or `HF_AUTH_TOKEN` in dashboard secrets, access via `os.environ.get()`.
- **Persistent storage path**: `/persistent-storage/` is available across deployments; use for model weights.
- **Region selection**: Omit `region` to let platform choose; set `region = "global"` for any region with capacity.

## Verification Checklist

Before deploying to production:

- [ ] `cerebrium.toml` has correct `name` (3-30 lowercase alphanumeric + dashes)
- [ ] `disable_auth = false` if endpoint should be protected
- [ ] `replica_concurrency` matches app's actual concurrency capability (1 for GPU inference)
- [ ] `max_replicas` set to prevent runaway costs
- [ ] `min_replicas` appropriate for cold-start tolerance vs. cost
- [ ] Custom runtime: `port` in entrypoint matches `port` in config
- [ ] All secrets added to dashboard and referenced in code via `os.environ.get()`
- [ ] Dependencies listed in `[cerebrium.dependencies.pip]` or `requirements.txt`
- [ ] `cerebrium run` test passes before full deploy
- [ ] Endpoint URL format verified: `https://api.cerebrium.ai/v4/p-{PROJECT_ID}/{APP_NAME}/{FUNCTION}`
- [ ] Response format includes `run_id`, `run_time_ms`, `result` fields
- [ ] Health/readiness endpoints configured if using custom runtime
- [ ] Scaling metrics and targets match workload (e.g., `concurrency_utilization` for GPU)
- [ ] Gradual rollout disabled in dev (`roll_out_duration_seconds = 0`)

## Resources

**Comprehensive navigation**: https://cerebrium.ai/docs/llms.txt

**Example apps**: https://github.com/CerebriumAI/examples — runnable end-to-end projects covering LLMs, voice agents, image and video, batching, and embeddings. Adapt an example before writing an app from scratch.

**Critical docs**:
1. [TOML Reference](https://cerebrium.ai/docs/toml-reference/toml-reference) — all configuration options
2. [Scaling Apps](https://cerebrium.ai/docs/scaling/scaling-apps) — auto-scaling, replicas, metrics
3. [Defining Container Images](https://cerebrium.ai/docs/container-images/defining-container-images) — dependencies, custom runtimes, base images

---

> For additional documentation and navigation, see: https://cerebrium.ai/docs/llms.txt