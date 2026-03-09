from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .api.routes import auth as auth_routes
from .api.routes import profile as profile_routes
from .api.routes import session as session_routes
from .api.routes import matches as matches_routes


def create_app() -> FastAPI:
    app = FastAPI(title="Quick Datings API", version="0.1.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
    app.include_router(profile_routes.router, prefix="/api/profile", tags=["profile"])
    app.include_router(session_routes.router, prefix="/api/session", tags=["session"])
    app.include_router(matches_routes.router, prefix="/api", tags=["matches"])

    return app


app = create_app()

