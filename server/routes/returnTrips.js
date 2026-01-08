import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Mock return trips for development
let mockReturnTrips = [
    {
        id: '1',
        transporter_id: '1',
        vehicle_id: '1',
        origin: { lat: 12.9716, lng: 77.5946, address: 'Bangalore, Karnataka' },
        destination: { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu' },
        departure_date: new Date(Date.now() + 86400000).toISOString(),
        available_capacity_tons: 8,
        available_volume: 40,
        vehicle_type: 'covered',
        price_per_ton_km: 8,
        notes: 'Returning empty after delivery',
        status: 'available',
        created_at: new Date().toISOString()
    }
];

// Get all available return trips
router.get('/available', verifyToken, async (req, res) => {
    try {
        const {
            origin_lat, origin_lng,
            dest_lat, dest_lng,
            radius_km = 50,
            vehicle_type,
            min_capacity,
            departure_from,
            departure_to
        } = req.query;

        if (supabase) {
            let query = supabase
                .from('return_trips')
                .select(`
          *,
          transporter:users!transporter_id(id, name, phone, rating),
          vehicle:vehicles(id, vehicle_number, type, capacity_tons)
        `)
                .eq('status', 'available')
                .gte('departure_date', new Date().toISOString());

            if (vehicle_type) query = query.eq('vehicle_type', vehicle_type);
            if (min_capacity) query = query.gte('available_capacity_tons', parseFloat(min_capacity));
            if (departure_from) query = query.gte('departure_date', departure_from);
            if (departure_to) query = query.lte('departure_date', departure_to);

            const { data: trips, error } = await query.order('departure_date', { ascending: true });

            if (error) throw error;

            // If origin/destination provided, filter by proximity
            let filteredTrips = trips;
            if (origin_lat && origin_lng) {
                filteredTrips = filteredTrips.filter(trip => {
                    const distance = calculateDistance(
                        parseFloat(origin_lat), parseFloat(origin_lng),
                        trip.origin.lat, trip.origin.lng
                    );
                    return distance <= parseFloat(radius_km);
                });
            }

            res.json(filteredTrips);
        } else {
            let trips = mockReturnTrips.filter(t =>
                t.status === 'available' &&
                new Date(t.departure_date) >= new Date()
            );

            if (vehicle_type) trips = trips.filter(t => t.vehicle_type === vehicle_type);
            if (min_capacity) trips = trips.filter(t => t.available_capacity_tons >= parseFloat(min_capacity));

            res.json(trips);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create return trip availability (transporter only)
router.post('/', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const {
            vehicle_id,
            origin,
            destination,
            departure_date,
            available_capacity_tons,
            available_volume,
            price_per_ton_km,
            notes
        } = req.body;

        if (!vehicle_id || !origin || !destination || !departure_date) {
            return res.status(400).json({
                error: 'Vehicle ID, origin, destination, and departure date are required'
            });
        }

        // Get vehicle details
        let vehicleType = 'covered';
        if (supabase) {
            const { data: vehicle } = await supabase
                .from('vehicles')
                .select('type, capacity_tons')
                .eq('id', vehicle_id)
                .single();

            if (vehicle) vehicleType = vehicle.type;
        }

        const tripData = {
            id: crypto.randomUUID(),
            transporter_id: req.user.id,
            vehicle_id,
            origin,
            destination,
            departure_date,
            available_capacity_tons: parseFloat(available_capacity_tons) || 0,
            available_volume: parseFloat(available_volume) || 0,
            vehicle_type: vehicleType,
            price_per_ton_km: parseFloat(price_per_ton_km) || 8,
            notes: notes || '',
            status: 'available',
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: trip, error } = await supabase
                .from('return_trips')
                .insert([tripData])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(trip);
        } else {
            mockReturnTrips.push(tripData);
            res.status(201).json(tripData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transporter's return trips
router.get('/my-trips', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        if (supabase) {
            const { data: trips, error } = await supabase
                .from('return_trips')
                .select(`
          *,
          vehicle:vehicles(id, vehicle_number, type)
        `)
                .eq('transporter_id', req.user.id)
                .order('departure_date', { ascending: true });

            if (error) throw error;
            res.json(trips);
        } else {
            const trips = mockReturnTrips.filter(t => t.transporter_id === req.user.id);
            res.json(trips);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Match shipment with return trips
router.post('/match', verifyToken, async (req, res) => {
    try {
        const {
            origin,
            destination,
            weight,
            pickup_date,
            vehicle_type_required,
            max_deviation_km = 30
        } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required' });
        }

        if (supabase) {
            const { data: trips, error } = await supabase
                .from('return_trips')
                .select(`
          *,
          transporter:users!transporter_id(id, name, phone, rating),
          vehicle:vehicles(id, vehicle_number, type, capacity_tons)
        `)
                .eq('status', 'available')
                .gte('available_capacity_tons', weight || 0);

            if (error) throw error;

            // Score each trip based on route compatibility
            const scoredTrips = trips.map(trip => {
                const originDeviation = calculateDistance(
                    origin.lat, origin.lng,
                    trip.origin.lat, trip.origin.lng
                );
                const destDeviation = calculateDistance(
                    destination.lat, destination.lng,
                    trip.destination.lat, trip.destination.lng
                );

                // Check if shipment is along the trip's route
                const isOnRoute = originDeviation <= max_deviation_km && destDeviation <= max_deviation_km;

                const score = isOnRoute ? 100 - (originDeviation + destDeviation) : 0;

                return {
                    ...trip,
                    match_score: Math.max(0, score),
                    origin_deviation_km: Math.round(originDeviation * 10) / 10,
                    destination_deviation_km: Math.round(destDeviation * 10) / 10,
                    is_compatible: isOnRoute
                };
            }).filter(t => t.is_compatible)
                .sort((a, b) => b.match_score - a.match_score);

            res.json(scoredTrips);
        } else {
            // Mock matching
            const scoredTrips = mockReturnTrips
                .filter(t => t.status === 'available')
                .map(trip => ({
                    ...trip,
                    match_score: 85,
                    origin_deviation_km: 15,
                    destination_deviation_km: 20,
                    is_compatible: true
                }));

            res.json(scoredTrips);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update return trip
router.put('/:id', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            updated_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: trip, error } = await supabase
                .from('return_trips')
                .update(updateData)
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(trip);
        } else {
            const index = mockReturnTrips.findIndex(t => t.id === id && t.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Return trip not found' });
            }
            mockReturnTrips[index] = { ...mockReturnTrips[index], ...updateData };
            res.json(mockReturnTrips[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete return trip
router.delete('/:id', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { error } = await supabase
                .from('return_trips')
                .delete()
                .eq('id', id)
                .eq('transporter_id', req.user.id);

            if (error) throw error;
            res.json({ message: 'Return trip deleted successfully' });
        } else {
            const index = mockReturnTrips.findIndex(t => t.id === id && t.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Return trip not found' });
            }
            mockReturnTrips.splice(index, 1);
            res.json({ message: 'Return trip deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

export default router;
