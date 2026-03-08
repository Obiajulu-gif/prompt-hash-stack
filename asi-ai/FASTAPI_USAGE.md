# Prompthash FastAPI API – Integration Guide

This FastAPI app re-implements the original Flask/uAgents REST layer with the same request/response shapes. Use this guide to integrate it into another project or to run it locally for the existing HTML UI.

## Quick start
```bash
cd prompthash-api
pip install -r requirements.txt
ASICLOUD_API_KEY=... uvicorn prompthash_api.main:app --reload --host 0.0.0.0 --port 8000
```

Visit `http://127.0.0.1:8000/` for the existing HTML client (served from `templates/asi_chat.html`). All APIs sit under the `/api` prefix.

Render deployment instructions live in `RENDER_DEPLOY.md`.

## Key environment variables
- `ASICLOUD_API_KEY` (required for chat + improver + models)  
- `ASICLOUD_BASE_URL` (optional, default `https://inference.asicloud.cudos.org/v1`)
- `PROMPT_AGENT_MODEL` (chat fallback model, default `openai/gpt-oss-20b`)
- `PROMPT_IMPROVER_MODEL` (improver model, default `openai/gpt-oss-20b`)
- Frontend overrides (if you host the three agents elsewhere):  
  - `ASI_AGENT_API` (default `http://127.0.0.1:8000/api`)  
  - `ASI_IMPROVER_API` (default `http://127.0.0.1:8000/api`)  
  - `ASI_MODELS_API` (default `http://127.0.0.1:8000/api`)

## API endpoints
All responses are JSON. Errors return the same shape as success with an `error` field set.

### POST /api/chat
- **Request body**: `{"sender": "optional-id", "message": "text to send", "model": "optional-model-id"}`
- **Response**:  
  - `reply`: string (assistant text, with `<think>` sections formatted)  
  - `sender`: echoed sender id (defaults to `rest_client`)  
  - `total_messages`: running counter across all senders  
  - `history`: list of `{role, text}` (last 10 messages, preserves prior behavior)  
  - `model`: model actually used  
  - `error`: optional string on failure

### GET /api/health
UI-friendly shape: `{"ok": true, "agent": {"status": "ok", "agent_name": "...", "total_messages": <int>}}`  
Raw data (no wrapper): `/api/health/raw`

### POST /api/improve
- **Request body**: `{"prompt": "text to improve", "target": "text|image"}` (`target` defaults to `text`)
- **Response**:  
  - `response`: improved prompt (no extra commentary)  
  - `target`: normalized target (`text` or `image`)  
  - `model`: model used  
  - `error`: optional string on failure

### GET /api/improver/health
UI-friendly shape: `{"ok": true, "agent": {"status": "ok", "agent_name": "...", "total_requests": <int>}}`  
Raw data (no wrapper): `/api/improver/health/raw`

### GET /api/models
Lists available ASI models (requires `ASICLOUD_API_KEY`):
- `models`: list of model ids
- `model_details`: map of model id → `{name, display_name, description}`
- `categories`: grouped ids by `text`, `audio`, `image`, `video`
- `error`: present if listing fails or key is missing

### GET /api/models/health
Returns `{"status": "ok", "agent_name": "...", "total_requests": <int>}`.

## Example calls
Chat:
```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sender":"frontend_user","message":"Hello there!","model":"openai/gpt-oss-20b"}'
```

Prompt improver:
```bash
curl -X POST http://127.0.0.1:8000/api/improve \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a story about space.","target":"text"}'
```

Model list:
```bash
curl http://127.0.0.1:8000/api/models
```

## Project structure (for reuse)
- `prompthash_api/main.py`: FastAPI app factory and router wiring  
- `prompthash_api/routers/`: API routes (`chat.py`, `improver.py`, `models.py`, `pages.py` for HTML)  
- `prompthash_api/services/`: business logic (chat, improver, model list)  
- `prompthash_api/schemas/`: Pydantic request/response models  
- `prompthash_api/core/`: settings + in-memory state helpers  
- `templates/asi_chat.html`: existing HTML UI, works unchanged

## Deploying to Render (Web Service)
1) Create the service: Render Dashboard → “New +” → Web Service → connect your GitHub repo (root containing `prompthash-api`).  
2) Build command: `pip install -r prompthash-api/requirements.txt` (Python 3.11+).  
3) Start command: `cd prompthash-api && uvicorn prompthash_api.main:app --host 0.0.0.0 --port $PORT` (Render injects `PORT`).  
4) Environment variables (Render → Environment):  
   - `ASICLOUD_API_KEY=...` (required)  
   - Optional: `ASICLOUD_BASE_URL`, `PROMPT_AGENT_MODEL`, `PROMPT_IMPROVER_MODEL`  
   - Optional UI overrides: `ASI_AGENT_API`, `ASI_IMPROVER_API`, `ASI_MODELS_API`  
5) Health check path: `/api/health` (or `/api/improver/health`, `/api/models/health`).  
6) Verify after deploy: open the Render URL at `/` for the UI; `curl "$RENDER_URL/api/health"` to confirm.

## Integration tips
- Import the app directly: `from prompthash_api.main import app` and mount into your ASGI stack.  
- If you need the service classes independently, you can instantiate them with your own OpenAI client (`clients/asi_client.py`) and attach to your router.  
- All async endpoints are designed to be thread-safe for their in-memory counters/history; persistent storage can be swapped in by replacing the state classes in `core/state.py`.
