from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class FlowTrend(str, Enum):
    INCREASED = "INCREASED"
    DECREASED = "DECREASED"
    UNCHANGED = "UNCHANGED"


class FiiDiiFlow(BaseModel):
    category: str
    trade_date: date = Field(alias="tradeDate")
    buy_value_cr: float = Field(alias="buyValueCr")
    sell_value_cr: float = Field(alias="sellValueCr")
    net_value_cr: float = Field(alias="netValueCr")
    buy_share_percent: float = Field(alias="buySharePercent")
    net_flow_percent: float = Field(alias="netFlowPercent")
    change_percent: float | None = Field(
        None,
        alias="changePercent",
        description="Day-over-day % change in net flow vs previous session",
    )
    trend: FlowTrend

    model_config = {"populate_by_name": True}


class FiiDiiSnapshot(BaseModel):
    fetched_at: datetime = Field(alias="fetchedAt")
    trade_date: date = Field(alias="tradeDate")
    fii: FiiDiiFlow
    dii: FiiDiiFlow

    model_config = {"populate_by_name": True}
