from geopy.distance import geodesic
from decimal import Decimal
from typing import List
from models import Transporter, Location, OptimizedRoute, RouteLeg

MAX_CHAIN_LENGTH = 3

def within_radius(transporter: Transporter, point: Location) -> bool:
    distance = geodesic(
        (transporter.location.lat, transporter.location.lng),
        (point.lat, point.lng)
    ).km
    return distance <= transporter.radius_km

def compute_leg_cost(transporter: Transporter, distance_km: float, urgency: Decimal) -> Decimal:
    return (
        transporter.pricing.base_price +
        Decimal(distance_km) * transporter.pricing.rate_per_km
    ) * urgency

def find_direct_routes(
    origin: Location,
    destination: Location,
    transporters: List[Transporter],
    product_type: str,
    urgency: Decimal
) -> List[OptimizedRoute]:

    routes = []

    for t in transporters:
        if product_type not in t.supported_products:
            continue

        if not within_radius(t, origin):
            continue

        if not within_radius(t, destination):
            continue

        distance = geodesic(
            (origin.lat, origin.lng),
            (destination.lat, destination.lng)
        ).km

        cost = compute_leg_cost(t, distance, urgency)

        routes.append(
            OptimizedRoute(
                total_cost=cost,
                total_distance_km=distance,
                legs=[
                    RouteLeg(
                        transporter_id=t.id,
                        transporter_name=t.name,
                        from_location=origin,
                        to_location=destination,
                        distance_km=distance,
                        cost=cost
                    )
                ]
            )
        )

    return routes
