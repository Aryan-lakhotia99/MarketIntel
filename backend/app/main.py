import asyncio
import os
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

# ✅ CRITICAL: Add CORS middleware FIRST, allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Then add routes
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "status": "online",
        "message": "Market Intelligence API is running successfully.",
        "documentation": "/docs"
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}
