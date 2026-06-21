from fastapi import APIRouter

from app.api.v1.endpoints import delivery, flows, indices, stocks, whale_tracker, news, analytics

api_router = APIRouter()
api_router.include_router(indices.router)
api_router.include_router(stocks.router)
api_router.include_router(delivery.router)
api_router.include_router(whale_tracker.router)
api_router.include_router(flows.router)
api_router.include_router(news.router)
api_router.include_router(analytics.router)
