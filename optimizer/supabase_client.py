"""
Supabase client for fetching transporter details from the database.
"""
import os
from typing import List, Optional
from decimal import Decimal
from supabase import create_client, Client
from geopy.distance import geodesic

from models import Transporter, Location, Pricing, TimeWindow

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_transporters(
    origin: Location,
    destination: Location,
    product_type: str,
    weight_kg: float
) -> List[Transporter]:
    """
    Fetch available transporters from Supabase that can potentially serve the route.
    
    Args:
        origin: Origin location
        destination: Destination location
        product_type: Type of product to transport
        weight_kg: Total weight of shipments
        
    Returns:
        List of Transporter objects ready for routing optimization
    """
    client = get_supabase_client()
    
    # Fetch available vehicles with sufficient capacity
    # Convert weight_kg to int to match database column type
    vehicles_response = client.table("vehicles").select(
        "id, transporter_id, plate_number, vehicle_type, max_capacity_kg, "
        "current_load_kg, base_rate_per_km, fuel_efficiency_km_l, "
        "current_location_lat, current_location_lng, home_base_location, "
        "is_available, capabilities"
    ).eq("is_available", True).gte("max_capacity_kg", int(weight_kg)).execute()
    
    vehicles = vehicles_response.data if vehicles_response.data else []
    
    if not vehicles:
        return []
    
    # Get transporter IDs for fetching pricing rules and availability
    transporter_ids = list(set(v["transporter_id"] for v in vehicles))
    
    # Fetch pricing rules for these transporters
    pricing_response = client.table("transporter_pricing_rules").select(
        "transporter_id, vehicle_type, base_price, rate_per_km, is_active"
    ).in_("transporter_id", transporter_ids).eq("is_active", True).execute()
    
    pricing_rules = pricing_response.data if pricing_response.data else []
    
    # Create pricing lookup by (transporter_id, vehicle_type)
    pricing_lookup = {}
    for pr in pricing_rules:
        key = (pr["transporter_id"], pr["vehicle_type"])
        pricing_lookup[key] = pr
    
    # Fetch availability for these transporters
    availability_response = client.table("transporter_availability").select(
        "transporter_id, availability_radius_km, available_from, available_until, is_active"
    ).in_("transporter_id", transporter_ids).eq("is_active", True).execute()
    
    availability_data = availability_response.data if availability_response.data else []
    
    # Create availability lookup by transporter_id
    availability_lookup = {a["transporter_id"]: a for a in availability_data}
    
    # Fetch transporter profiles for names
    profiles_response = client.table("profiles").select(
        "id, business_name"
    ).in_("id", transporter_ids).execute()
    
    profiles = profiles_response.data if profiles_response.data else []
    profiles_lookup = {p["id"]: p for p in profiles}
    
    # Build Transporter objects
    transporters = []
    
    for vehicle in vehicles:
        transporter_id = vehicle["transporter_id"]
        vehicle_type = vehicle["vehicle_type"]
        
        # Get pricing for this vehicle
        pricing_key = (transporter_id, vehicle_type)
        pricing_data = pricing_lookup.get(pricing_key)
        
        if not pricing_data:
            # Skip if no pricing rules available
            continue
        
        # Get availability
        availability = availability_lookup.get(transporter_id)
        if not availability:
            # Skip if no availability data
            continue
        
        # Get profile for name
        profile = profiles_lookup.get(transporter_id, {})
        
        # Get current location (use home base if current not available)
        current_lat = vehicle.get("current_location_lat")
        current_lng = vehicle.get("current_location_lng")
        
        if current_lat is None or current_lng is None:
            # Skip vehicles without location
            continue
        
        # Check if vehicle capabilities match product type
        capabilities = vehicle.get("capabilities") or []
        # If capabilities list is empty, assume vehicle supports all products
        # Otherwise check if product_type is in capabilities
        if capabilities and product_type not in capabilities:
            continue
        
        # Calculate available capacity
        max_capacity = vehicle.get("max_capacity_kg", 0)
        current_load = vehicle.get("current_load_kg", 0)
        available_capacity = max_capacity - current_load
        
        if available_capacity < weight_kg:
            continue
        
        # Build the transporter object
        location = Location(lat=current_lat, lng=current_lng)
        
        # Check if transporter can reach origin
        distance_to_origin = geodesic(
            (current_lat, current_lng),
            (origin.lat, origin.lng)
        ).km
        
        radius_km = availability.get("availability_radius_km", 50)
        
        if distance_to_origin > radius_km:
            # Skip if origin is outside transporter's radius
            continue
        
        # Create pricing object
        pricing = Pricing(
            base_price=Decimal(str(pricing_data["base_price"])),
            rate_per_km=Decimal(str(pricing_data["rate_per_km"]))
        )
        
        # Create time window (default hours for now)
        # Could be enhanced to parse available_from/available_until
        time_window = TimeWindow(start_hour=8, end_hour=20)
        
        # Determine supported products based on capabilities
        supported_products = capabilities if capabilities else ["medicine", "furniture", "electronics", "perishable", "other"]
        
        # Estimate average speed based on vehicle type
        speed_map = {
            "truck": 50.0,
            "van": 60.0,
            "bike": 40.0,
            "tempo": 45.0,
        }
        avg_speed = speed_map.get(vehicle_type, 50.0)
        
        transporter = Transporter(
            id=vehicle["id"],
            name=profile.get("business_name", f"Transporter-{vehicle['plate_number']}"),
            location=location,
            radius_km=float(radius_km),
            supported_products=supported_products,
            capacity_kg=float(available_capacity),
            avg_speed_kmph=avg_speed,
            availability=time_window,
            pricing=pricing
        )
        
        transporters.append(transporter)
    
    return transporters
