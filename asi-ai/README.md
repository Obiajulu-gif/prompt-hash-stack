## Prompthash ASI FastAPI API

This folder contains a standalone FastAPI backend that exposes a unified REST API for the PromptHash frontend (now targeting **Stacks + x402** for on-chain payment flows) and the hosted ASI AI service at `https://prompthash-asi.onrender.com`:

- **Chatting with ASI models** (via a chat agent)
- **Improving prompts** for text or image generation
- **Listing available ASI models** and their metadata

It replaces an older Flask/uAgents REST layer with a modern FastAPI implementation, while preserving the same request and response shapes so that existing frontends (including the bundled `asi_chat.html`) continue to work without changes.

The service can be:

- Run **locally** for development and testing
- Deployed as a **Render Web Service** ([Render URL](https://prompthash-asi.onrender.com))
- Embedded into a larger ASGI app by importing and mounting the FastAPI app object

---

## Features

- **FastAPI backend** with typed request/response models and automatic OpenAPI docs
- **Three core domains** exposed under a single `/api` prefix:
  - `/api/chat` – chat with an ASI model and keep a rolling message history
  - `/api/improve` – improve prompts for text or image generation
  - `/api/models` – list available ASI models and grouped categories
- **HTML UI** at `/` served from `templates/asi_chat.html`, wired to the same APIs
- **Environment-based configuration** for model IDs and ASI base URL
- **CORS enabled** (permissive) for easy local and browser-side integrations

---

## Architecture & Project Structure

High-level layout of the `prompthash-api` folder:

- `prompthash-api/` – project root for this service
  - `requirements.txt` – Python dependencies
  - `FASTAPI_USAGE.md` – quick integration and API usage guide
  - `frontend_app.py` – legacy Flask proxy app for the original uAgents-based agents
  - `templates/asi_chat.html` – single-page HTML UI for chat + prompt improver
  - `prompthash_api/` – FastAPI package
    - `main.py` – FastAPI app factory and router wiring
    - `routers/` – endpoint definitions:
      - `chat.py` – chat API routes
      - `improver.py` – prompt improver routes
      - `models.py` – model listing routes
      - `pages.py` – HTML page routes (serves `/` and static UI)
    - `services/` – business logic/services:
      - `chat_service.py` – chat orchestration and history handling
      - `prompt_improver_service.py` – prompt improvement logic
      - `model_list_service.py` – ASI model listing and categorization
    - `schemas/` – Pydantic models for request/response bodies:
      - `chat.py`, `improver.py`, `models.py`
    - `core/`:
      - `config.py` – configuration and environment variable loading
      - `state.py` – in-memory state helpers (counters, history)
    - `clients/asi_client.py` – ASI/uAgents client wrapper used by services

At runtime, the FastAPI app is constructed in `prompthash_asi.main.create_app()` and exposed as a module-level `app` suitable for ASGI servers like `uvicorn` or `gunicorn`.

---

## Requirements

Python dependencies are defined in `requirements.txt`:

- `uagents`
- `openai`
- `python-dotenv`
- `fastapi`
- `uvicorn[standard]`
- `Jinja2`

You need:

- **Python 3.11 or 3.12** (3.12 strongly recommended for production)  
  > **Note:** Python 3.13 and later (including 3.14) are **not supported** due to current incompatibility with the `uagents` package.
- A valid **`ASICLOUD_API_KEY`** to access ASI models (for chat, improver, and model listing endpoints).

---

## Environment Variables

Core environment variables used by the FastAPI service:

- **`ASICLOUD_API_KEY`** (required)  
  API key for ASI model access used by chat, improver, and model listing.

- **`ASICLOUD_BASE_URL`** (optional)  
  Base URL for ASI API calls. Default: `https://inference.asicloud.cudos.org/v1`

- **`PROMPT_AGENT_MODEL`** (optional)  
  Default model for chat if the client does not specify one.  
  Default: `openai/gpt-oss-20b`

- **`PROMPT_IMPROVER_MODEL`** (optional)  
  Default model for the prompt improver.  
  Default: `openai/gpt-oss-20b`

UI proxy overrides (used mainly by `frontend_app.py` and `asi_chat.html`):

- **`ASI_AGENT_API`** – Base URL of the chat agent  
  Default: `http://127.0.0.1:8010`
- **`ASI_IMPROVER_API`** – Base URL of the prompt improver agent  
  Default: `http://127.0.0.1:8011`
- **`ASI_MODELS_API`** – Base URL of the model listing agent  
  Default: `http://127.0.0.1:8012`

These defaults allow you to run the FastAPI app locally while still proxying to separately running agents if desired.

---

## Local Development

### 1. Clone and enter the project

```bash
git clone https://github.com/OkeyAmy/prompthash-asi.git
cd prompthash-asi
```

On Windows (PowerShell), you can use:

```powershell
git clone https://github.com/OkeyAmy/prompthash-asi.git
cd prompthash-asi
```

### 2. Create and activate a virtual environment (recommended)

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Set required environment variables

For a local session (Linux/macOS):

```bash
export ASICLOUD_API_KEY="your-asicloud-api-key"
```

On Windows PowerShell:

```powershell
$env:ASICLOUD_API_KEY = "your-asicloud-api-key"
```

You can optionally configure other variables (e.g. `PROMPT_AGENT_MODEL`) in the same way or via a `.env` file loaded by `python-dotenv`. Keep `.env` files out of version control.

### 5. Run the FastAPI app with Uvicorn

From the `prompthash-asi` directory:

```bash
uvicorn prompthash_asi.main:app --reload --host 0.0.0.0 --port 8000
```

Visit:

- `http://127.0.0.1:8000/` – HTML UI (chat + prompt improver)
- `http://127.0.0.1:8000/docs` – FastAPI interactive docs (Swagger UI)
- `http://127.0.0.1:8000/redoc` – ReDoc API reference

---

## API Overview

All JSON APIs are mounted under the `/api` prefix. Response shapes are documented in detail in `FASTAPI_USAGE.md`, but the most important endpoints are:

### POST `/api/chat`

Send a message to the chat agent and receive a reply plus rolling history.

- **Request body**:

  ```json
  {
    "sender": "optional-id",
    "message": "text to send",
    "model": "optional-model-id"
  }
  ```

- **Response (simplified)**:

  - `reply`: assistant text (with `<think>` sections formatted)
  - `sender`: echoed sender id (defaults to `rest_client`)
  - `total_messages`: running counter across all senders
  - `history`: last 10 `{role, text}` messages
  - `model`: model actually used
  - `error`: optional error string

### GET `/api/health`

Health check for the chat service:

```json
{
  "status": "ok",
  "agent_name": "...",
  "total_messages": 0
}
```

### POST `/api/improve`

Improve a prompt for text or image generation.

- **Request body**:

  ```json
  {
    "prompt": "text to improve",
    "target": "text"
  }
  ```

  `target` can be `"text"` or `"image"` (defaults to `"text"`).

- **Response (simplified)**:

  - `response`: improved prompt
  - `target`: normalized target
  - `model`: model used
  - `error`: optional error string

### GET `/api/improver/health`

Health check for the prompt improver service.

### GET `/api/models`

List available ASI models:

- `models`: list of model ids
- `model_details`: map of id → `{name, display_name, description}`
- `categories`: grouped model ids by capability (`text`, `audio`, `image`, `video`)
- `error`: present if listing fails or key is missing

### GET `/api/models/health`

Health check for the model listing service.

For concrete curl examples, see `FASTAPI_USAGE.md`.

---

## HTML Frontend (`asi_chat.html`)

The `templates/asi_chat.html` file is a single-page UI that:

- Is served at the root path `/` via the `pages` router
- Provides a **chat panel** and a **prompt improver panel** in one responsive layout
- Calls the FastAPI endpoints:
  - `/api/chat`
  - `/api/improve`
  - `/api/models`
- Is styled with modern, responsive CSS so it is usable on both **mobile** and **desktop**

You can customize this HTML file to align with your own branding or embed the API into your own frontend entirely.

---

## Deployment

The service is designed to deploy cleanly to ASGI-capable platforms. A Render-specific guide is already included in `RENDER_DEPLOY.md`. In short:

- Install dependencies using:

  ```bash
  pip install -r prompthash-api/requirements.txt
  ```

- Start the app using:

  ```bash
  cd prompthash-asi && uvicorn prompthash_asi.main:app --host 0.0.0.0 --port $PORT
  ```

  (On Render, `$PORT` is injected automatically.)

Set environment variables (at least `ASICLOUD_API_KEY`) via your platform’s configuration UI or secrets manager. Do **not** commit secrets or `.env` files to Git.

Health checks can be pointed at any of:

- `/api/health`
- `/api/improver/health`
- `/api/models/health`

---

## Using the FastAPI App in Another Project

Instead of running `uvicorn` directly, you can import the FastAPI app object and mount it into your own ASGI stack:

```python
from fastapi import FastAPI
from prompthash_api.main import app as prompthash_app

app = FastAPI()
app.mount("/prompthash", prompthash_app)
```

This allows you to:

- Host multiple microservices under a single domain
- Reuse the chat, improver, and model listing APIs inside a larger application

If you need access to the underlying service classes, you can import them from `prompthash_asi.services` and wire them into your own routers.

---

## Legacy Flask Frontend (`frontend_app.py`)

The `frontend_app.py` module provides a minimal Flask app that:

- Serves the same `asi_chat.html` UI
- Proxies `/api/chat`, `/api/improve`, and `/api/models` to external agents
- Is mainly kept for backward compatibility with setups that still use the original uAgents-based agents

For new deployments, prefer using the **FastAPI app** defined in `prompthash_asi.main`.

---

## Contributing & Maintenance

- Follow standard Python best practices (PEP 8, type hints where appropriate).
- Keep `requirements.txt` updated and pin versions when promoting to production.
- Add tests for new routers and services before changing behavior.
- Ensure that any changes preserve the existing request/response shapes unless you also update the frontend and dependent clients.

If you extend this service (for example, adding new ASI tools or routes), keep each feature in its own well-structured subfolder (routers, services, schemas) so the project remains modular and scalable.



