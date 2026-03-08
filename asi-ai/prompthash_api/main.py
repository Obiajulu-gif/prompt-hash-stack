from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from prompthash_api.routers import chat, improver, models, pages


def create_app() -> FastAPI:
    app = FastAPI(title="Prompthash ASI FastAPI", version="1.0.0")

    # Mirror the permissive CORS behavior expected by local HTML usage.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_router = APIRouter(prefix="/api")
    api_router.include_router(chat.router)
    api_router.include_router(improver.router)
    api_router.include_router(models.router)

    app.include_router(api_router)
    app.include_router(pages.router)
    return app


app = create_app()

