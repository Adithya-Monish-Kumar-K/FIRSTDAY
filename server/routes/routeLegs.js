import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../config/email.js';
import crypto from 'crypto';

const router = express.Router();

// Route leg status values
const LEG_STATUSES = ['pending', 'assigned', 'active', 'completed'];

// Mock route legs for development
let mockRouteLegs = [];

// Get all route legs for a shipment
router.get('/shipment/:shipmentId', verifyToken, async (req, res) => {
    try {
        const { shipmentId } = req.params;

        if (supabase) {
            const { data: legs, error } = await supabase
                .from('route_legs')
                .select(`
                    *,
                    vehicle:vehicles(id, plate_number, vehicle_type, max_capacity_kg),
                    transporter:profiles!transporter_id(id, business_name, phone, verified),
                    checkpoints(*)
                `)
                .eq('shipment_id', shipmentId)
                .order('leg_sequence_index', { ascending: true });

            if (error) throw error;
            res.json(legs);
        } else {
            const legs = mockRouteLegs
                .filter(l => l.shipment_id === shipmentId)
                .sort((a, b) => a.leg_sequence_index - b.leg_sequence_index);
            res.json(legs);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available route legs for transporters (pending/unassigned)
router.get('/available', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { start_location, end_location } = req.query;

        if (supabase) {
            let query = supabase
                .from('route_legs')
                .select(`
                    *,
                    shipment:shipments(
                        id, cargo_type, weight_kg, special_requirements,
                        origin_address, dest_address,
                        shipper:profiles!shipper_id(id, business_name, verified)
                    )
                `)
                .eq('status', 'pending')
                .is('transporter_id', null);

            if (start_location) {
                query = query.ilike('start_location_name', `%${start_location}%`);
            }
            if (end_location) {
                query = query.ilike('end_location_name', `%${end_location}%`);
            }

            const { data: legs, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json(legs);
        } else {
            let legs = mockRouteLegs.filter(l => l.status === 'pending' && !l.transporter_id);
            res.json(legs);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transporter's assigned route legs
router.get('/my-legs', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { status } = req.query;

        if (supabase) {
            let query = supabase
                .from('route_legs')
                .select(`
                    *,
                    shipment:shipments(
                        id, cargo_type, weight_kg, origin_address, dest_address,
                        shipper:profiles!shipper_id(id, business_name, phone)
                    ),
                    vehicle:vehicles(id, plate_number, vehicle_type)
                `)
                .eq('transporter_id', req.user.id);

            if (status) query = query.eq('status', status);

            const { data: legs, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json(legs);
        } else {
            let legs = mockRouteLegs.filter(l => l.transporter_id === req.user.id);
            if (status) legs = legs.filter(l => l.status === status);
            res.json(legs);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single route leg
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: leg, error } = await supabase
                .from('route_legs')
                .select(`
                    *,
                    shipment:shipments(*),
                    vehicle:vehicles(*),
                    transporter:profiles!transporter_id(id, business_name, phone, email),
                    checkpoints(*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            res.json(leg);
        } else {
            const leg = mockRouteLegs.find(l => l.id === id);
            if (!leg) {
                return res.status(404).json({ error: 'Route leg not found' });
            }
            res.json(leg);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create route legs for a shipment (typically called by system/admin when planning multi-leg route)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { shipment_id, legs } = req.body;

        if (!shipment_id || !legs || !Array.isArray(legs) || legs.length === 0) {
            return res.status(400).json({ error: 'Shipment ID and legs array are required' });
        }

        const createdLegs = [];

        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            const legData = {
                id: crypto.randomUUID(),
                shipment_id,
                vehicle_id: leg.vehicle_id || null,
                transporter_id: leg.transporter_id || null,
                leg_sequence_index: i + 1,
                is_last_leg: i === legs.length - 1,
                start_location_name: leg.start_location_name,
                end_location_name: leg.end_location_name,
                agreed_price: leg.agreed_price ? parseFloat(leg.agreed_price) : null,
                status: leg.transporter_id ? 'assigned' : 'pending',
                created_at: new Date().toISOString()
            };

            if (supabase) {
                const { data: createdLeg, error } = await supabase
                    .from('route_legs')
                    .insert([legData])
                    .select()
                    .single();

                if (error) throw error;
                createdLegs.push(createdLeg);
            } else {
                mockRouteLegs.push(legData);
                createdLegs.push(legData);
            }
        }

        // Update shipment status to 'processing'
        if (supabase) {
            await supabase
                .from('shipments')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq('id', shipment_id);
        }

        res.status(201).json(createdLegs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept a route leg (transporter claims it)
router.post('/:id/accept', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicle_id, proposed_price } = req.body;

        if (!vehicle_id) {
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }

        if (supabase) {
            // Check if leg is still available
            const { data: existing } = await supabase
                .from('route_legs')
                .select('status, transporter_id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({ error: 'Route leg not found' });
            }

            if (existing.transporter_id !== null) {
                return res.status(400).json({ error: 'Route leg already assigned to another transporter' });
            }

            // Verify vehicle belongs to transporter
            const { data: vehicle } = await supabase
                .from('vehicles')
                .select('id')
                .eq('id', vehicle_id)
                .eq('transporter_id', req.user.id)
                .single();

            if (!vehicle) {
                return res.status(400).json({ error: 'Vehicle not found or does not belong to you' });
            }

            const { data: leg, error } = await supabase
                .from('route_legs')
                .update({
                    transporter_id: req.user.id,
                    vehicle_id,
                    agreed_price: proposed_price ? parseFloat(proposed_price) : null,
                    status: 'assigned'
                })
                .eq('id', id)
                .select(`
                    *,
                    shipment:shipments(id, shipper_id)
                `)
                .single();

            if (error) throw error;

            // Check if all legs are assigned, update shipment status
            const { data: allLegs } = await supabase
                .from('route_legs')
                .select('status')
                .eq('shipment_id', leg.shipment_id);

            if (allLegs && allLegs.every(l => l.status !== 'pending')) {
                await supabase
                    .from('shipments')
                    .update({ status: 'assigned', updated_at: new Date().toISOString() })
                    .eq('id', leg.shipment_id);
            }

            res.json(leg);
        } else {
            const index = mockRouteLegs.findIndex(l => l.id === id);
            if (index === -1) {
                return res.status(404).json({ error: 'Route leg not found' });
            }
            if (mockRouteLegs[index].transporter_id !== null) {
                return res.status(400).json({ error: 'Route leg already assigned' });
            }

            mockRouteLegs[index].transporter_id = req.user.id;
            mockRouteLegs[index].vehicle_id = vehicle_id;
            mockRouteLegs[index].agreed_price = proposed_price ? parseFloat(proposed_price) : null;
            mockRouteLegs[index].status = 'assigned';

            res.json(mockRouteLegs[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start a route leg (transporter begins transport)
router.post('/:id/start', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: leg, error } = await supabase
                .from('route_legs')
                .update({ status: 'active' })
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .eq('status', 'assigned')
                .select(`
                    *,
                    shipment:shipments(id, status)
                `)
                .single();

            if (error) throw error;

            // Update shipment to in_transit if not already
            if (leg.shipment?.status !== 'in_transit') {
                await supabase
                    .from('shipments')
                    .update({ status: 'in_transit', updated_at: new Date().toISOString() })
                    .eq('id', leg.shipment_id);
            }

            res.json(leg);
        } else {
            const index = mockRouteLegs.findIndex(
                l => l.id === id && l.transporter_id === req.user.id && l.status === 'assigned'
            );
            if (index === -1) {
                return res.status(404).json({ error: 'Route leg not found or not assigned to you' });
            }
            mockRouteLegs[index].status = 'active';
            res.json(mockRouteLegs[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complete a route leg
router.post('/:id/complete', verifyToken, requireRole('transporter'), async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: leg, error } = await supabase
                .from('route_legs')
                .update({ status: 'completed' })
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .eq('status', 'active')
                .select(`
                    *,
                    shipment:shipments(id)
                `)
                .single();

            if (error) throw error;

            // Check if this was the last leg
            if (leg.is_last_leg) {
                await supabase
                    .from('shipments')
                    .update({ status: 'delivered', updated_at: new Date().toISOString() })
                    .eq('id', leg.shipment_id);
            }

            res.json(leg);
        } else {
            const index = mockRouteLegs.findIndex(
                l => l.id === id && l.transporter_id === req.user.id && l.status === 'active'
            );
            if (index === -1) {
                return res.status(404).json({ error: 'Route leg not found or not active' });
            }
            mockRouteLegs[index].status = 'completed';
            res.json(mockRouteLegs[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update route leg (transporter can update price, admin can update anything)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { agreed_price, status, vehicle_id } = req.body;

        // Validate status if provided
        if (status && !LEG_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${LEG_STATUSES.join(', ')}` });
        }

        const updateData = {
            ...(agreed_price !== undefined && { agreed_price: parseFloat(agreed_price) }),
            ...(status && { status }),
            ...(vehicle_id && { vehicle_id })
        };

        if (supabase) {
            const { data: leg, error } = await supabase
                .from('route_legs')
                .update(updateData)
                .eq('id', id)
                .eq('transporter_id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(leg);
        } else {
            const index = mockRouteLegs.findIndex(l => l.id === id && l.transporter_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Route leg not found' });
            }
            mockRouteLegs[index] = { ...mockRouteLegs[index], ...updateData };
            res.json(mockRouteLegs[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leg statuses
router.get('/types/statuses', (req, res) => {
    res.json(LEG_STATUSES);
});

export default router;
