from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from models import ShipmentRequest, OptimizedRoute, RouteLeg
from chaining import build_chains
from solver_vrp import solve_vrp
from security import sign_handoff
from supabase_client import fetch_transporters
from geopy.distance import geodesic
from decimal import Decimal

app = FastAPI(title="ChainFreight Optimizer")

@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "supabase_configured": bool(os.environ.get("SUPABASE_URL"))
    }

@app.post("/optimize", response_model=list[OptimizedRoute])
def optimize(req: ShipmentRequest):
    # Fetch transporters from Supabase based on request parameters
    total_weight = sum(s.weight_kg for s in req.shipments)
    transporters = fetch_transporters(
        origin=req.origin,
        destination=req.destination,
        product_type=req.product_type,
        weight_kg=total_weight
    )
    
    if not transporters:
        raise HTTPException(422, "No available transporters found in the database")
    
    chains = build_chains(req.origin, req.destination, transporters)
    if not chains:
        raise HTTPException(422, "No feasible transporter chains")

    results = []

    for chain in chains:
        try:
            vrp = solve_vrp(chain, req.shipments)
            if not vrp:
                continue
        except Exception:
            continue  # Fault-tolerant retry fallback

        legs = []
        total_cost = Decimal(0)
        total_eta = 0.0

        for i, t in enumerate(chain):
            start = req.origin if i == 0 else chain[i-1].location
            end = req.destination if i == len(chain)-1 else t.location

            dist = geodesic(
                (start.lat, start.lng),
                (end.lat, end.lng)
            ).km

            eta = dist / t.avg_speed_kmph
            cost = (t.pricing.base_price +
                    Decimal(dist) * t.pricing.rate_per_km) * req.urgency_multiplier

            payload = {
                "transporter": t.id,
                "from": start.dict(),
                "to": end.dict()
            }

            legs.append(RouteLeg(
                transporter_id=t.id,
                from_location=start,
                to_location=end,
                distance_km=dist,
                eta_hours=eta,
                cost=cost,
                handoff_signature=sign_handoff(payload)
            ))

            total_cost += cost
            total_eta += eta

        results.append(
            OptimizedRoute(
                total_cost=total_cost,
                total_eta_hours=total_eta,
                legs=legs
            )
        )

    if not results:
        raise HTTPException(422, "All solver paths infeasible")

    return sorted(results, key=lambda r: (r.total_cost, r.total_eta_hours))
