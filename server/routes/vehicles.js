import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Vehicle type enum matching database schema
const VEHICLE_TYPES = ['lorry', 'truck', 'trailer', 'mini_truck', 'tempo'];

// Mock vehicles for development
let mockVehicles = [
    {
        id: '1',
        transporter_id: '1',
        plate_number: 'TN01AB1234',
        vehicle_type: 'lorry',
        max_capacity_kg: 10000,
        current_load_kg: 0,
        base_rate_per_km: 15.0,
        fuel_efficiency_km_l: 8.0,
        current_location_lat: 13.0827,
        current_location_lng: 80.2707,
        home_base_location: 'Chennai, Tamil Nadu',
        is_available: true,
        capabilities: ['covered', 'gps'],
        created_at: new Date().toISOString()
    }
];

// Get all vehicles for transporter
router.get('/', verifyToken, async (req, res) => {
    try {
        const transporterId = req.query.transporter_id || req.user.id;

        if (supabase) {
            const { data: vehicles, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('transporter_id', transporterId);

            if (error) throw error;
            res.json(vehicles);
        } else {
            const vehicles = mockVehicles.filter(v => v.transporter_id === transporterId);
            res.json(vehicles);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available vehicles matching criteria
router.get('/available', verifyToken, async (req, res) => {
    try {
        const { vehicle_type, min_capacity, max_capacity, capabilities } = req.query;

        if (supabase) {
            let query = supabase
                .from('vehicles')
                .select(`
                    *,
                    transporter:profiles!transporter_id(id, business_name, phone, verified)
                `)
                .eq('is_available', true);

            if (vehicle_type) query = query.eq('vehicle_type', vehicle_type);
            if (min_capacity) query = query.gte('max_capacity_kg', parseInt(min_capacity));
            if (max_capacity) query = query.lte('max_capacity_kg', parseInt(max_capacity));
            if (capabilities) query = query.contains('capabilities', capabilities.split(','));

            const { data: vehicles, error } = await query;

            if (error) throw error;
            res.json(vehicles);
        } else {
            let vehicles = mockVehicles.filter(v => v.is_available);
            if (vehicle_type) vehicles = vehicles.filter(v => v.vehicle_type === vehicle_type);
            if (min_capacity) vehicles = vehicles.filter(v => v.max_capacity_kg >= parseInt(min_capacity));
            if (max_capacity) vehicles = vehicles.filter(v => v.max_capacity_kg <= parseInt(max_capacity));
            if (capabilities) {
                const reqCaps = capabilities.split(',');
                vehicles = vehicles.filter(v => 
                    reqCaps.every(cap => v.capabilities.includes(cap))
                );
            }
            res.json(vehicles);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single vehicle
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select(`
                    *,
                    transporter:profiles!transporter_id(id, business_name, phone, verified)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            res.json(vehicle);
        } else {
            const vehicle = mockVehicles.find(v => v.id === id);
            if (!vehicle) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            res.json(vehicle);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new vehicle (transporter only)
router.post('/', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const {
            plate_number,
            vehicle_type,
            max_capacity_kg,
            base_rate_per_km,
            fuel_efficiency_km_l,
            current_location_lat,
            current_location_lng,
            home_base_location,
            capabilities
        } = req.body;

        if (!plate_number || !vehicle_type || !max_capacity_kg) {
            return res.status(400).json({ error: 'Plate number, vehicle type, and max capacity are required' });
        }

        if (!VEHICLE_TYPES.includes(vehicle_type)) {
            return res.status(400).json({ error: `Invalid vehicle type. Must be one of: ${VEHICLE_TYPES.join(', ')}` });
        }

        if (max_capacity_kg <= 0) {
            return res.status(400).json({ error: 'Max capacity must be greater than 0' });
        }

        const vehicleData = {
            id: crypto.randomUUID(),
            transporter_id: req.user.id,
            plate_number,
            vehicle_type,
            max_capacity_kg: parseInt(max_capacity_kg),
            current_load_kg: 0,
            base_rate_per_km: parseFloat(base_rate_per_km) || 0,
            fuel_efficiency_km_l: parseFloat(fuel_efficiency_km_l) || 10.0,
            current_location_lat: parseFloat(current_location_lat) || null,
            current_location_lng: parseFloat(current_location_lng) || null,
            home_base_location: home_base_location || null,
            is_available: true,
            capabilities: capabilities || [],
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .insert([vehicleData])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(vehicle);
        } else {
            mockVehicles.push(vehicleData);
            res.status(201).json(vehicleData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update vehicle
router.put('/:id', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            vehicle_type,
            max_capacity_kg,
            current_load_kg,
            base_rate_per_km,
            fuel_efficiency_km_l,
            current_location_lat,
            current_location_lng,
            home_base_location,
            is_available,
            capabilities
        } = req.body;

        // Validate vehicle_type if provided
        if (vehicle_type && !VEHICLE_TYPES.includes(vehicle_type)) {
            return res.status(400).json({ error: `Invalid vehicle type. Must be one of: ${VEHICLE_TYPES.join(', ')}` });
        }

        const updateData = {
            ...(vehicle_type && { vehicle_type }),
            ...(max_capacity_kg !== undefined && { max_capacity_kg: parseInt(max_capacity_kg) }),
            ...(current_load_kg !== undefined && { current_load_kg: parseInt(current_load_kg) }),
            ...(base_rate_per_km !== undefined && { base_rate_per_km: parseFloat(base_rate_per_km) }),
            ...(fuel_efficiency_km_l !== undefined && { fuel_efficiency_km_l: parseFloat(fuel_efficiency_km_l) }),
            ...(current_location_lat !== undefined && { current_location_lat: parseFloat(current_location_lat) }),
            ...(current_location_lng !== undefined && { current_location_lng: parseFloat(current_location_lng) }),
            ...(home_base_location !== undefined && { home_base_location }),
            ...(is_available !== undefined && { is_available }),
            ...(capabilities && { capabilities })
        };

        if (supabase) {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .update(updateData)
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(vehicle);
        } else {
            const index = mockVehicles.findIndex(v => v.id === id && v.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            mockVehicles[index] = { ...mockVehicles[index], ...updateData };
            res.json(mockVehicles[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update vehicle location
router.put('/:id/location', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;
        const { lat, lng } = req.body;

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const updateData = {
            current_location_lat: parseFloat(lat),
            current_location_lng: parseFloat(lng)
        };

        if (supabase) {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .update(updateData)
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(vehicle);
        } else {
            const index = mockVehicles.findIndex(v => v.id === id && v.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            mockVehicles[index] = { ...mockVehicles[index], ...updateData };
            res.json(mockVehicles[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete vehicle
router.delete('/:id', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', id)
                .eq('transporter_id', req.user.id);

            if (error) throw error;
            res.json({ message: 'Vehicle deleted successfully' });
        } else {
            const index = mockVehicles.findIndex(v => v.id === id && v.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            mockVehicles.splice(index, 1);
            res.json({ message: 'Vehicle deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle types
router.get('/types/list', (req, res) => {
    res.json(VEHICLE_TYPES);
});

// Get capability options
router.get('/capabilities/list', (req, res) => {
    res.json([
        'refrigerated',
        'covered',
        'open',
        'gps',
        'temperature_controlled',
        'hazmat_certified',
        'livestock_certified',
        'fragile_handling'
    ]);
});

export default router;
