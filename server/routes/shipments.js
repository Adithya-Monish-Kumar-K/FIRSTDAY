import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendCheckpointNotification } from '../config/email.js';
import crypto from 'crypto';

const router = express.Router();

// Mock shipments for development
let mockShipments = [
    {
        id: '1',
        shipper_id: '2',
        transporter_id: null,
        vehicle_id: null,
        origin: { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu' },
        destination: { lat: 12.9716, lng: 77.5946, address: 'Bangalore, Karnataka' },
        cargo_type: 'general',
        weight: 5,
        volume: 20,
        vehicle_type_required: 'covered',
        special_requirements: [],
        pickup_date: new Date().toISOString(),
        delivery_date: null,
        status: 'pending',
        price: null,
        distance_km: 350,
        estimated_duration_hours: 6,
        created_at: new Date().toISOString()
    }
];

const CARGO_TYPES = ['general', 'perishable', 'fragile', 'hazardous', 'livestock', 'heavy_machinery'];
const SHIPMENT_STATUSES = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

// Get all shipments (filtered by role)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { status, cargo_type, from_date, to_date } = req.query;

        if (supabase) {
            let query = supabase
                .from('shipments')
                .select(`
          *,
          shipper:users!shipper_id(id, name, phone),
          transporter:users!transporter_id(id, name, phone),
          vehicle:vehicles(id, vehicle_number, type)
        `);

            // Filter by user role
            if (req.user.role === 'shipper') {
                query = query.eq('shipper_id', req.user.id);
            } else if (req.user.role === 'transporter') {
                query = query.or(`transporter_id.eq.${req.user.id},status.eq.pending`);
            }

            if (status) query = query.eq('status', status);
            if (cargo_type) query = query.eq('cargo_type', cargo_type);
            if (from_date) query = query.gte('pickup_date', from_date);
            if (to_date) query = query.lte('pickup_date', to_date);

            const { data: shipments, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json(shipments);
        } else {
            let shipments = [...mockShipments];
            if (req.user.role === 'shipper') {
                shipments = shipments.filter(s => s.shipper_id === req.user.id);
            } else if (req.user.role === 'transporter') {
                shipments = shipments.filter(s => s.transporter_id === req.user.id || s.status === 'pending');
            }
            if (status) shipments = shipments.filter(s => s.status === status);
            if (cargo_type) shipments = shipments.filter(s => s.cargo_type === cargo_type);
            res.json(shipments);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available shipments for transporters (pending only)
router.get('/available', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { vehicle_type, min_weight, max_weight, origin_lat, origin_lng, radius_km } = req.query;

        if (supabase) {
            let query = supabase
                .from('shipments')
                .select(`
          *,
          shipper:users!shipper_id(id, name, phone, rating)
        `)
                .eq('status', 'pending');

            if (vehicle_type) query = query.eq('vehicle_type_required', vehicle_type);
            if (min_weight) query = query.gte('weight', parseFloat(min_weight));
            if (max_weight) query = query.lte('weight', parseFloat(max_weight));

            const { data: shipments, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json(shipments);
        } else {
            let shipments = mockShipments.filter(s => s.status === 'pending');
            if (vehicle_type) shipments = shipments.filter(s => s.vehicle_type_required === vehicle_type);
            if (min_weight) shipments = shipments.filter(s => s.weight >= parseFloat(min_weight));
            if (max_weight) shipments = shipments.filter(s => s.weight <= parseFloat(max_weight));
            res.json(shipments);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single shipment
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: shipment, error } = await supabase
                .from('shipments')
                .select(`
          *,
          shipper:users!shipper_id(id, name, phone, email),
          transporter:users!transporter_id(id, name, phone),
          vehicle:vehicles(id, vehicle_number, type),
          checkpoints(*)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            res.json(shipment);
        } else {
            const shipment = mockShipments.find(s => s.id === id);
            if (!shipment) {
                return res.status(404).json({ error: 'Shipment not found' });
            }
            res.json(shipment);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new shipment (shipper only)
router.post('/', verifyToken, requireRole('shipper'), async (req, res) => {
    try {
        const {
            origin,
            destination,
            cargo_type,
            weight,
            volume,
            vehicle_type_required,
            special_requirements,
            pickup_date,
            description
        } = req.body;

        if (!origin || !destination || !cargo_type || !weight || !vehicle_type_required) {
            return res.status(400).json({ error: 'Origin, destination, cargo type, weight, and vehicle type are required' });
        }

        const shipmentData = {
            id: crypto.randomUUID(),
            shipper_id: req.user.id,
            transporter_id: null,
            vehicle_id: null,
            origin,
            destination,
            cargo_type,
            weight: parseFloat(weight),
            volume: parseFloat(volume) || 0,
            vehicle_type_required,
            special_requirements: special_requirements || [],
            pickup_date: pickup_date || new Date().toISOString(),
            delivery_date: null,
            status: 'pending',
            price: null,
            description: description || '',
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: shipment, error } = await supabase
                .from('shipments')
                .insert([shipmentData])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(shipment);
        } else {
            mockShipments.push(shipmentData);
            res.status(201).json(shipmentData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept shipment (transporter only)
router.post('/:id/accept', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicle_id, proposed_price } = req.body;

        if (!vehicle_id) {
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }

        const updateData = {
            transporter_id: req.user.id,
            vehicle_id,
            price: proposed_price || null,
            status: 'accepted',
            accepted_at: new Date().toISOString()
        };

        if (supabase) {
            // Check if shipment is still pending
            const { data: existing } = await supabase
                .from('shipments')
                .select('status')
                .eq('id', id)
                .single();

            if (existing?.status !== 'pending') {
                return res.status(400).json({ error: 'Shipment is no longer available' });
            }

            const { data: shipment, error } = await supabase
                .from('shipments')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json(shipment);
        } else {
            const index = mockShipments.findIndex(s => s.id === id);
            if (index === -1) {
                return res.status(404).json({ error: 'Shipment not found' });
            }
            if (mockShipments[index].status !== 'pending') {
                return res.status(400).json({ error: 'Shipment is no longer available' });
            }
            mockShipments[index] = { ...mockShipments[index], ...updateData };
            res.json(mockShipments[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update shipment status
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!SHIPMENT_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${SHIPMENT_STATUSES.join(', ')}` });
        }

        const updateData = {
            status,
            updated_at: new Date().toISOString(),
            ...(status === 'delivered' && { delivery_date: new Date().toISOString() })
        };

        if (supabase) {
            const { data: shipment, error } = await supabase
                .from('shipments')
                .update(updateData)
                .eq('id', id)
                .select(`
          *,
          shipper:users!shipper_id(email)
        `)
                .single();

            if (error) throw error;
            res.json(shipment);
        } else {
            const index = mockShipments.findIndex(s => s.id === id);
            if (index === -1) {
                return res.status(404).json({ error: 'Shipment not found' });
            }
            mockShipments[index] = { ...mockShipments[index], ...updateData };
            res.json(mockShipments[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cargo types
router.get('/types/cargo', (req, res) => {
    res.json(CARGO_TYPES);
});

// Get shipment statuses
router.get('/types/statuses', (req, res) => {
    res.json(SHIPMENT_STATUSES);
});

export default router;
