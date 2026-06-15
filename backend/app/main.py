import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and launch the live breakout background scanner
    from app.core.db import init_db
    init_db()
    
    from app.api.v1.endpoints.analytics import scan_market_task
    task = asyncio.create_task(scan_market_task())
    yield
    # Shutdown: Terminate the background scanner task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for Financial News & Market Intelligence",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}
