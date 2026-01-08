import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Mock vehicles for development
let mockVehicles = [
    {
        id: '1',
        transporter_id: '1',
        vehicle_number: 'TN01AB1234',
        type: 'covered',
        capacity_tons: 10,
        capacity_volume: 50,
        current_load: 0,
        status: 'available',
        features: ['gps', 'refrigerated'],
        created_at: new Date().toISOString()
    }
];

// Vehicle types
const VEHICLE_TYPES = ['open', 'covered', 'refrigerated', 'container', 'tanker', 'flatbed'];

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
        const { type, min_capacity, max_capacity, features } = req.query;

        if (supabase) {
            let query = supabase
                .from('vehicles')
                .select(`
          *,
          transporters:users!transporter_id(id, name, phone, rating)
        `)
                .eq('status', 'available');

            if (type) query = query.eq('type', type);
            if (min_capacity) query = query.gte('capacity_tons', parseFloat(min_capacity));
            if (max_capacity) query = query.lte('capacity_tons', parseFloat(max_capacity));
            if (features) query = query.contains('features', features.split(','));

            const { data: vehicles, error } = await query;

            if (error) throw error;
            res.json(vehicles);
        } else {
            let vehicles = mockVehicles.filter(v => v.status === 'available');
            if (type) vehicles = vehicles.filter(v => v.type === type);
            if (min_capacity) vehicles = vehicles.filter(v => v.capacity_tons >= parseFloat(min_capacity));
            if (max_capacity) vehicles = vehicles.filter(v => v.capacity_tons <= parseFloat(max_capacity));
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
          transporter:users!transporter_id(id, name, phone, rating)
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
        const { vehicle_number, type, capacity_tons, capacity_volume, features } = req.body;

        if (!vehicle_number || !type || !capacity_tons) {
            return res.status(400).json({ error: 'Vehicle number, type, and capacity are required' });
        }

        if (!VEHICLE_TYPES.includes(type)) {
            return res.status(400).json({ error: `Invalid vehicle type. Must be one of: ${VEHICLE_TYPES.join(', ')}` });
        }

        const vehicleData = {
            id: crypto.randomUUID(),
            transporter_id: req.user.id,
            vehicle_number,
            type,
            capacity_tons: parseFloat(capacity_tons),
            capacity_volume: parseFloat(capacity_volume) || 0,
            current_load: 0,
            status: 'available',
            features: features || [],
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
        const { type, capacity_tons, capacity_volume, current_load, status, features } = req.body;

        const updateData = {
            ...(type && { type }),
            ...(capacity_tons && { capacity_tons: parseFloat(capacity_tons) }),
            ...(capacity_volume && { capacity_volume: parseFloat(capacity_volume) }),
            ...(current_load !== undefined && { current_load: parseFloat(current_load) }),
            ...(status && { status }),
            ...(features && { features }),
            updated_at: new Date().toISOString()
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

export default router;
