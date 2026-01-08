import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FastAPI optimizer service URL
const OPTIMIZER_URL = process.env.OPTIMIZER_URL || 'http://localhost:8000';

// Optimize routes using Google OR-Tools VRP
router.post('/vrp', verifyToken, async (req, res) => {
    try {
        const {
            depot,
            locations,
            demands,
            vehicle_capacities,
            distance_matrix,
            time_matrix,
            num_vehicles
        } = req.body;

        if (!locations || !locations.length) {
            return res.status(400).json({ error: 'Locations are required' });
        }

        // If distance matrix not provided, create a simple one
        const matrix = distance_matrix || createSimpleDistanceMatrix(locations);

        // Prepare input for Python VRP solver
        const vrpInput = {
            distance_matrix: matrix,
            demands: demands || locations.map(() => 1),
            vehicle_capacities: vehicle_capacities || [locations.length],
            num_vehicles: num_vehicles || 1,
            depot: depot || 0
        };

        // Try to call Python VRP solver
        try {
            const result = await runVRPSolver(vrpInput);
            res.json(result);
        } catch (pythonError) {
            // Fallback to simple greedy solver if Python not available
            console.warn('Python VRP solver not available, using fallback:', pythonError.message);
            const fallbackResult = solveVRPGreedy(vrpInput);
            res.json(fallbackResult);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Optimize delivery order for a single vehicle
router.post('/optimize-order', verifyToken, async (req, res) => {
    try {
        const { origin, destinations, return_to_origin = false } = req.body;

        if (!origin || !destinations?.length) {
            return res.status(400).json({ error: 'Origin and destinations are required' });
        }

        // Create locations array with origin first
        const allLocations = [origin, ...destinations];
        const n = allLocations.length;

        // Create simple distance matrix based on coordinates
        const matrix = [];
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    matrix[i][j] = calculateDistance(
                        allLocations[i].lat, allLocations[i].lng,
                        allLocations[j].lat, allLocations[j].lng
                    );
                }
            }
        }

        // Simple nearest neighbor algorithm
        const visited = new Set([0]); // Start from depot
        const route = [0];
        let current = 0;
        let totalDistance = 0;

        while (visited.size < n) {
            let nearestDist = Infinity;
            let nearest = -1;

            for (let j = 0; j < n; j++) {
                if (!visited.has(j) && matrix[current][j] < nearestDist) {
                    nearestDist = matrix[current][j];
                    nearest = j;
                }
            }

            if (nearest !== -1) {
                route.push(nearest);
                visited.add(nearest);
                totalDistance += nearestDist;
                current = nearest;
            }
        }

        if (return_to_origin) {
            totalDistance += matrix[current][0];
            route.push(0);
        }

        // Map route indices back to locations
        const optimizedRoute = route.map(idx => ({
            ...allLocations[idx],
            order: route.indexOf(idx)
        }));

        res.json({
            optimized_route: optimizedRoute,
            total_distance_km: Math.round(totalDistance * 10) / 10,
            estimated_time_hours: Math.round(totalDistance / 50 * 10) / 10, // Assuming 50 km/h average
            savings_percentage: calculateSavings(destinations, optimizedRoute.slice(1))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Match compatible routes for load sharing
router.post('/match-routes', verifyToken, async (req, res) => {
    try {
        const { shipments, available_routes } = req.body;

        if (!shipments?.length || !available_routes?.length) {
            return res.status(400).json({ error: 'Shipments and available routes are required' });
        }

        const matches = [];

        for (const shipment of shipments) {
            const compatibleRoutes = available_routes
                .map(route => {
                    const originDeviation = calculateDistance(
                        shipment.origin.lat, shipment.origin.lng,
                        route.origin.lat, route.origin.lng
                    );
                    const destDeviation = calculateDistance(
                        shipment.destination.lat, shipment.destination.lng,
                        route.destination.lat, route.destination.lng
                    );

                    // Check if route has capacity
                    const hasCapacity = route.available_capacity >= shipment.weight;

                    // Calculate compatibility score
                    const maxDeviation = 50; // km
                    const deviationScore = Math.max(0, 100 - ((originDeviation + destDeviation) / maxDeviation) * 100);

                    return {
                        route,
                        shipment_id: shipment.id,
                        origin_deviation_km: Math.round(originDeviation * 10) / 10,
                        destination_deviation_km: Math.round(destDeviation * 10) / 10,
                        has_capacity: hasCapacity,
                        compatibility_score: hasCapacity ? Math.round(deviationScore) : 0,
                        is_compatible: hasCapacity && deviationScore > 30
                    };
                })
                .filter(m => m.is_compatible)
                .sort((a, b) => b.compatibility_score - a.compatibility_score);

            if (compatibleRoutes.length > 0) {
                matches.push({
                    shipment,
                    best_match: compatibleRoutes[0],
                    alternatives: compatibleRoutes.slice(1, 3)
                });
            }
        }

        res.json({
            matches,
            unmatched_shipments: shipments.filter(s =>
                !matches.find(m => m.shipment.id === s.id)
            )
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Optimize shipment routes using FastAPI optimizer service
// Transporters are automatically fetched from Supabase by the optimizer
router.post('/shipment', verifyToken, async (req, res) => {
    try {
        const {
            origin,
            destination,
            product_type,
            urgency_multiplier,
            shipments
        } = req.body;

        // Validate required fields
        if (!origin || !origin.lat || !origin.lng) {
            return res.status(400).json({ error: 'Origin with lat and lng is required' });
        }

        if (!destination || !destination.lat || !destination.lng) {
            return res.status(400).json({ error: 'Destination with lat and lng is required' });
        }

        if (!product_type) {
            return res.status(400).json({ error: 'Product type is required' });
        }

        if (!shipments || !shipments.length) {
            return res.status(400).json({ error: 'At least one shipment is required' });
        }

        // Validate product type
        const validProductTypes = ['medicine', 'furniture', 'electronics', 'perishable', 'other'];
        if (!validProductTypes.includes(product_type)) {
            return res.status(400).json({
                error: `Invalid product_type. Must be one of: ${validProductTypes.join(', ')}`
            });
        }

        // Validate urgency multiplier
        const urgency = urgency_multiplier || 1.0;
        if (urgency < 1 || urgency > 3) {
            return res.status(400).json({ error: 'Urgency multiplier must be between 1 and 3' });
        }

        // Prepare request for FastAPI optimizer
        const optimizerRequest = {
            origin: {
                lat: parseFloat(origin.lat),
                lng: parseFloat(origin.lng)
            },
            destination: {
                lat: parseFloat(destination.lat),
                lng: parseFloat(destination.lng)
            },
            product_type,
            urgency_multiplier: urgency,
            shipments: shipments.map(s => ({
                id: s.id,
                weight_kg: parseFloat(s.weight_kg || s.weight || 0)
            }))
        };

        // Call FastAPI optimizer service
        const optimizerUrl = `${OPTIMIZER_URL}/optimize`;

        try {
            const response = await fetch(optimizerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(optimizerRequest)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return res.status(response.status).json({
                    error: errorData.detail || 'Optimizer service returned an error',
                    optimizer_status: response.status
                });
            }

            const optimizedRoutes = await response.json();

            res.json({
                success: true,
                request: optimizerRequest,
                optimized_routes: optimizedRoutes,
                route_count: optimizedRoutes.length
            });
        } catch (fetchError) {
            // Fallback if optimizer service is not available
            console.error('FastAPI optimizer service not available:', fetchError.message);

            return res.status(503).json({
                error: 'Optimizer service is not available',
                message: 'Please ensure the FastAPI optimizer is running on ' + OPTIMIZER_URL,
                fallback_available: false
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Run Python VRP solver
function runVRPSolver(input) {
    return new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, '..', '..', 'optimization', 'vrp_solver.py');

        const python = spawn(pythonPath, [scriptPath]);

        let stdout = '';
        let stderr = '';

        python.stdin.write(JSON.stringify(input));
        python.stdin.end();

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || 'VRP solver failed'));
            } else {
                try {
                    resolve(JSON.parse(stdout));
                } catch (e) {
                    reject(new Error('Failed to parse VRP solver output'));
                }
            }
        });

        python.on('error', (err) => {
            reject(err);
        });
    });
}

// Fallback greedy VRP solver
function solveVRPGreedy(input) {
    const { distance_matrix, demands, vehicle_capacities, num_vehicles, depot } = input;
    const n = distance_matrix.length;
    const routes = [];
    const visited = new Set([depot]);

    for (let v = 0; v < num_vehicles; v++) {
        const capacity = vehicle_capacities[v] || vehicle_capacities[0];
        let currentLoad = 0;
        let currentNode = depot;
        const route = [depot];

        while (true) {
            let bestNext = -1;
            let bestDist = Infinity;

            for (let j = 0; j < n; j++) {
                if (!visited.has(j) &&
                    currentLoad + (demands[j] || 1) <= capacity &&
                    distance_matrix[currentNode][j] < bestDist) {
                    bestDist = distance_matrix[currentNode][j];
                    bestNext = j;
                }
            }

            if (bestNext === -1) break;

            route.push(bestNext);
            visited.add(bestNext);
            currentLoad += demands[bestNext] || 1;
            currentNode = bestNext;
        }

        route.push(depot);
        routes.push({
            vehicle: v,
            route,
            load: currentLoad,
            distance: calculateRouteDistance(route, distance_matrix)
        });
    }

    const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);

    return {
        routes,
        total_distance: Math.round(totalDistance * 10) / 10,
        solver: 'greedy_fallback',
        unvisited: Array.from({ length: n }, (_, i) => i).filter(i => !visited.has(i) && i !== depot)
    };
}

function calculateRouteDistance(route, matrix) {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        distance += matrix[route[i]][route[i + 1]];
    }
    return distance;
}

function createSimpleDistanceMatrix(locations) {
    const n = locations.length;
    const matrix = [];

    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else {
                matrix[i][j] = calculateDistance(
                    locations[i].lat, locations[i].lng,
                    locations[j].lat, locations[j].lng
                );
            }
        }
    }

    return matrix;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateSavings(original, optimized) {
    if (original.length <= 1) return 0;

    let originalDist = 0;
    let optimizedDist = 0;

    for (let i = 0; i < original.length - 1; i++) {
        originalDist += calculateDistance(
            original[i].lat, original[i].lng,
            original[i + 1].lat, original[i + 1].lng
        );
    }

    for (let i = 0; i < optimized.length - 1; i++) {
        if (optimized[i] && optimized[i + 1]) {
            optimizedDist += calculateDistance(
                optimized[i].lat, optimized[i].lng,
                optimized[i + 1].lat, optimized[i + 1].lng
            );
        }
    }

    if (originalDist === 0) return 0;
    return Math.round((1 - optimizedDist / originalDist) * 100);
}

// ============================================================
// Multi-Transporter Chain Optimization (calls Python FastAPI)
// ============================================================

/**
 * Chain optimization endpoint - proxies to Python optimizer
 * This finds the best multi-transporter route for a shipment
 * 
 * POST /api/optimize/chain
 * Body: {
 *   origin: { lat, lng },
 *   destination: { lat, lng },
 *   product_type: 'medicine' | 'furniture' | 'electronics' | 'perishable' | 'other',
 *   urgency_multiplier: 1-3 (default 1),
 *   shipments: [{ id, weight_kg }]
 * }
 */
router.post('/chain', verifyToken, async (req, res) => {
    try {
        const {
            origin,
            destination,
            product_type,
            urgency_multiplier = 1,
            shipments
        } = req.body;

        // Validation
        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required' });
        }
        if (!shipments || !shipments.length) {
            return res.status(400).json({ error: 'At least one shipment is required' });
        }

        // Call Python optimizer service
        try {
            const response = await fetch(`${OPTIMIZER_URL}/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin,
                    destination,
                    product_type: product_type || 'other',
                    urgency_multiplier,
                    shipments
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(response.status).json(error);
            }

            const optimizedRoutes = await response.json();
            res.json({
                success: true,
                optimizer: 'fastapi',
                routes: optimizedRoutes
            });
        } catch (fetchError) {
            console.error('Optimizer service not available:', fetchError.message);
            
            // Fallback: Return mock chain result for testing
            res.json({
                success: true,
                optimizer: 'fallback',
                message: 'Python optimizer not available, using mock response',
                routes: [{
                    total_cost: 0,
                    total_eta_hours: 0,
                    legs: [{
                        transporter_id: 'mock-transporter',
                        from_location: origin,
                        to_location: destination,
                        distance_km: calculateDistance(
                            origin.lat, origin.lng,
                            destination.lat, destination.lng
                        ),
                        eta_hours: 0,
                        cost: 0,
                        handoff_signature: 'mock-signature'
                    }]
                }]
            });
        }
    } catch (error) {
        console.error('Chain optimization error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check for optimizer service
 */
router.get('/health', async (req, res) => {
    try {
        const response = await fetch(`${OPTIMIZER_URL}/docs`, { method: 'GET' });
        res.json({
            server: 'healthy',
            optimizer: response.ok ? 'healthy' : 'unavailable',
            optimizer_url: OPTIMIZER_URL
        });
    } catch (error) {
        res.json({
            server: 'healthy',
            optimizer: 'unavailable',
            optimizer_url: OPTIMIZER_URL,
            error: error.message
        });
    }
});

export default router;

