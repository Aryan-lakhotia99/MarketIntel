from pydantic import BaseModel, Field
from datetime import datetime

class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Watchlist name")

class WatchlistAddStock(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20, description="Stock ticker symbol, e.g. RELIANCE")

class WatchlistResponse(BaseModel):
    id: int
    name: str
    items: list[str] = Field(default=[], description="List of stock tickers in the watchlist")
    created_at: str = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True

class WatchlistStockRequest(BaseModel):
    watchlist_id: int = Field(..., alias="watchlistId")
    symbol: str = Field(..., min_length=1, max_length=20, description="Stock ticker symbol")

    class Config:
        populate_by_name = True
