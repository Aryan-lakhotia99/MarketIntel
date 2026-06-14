from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class Exchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"


class DealType(str, Enum):
    BULK = "BULK"
    BLOCK = "BLOCK"


class DealSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class DeliveryRecord(BaseModel):
    symbol: str
    series: str
    trade_date: date = Field(alias="tradeDate")
    close_price: float | None = Field(None, alias="closePrice")
    total_volume: int = Field(alias="totalVolume")
    delivery_quantity: int = Field(alias="deliveryQuantity")
    delivery_percent: float = Field(alias="deliveryPercent")
    exchange: Exchange = Exchange.NSE

    model_config = {"populate_by_name": True}


class BullishAccumulationAlert(BaseModel):
    symbol: str
    security_name: str | None = Field(None, alias="securityName")
    trade_date: date = Field(alias="tradeDate")
    delivery_percent: float = Field(alias="deliveryPercent")
    total_volume: int = Field(alias="totalVolume")
    delivery_quantity: int = Field(alias="deliveryQuantity")
    close_price: float | None = Field(None, alias="closePrice")
    exchange: Exchange = Exchange.NSE
    alert_reason: str = Field(alias="alertReason")

    model_config = {"populate_by_name": True}


class DeliveryScanResponse(BaseModel):
    trade_date: date = Field(alias="tradeDate")
    exchange: Exchange
    scanned_count: int = Field(alias="scannedCount")
    alerts: list[BullishAccumulationAlert]
    top_delivery: list[DeliveryRecord] = Field(alias="topDelivery")

    model_config = {"populate_by_name": True}


class BulkDealRecord(BaseModel):
    exchange: Exchange
    deal_type: DealType = Field(alias="dealType")
    trade_date: date = Field(alias="tradeDate")
    symbol: str
    security_name: str | None = Field(None, alias="securityName")
    client_name: str = Field(alias="clientName")
    side: DealSide
    quantity: int
    trade_price: float = Field(alias="tradePrice")
    remarks: str | None = None

    model_config = {"populate_by_name": True}


class EntityPrediction(BaseModel):
    client_name: str = Field(alias="clientName")
    predicted_parent: str | None = Field(None, alias="predictedParent")
    parent_category: str | None = Field(None, alias="parentCategory")
    confidence: float = Field(..., ge=0, le=100)
    is_shell_entity: bool = Field(alias="isShellEntity")
    reasoning: list[str]

    model_config = {"populate_by_name": True}


class BulkDealWithPrediction(BulkDealRecord):
    prediction: EntityPrediction


class WhaleTrackerResponse(BaseModel):
    as_on_date: date = Field(alias="asOnDate")
    deals: list[BulkDealWithPrediction]
    buy_deals: list[BulkDealWithPrediction] = Field(alias="buyDeals")
    sell_deals: list[BulkDealWithPrediction] = Field(alias="sellDeals")

    model_config = {"populate_by_name": True}


class SymbolDeliveryHistoryResponse(BaseModel):
    symbol: str
    exchange: Exchange
    records: list[DeliveryRecord]
