"""
Vehicle Routing Problem (VRP) Solver using Google OR-Tools

This module provides route optimization for logistics operations.
It uses the Google OR-Tools library to solve the Vehicle Routing Problem.

Usage:
    python vrp_solver.py < input.json > output.json

Input JSON format:
{
    "distance_matrix": [[0, 10, 15, ...], ...],
    "demands": [0, 1, 2, ...],
    "vehicle_capacities": [15, 15, ...],
    "num_vehicles": 2,
    "depot": 0
}
"""

import json
import sys

try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False


def create_data_model(input_data):
    """Create the data model for the VRP."""
    data = {}
    data['distance_matrix'] = input_data.get('distance_matrix', [])
    data['demands'] = input_data.get('demands', [0] * len(data['distance_matrix']))
    data['vehicle_capacities'] = input_data.get('vehicle_capacities', [100])
    data['num_vehicles'] = input_data.get('num_vehicles', 1)
    data['depot'] = input_data.get('depot', 0)
    return data


def solve_vrp_ortools(data):
    """Solve the VRP using Google OR-Tools."""
    # Create the routing index manager
    manager = pywrapcp.RoutingIndexManager(
        len(data['distance_matrix']),
        data['num_vehicles'],
        data['depot']
    )

    # Create Routing Model
    routing = pywrapcp.RoutingModel(manager)

    # Create and register a transit callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(data['distance_matrix'][from_node][to_node] * 1000)  # Convert to meters

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Capacity constraint
    if data['demands'] and any(d > 0 for d in data['demands']):
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return data['demands'][from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            data['vehicle_capacities'],
            True,  # start cumul to zero
            'Capacity'
        )

    # Add Distance constraint
    routing.AddDimension(
        transit_callback_index,
        0,  # no slack
        3000000,  # maximum distance per vehicle (3000 km in meters)
        True,  # start cumul to zero
        'Distance'
    )

    # Setting first solution heuristic
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(30)

    # Solve the problem
    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        return extract_solution(data, manager, routing, solution)
    else:
        return None


def extract_solution(data, manager, routing, solution):
    """Extract the solution from OR-Tools."""
    routes = []
    total_distance = 0
    total_load = 0

    for vehicle_id in range(data['num_vehicles']):
        route = []
        route_distance = 0
        route_load = 0
        index = routing.Start(vehicle_id)
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route.append(node_index)
            route_load += data['demands'][node_index]
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(
                previous_index, index, vehicle_id
            )
        
        # Add depot at the end
        route.append(manager.IndexToNode(index))
        
        routes.append({
            'vehicle': vehicle_id,
            'route': route,
            'distance': route_distance / 1000,  # Convert back to km
            'load': route_load
        })
        
        total_distance += route_distance
        total_load += route_load

    return {
        'routes': routes,
        'total_distance': total_distance / 1000,  # km
        'total_load': total_load,
        'solver': 'ortools',
        'status': 'optimal'
    }


def solve_vrp_greedy(data):
    """Fallback greedy solver when OR-Tools is not available."""
    n = len(data['distance_matrix'])
    routes = []
    visited = set([data['depot']])

    for v in range(data['num_vehicles']):
        capacity = data['vehicle_capacities'][v] if v < len(data['vehicle_capacities']) else data['vehicle_capacities'][0]
        current_load = 0
        current_node = data['depot']
        route = [data['depot']]

        while True:
            best_next = -1
            best_dist = float('inf')

            for j in range(n):
                if j not in visited:
                    demand = data['demands'][j] if j < len(data['demands']) else 1
                    if current_load + demand <= capacity:
                        dist = data['distance_matrix'][current_node][j]
                        if dist < best_dist:
                            best_dist = dist
                            best_next = j

            if best_next == -1:
                break

            route.append(best_next)
            visited.add(best_next)
            current_load += data['demands'][best_next] if best_next < len(data['demands']) else 1
            current_node = best_next

        route.append(data['depot'])
        
        # Calculate route distance
        route_distance = 0
        for i in range(len(route) - 1):
            route_distance += data['distance_matrix'][route[i]][route[i + 1]]

        routes.append({
            'vehicle': v,
            'route': route,
            'distance': route_distance,
            'load': current_load
        })

    total_distance = sum(r['distance'] for r in routes)
    unvisited = [i for i in range(n) if i not in visited and i != data['depot']]

    return {
        'routes': routes,
        'total_distance': total_distance,
        'solver': 'greedy',
        'status': 'heuristic',
        'unvisited': unvisited
    }


def main():
    """Main function to read input, solve VRP, and output result."""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        
        # Create data model
        data = create_data_model(input_data)
        
        # Validate input
        if not data['distance_matrix'] or len(data['distance_matrix']) == 0:
            result = {'error': 'Distance matrix is required'}
        elif ORTOOLS_AVAILABLE:
            result = solve_vrp_ortools(data)
            if result is None:
                result = solve_vrp_greedy(data)
                result['note'] = 'OR-Tools could not find optimal solution, using greedy fallback'
        else:
            result = solve_vrp_greedy(data)
            result['note'] = 'OR-Tools not available, using greedy solver'
        
        # Output result
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
