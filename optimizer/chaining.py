from geopy.distance import geodesic
from models import Transporter, Location

MAX_CHAIN_DEPTH = 3

def reachable(a: Transporter, b: Transporter) -> bool:
    return geodesic(
        (a.location.lat, a.location.lng),
        (b.location.lat, b.location.lng)
    ).km <= a.radius_km

def build_chains(origin: Location, destination: Location, transporters):
    chains = []

    for t1 in transporters:
        if geodesic((t1.location.lat, t1.location.lng),
                    (origin.lat, origin.lng)).km > t1.radius_km:
            continue

        if geodesic((t1.location.lat, t1.location.lng),
                    (destination.lat, destination.lng)).km <= t1.radius_km:
            chains.append([t1])
            continue

        for t2 in transporters:
            if t1.id == t2.id:
                continue
            if reachable(t1, t2):
                if geodesic((t2.location.lat, t2.location.lng),
                            (destination.lat, destination.lng)).km <= t2.radius_km:
                    chains.append([t1, t2])

    return chains
