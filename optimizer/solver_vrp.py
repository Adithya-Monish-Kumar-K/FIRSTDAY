from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from geopy.distance import geodesic

def solve_vrp(transporters, shipments):
    manager = pywrapcp.RoutingIndexManager(
        len(transporters), len(transporters), 0
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance(i, j):
        a = transporters[manager.IndexToNode(i)]
        b = transporters[manager.IndexToNode(j)]
        return int(geodesic(
            (a.location.lat, a.location.lng),
            (b.location.lat, b.location.lng)
        ).km * 1000)

    transit_cb = routing.RegisterTransitCallback(distance)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

    def demand(i):
        return int(sum(s.weight_kg for s in shipments))

    demand_cb = routing.RegisterUnaryTransitCallback(demand)
    routing.AddDimensionWithVehicleCapacity(
        demand_cb,
        0,
        [int(t.capacity_kg) for t in transporters],
        True,
        "Capacity"
    )

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC

    solution = routing.SolveWithParameters(params)
    if not solution:
        return None

    return solution
