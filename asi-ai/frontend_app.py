import os
from typing import Any, Dict

import requests
from flask import Flask, jsonify, render_template, request

# REST endpoints for chat, prompt improvement, and model list agents
AGENT_API = os.getenv("ASI_AGENT_API", "http://127.0.0.1:8010")
IMPROVER_API = os.getenv("ASI_IMPROVER_API", "http://127.0.0.1:8011")
MODELS_API = os.getenv("ASI_MODELS_API", "http://127.0.0.1:8012")

app = Flask(__name__)


@app.route("/")
def index() -> str:
    """Serve the chat UI."""
    return render_template(
        "asi_chat.html",
        agent_api=AGENT_API,
        improver_api=IMPROVER_API,
        models_api=MODELS_API,
    )


@app.route("/api/health", methods=["GET"])
def api_health():
    """Proxy health checks to the chat agent."""
    try:
        resp = requests.get(f"{AGENT_API}/health", timeout=5)
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()
        return jsonify({"ok": True, "agent": data})
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Proxy chat messages to the agent's /chat REST endpoint."""
    payload = request.get_json(silent=True) or {}
    sender = payload.get("sender") or "frontend_user"
    message = (payload.get("message") or "").strip()
    model = payload.get("model")

    if not message:
        return jsonify({"error": "Please provide a message to send."}), 400

    try:
        resp = requests.post(
            f"{AGENT_API}/chat",
            json={"sender": sender, "message": message, "model": model},
            timeout=30,
        )
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()
        return jsonify(data)
    except requests.RequestException as exc:
        return jsonify({"error": f"Could not reach agent: {exc}"}), 502


@app.route("/api/improver/health", methods=["GET"])
def api_improver_health():
    """Proxy health checks to the prompt improver agent."""
    try:
        resp = requests.get(f"{IMPROVER_API}/health", timeout=5)
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()
        return jsonify({"ok": True, "agent": data})
    except requests.RequestException as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502


@app.route("/api/improve", methods=["POST"])
def api_improve():
    """Proxy prompt improvement requests to the improver agent."""
    payload = request.get_json(silent=True) or {}
    prompt_text = (payload.get("prompt") or "").strip()
    target = (payload.get("target") or "text").strip()

    if not prompt_text:
        return jsonify({"error": "Please provide a prompt to improve."}), 400

    try:
        resp = requests.post(
            f"{IMPROVER_API}/improve",
            json={"prompt": prompt_text, "target": target},
            timeout=30,
        )
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()
        return jsonify(data)
    except requests.RequestException as exc:
        return jsonify({"error": f"Could not reach improver: {exc}"}), 502


@app.route("/api/models", methods=["GET"])
def api_models():
    """Proxy available model list from the ASI model agent."""
    try:
        resp = requests.get(f"{MODELS_API}/models", timeout=30)
        resp.raise_for_status()
        data: Dict[str, Any] = resp.json()
        return jsonify(data)
    except requests.RequestException as exc:
        return jsonify({"error": f"Could not reach model agent: {exc}"}), 502


if __name__ == "__main__":
    print("Starting Flask UI for the prompt chat agent...")
    print(f"Rendering template from templates/asi_chat.html against {AGENT_API}")
    app.run(host="127.0.0.1", port=5000, debug=True)
