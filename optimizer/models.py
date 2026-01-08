from pydantic import BaseModel, Field
from typing import List, Literal
from decimal import Decimal

ProductType = Literal["medicine", "furniture", "electronics", "perishable", "other"]

class Location(BaseModel):
    lat: float
    lng: float

class TimeWindow(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)

class Pricing(BaseModel):
    base_price: Decimal
    rate_per_km: Decimal

class Transporter(BaseModel):
    id: str
    name: str
    location: Location
    radius_km: float = Field(gt=0, le=300)
    supported_products: List[ProductType]
    capacity_kg: float
    avg_speed_kmph: float = Field(gt=10, le=90)
    availability: TimeWindow
    pricing: Pricing

class Shipment(BaseModel):
    id: str
    weight_kg: float

class ShipmentRequest(BaseModel):
    origin: Location
    destination: Location
    product_type: ProductType
    urgency_multiplier: Decimal = Field(ge=1, le=3)
    shipments: List[Shipment]
    # transporters are now fetched from Supabase automatically

class RouteLeg(BaseModel):
    transporter_id: str
    from_location: Location
    to_location: Location
    distance_km: float
    eta_hours: float
    cost: Decimal
    handoff_signature: str

class OptimizedRoute(BaseModel):
    total_cost: Decimal
    total_eta_hours: float
    legs: List[RouteLeg]
