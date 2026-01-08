import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendCheckpointNotification } from '../config/email.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();

// Checkpoint type enum matching database schema
const CHECKPOINT_TYPES = ['pickup', 'handoff', 'delivery', 'security_check'];

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/checkpoints/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
        }
    }
});

// Mock checkpoints for development
let mockCheckpoints = [];

// Get checkpoints for a route leg
router.get('/route-leg/:routeLegId', verifyToken, async (req, res) => {
    try {
        const { routeLegId } = req.params;

        if (supabase) {
            const { data: checkpoints, error } = await supabase
                .from('checkpoints')
                .select(`
                    *,
                    verified_by:profiles!verified_by_user_id(id, business_name)
                `)
                .eq('route_leg_id', routeLegId)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            res.json(checkpoints);
        } else {
            const checkpoints = mockCheckpoints.filter(c => c.route_leg_id === routeLegId);
            res.json(checkpoints);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all checkpoints for a shipment (via route_legs)
router.get('/shipment/:shipmentId', verifyToken, async (req, res) => {
    try {
        const { shipmentId } = req.params;

        if (supabase) {
            // Get all route legs for this shipment, then their checkpoints
            const { data: legs, error: legsError } = await supabase
                .from('route_legs')
                .select('id, leg_sequence_index')
                .eq('shipment_id', shipmentId)
                .order('leg_sequence_index', { ascending: true });

            if (legsError) throw legsError;

            if (!legs || legs.length === 0) {
                return res.json([]);
            }

            const legIds = legs.map(l => l.id);

            const { data: checkpoints, error } = await supabase
                .from('checkpoints')
                .select(`
                    *,
                    route_leg:route_legs(id, leg_sequence_index, transporter_id),
                    verified_by:profiles!verified_by_user_id(id, business_name)
                `)
                .in('route_leg_id', legIds)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            res.json(checkpoints);
        } else {
            // Mock: filter by shipment_id through route_legs
            res.json(mockCheckpoints);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add checkpoint (transporter only)
router.post('/', verifyToken, requireRole('transporter'), upload.single('image'), async (req, res) => {
    try {
        const { route_leg_id, type, location_name, notes, verified_by_user_id } = req.body;

        if (!route_leg_id || !type || !location_name) {
            return res.status(400).json({ error: 'Route leg ID, type, and location name are required' });
        }

        if (!CHECKPOINT_TYPES.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${CHECKPOINT_TYPES.join(', ')}` });
        }

        const checkpointData = {
            id: crypto.randomUUID(),
            route_leg_id,
            type,
            location_name,
            timestamp: new Date().toISOString(),
            image_proof_url: req.file ? `/uploads/checkpoints/${req.file.filename}` : null,
            verified_by_user_id: verified_by_user_id || null,
            notes: notes || null
        };

        if (supabase) {
            // Verify transporter owns this route leg
            const { data: leg } = await supabase
                .from('route_legs')
                .select('id, transporter_id, shipment_id')
                .eq('id', route_leg_id)
                .eq('transporter_id', req.user.id)
                .single();

            if (!leg) {
                return res.status(403).json({ error: 'You are not authorized to add checkpoints to this route leg' });
            }

            // Insert checkpoint
            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .insert([checkpointData])
                .select()
                .single();

            if (error) throw error;

            // Get shipment details for notification
            const { data: shipment } = await supabase
                .from('shipments')
                .select(`
                    id,
                    shipper:profiles!shipper_id(email, business_name)
                `)
                .eq('id', leg.shipment_id)
                .single();

            // Send email notification
            if (shipment?.shipper?.email) {
                await sendCheckpointNotification(
                    shipment.shipper.email,
                    {
                        location: location_name,
                        status: type,
                        timestamp: checkpointData.timestamp,
                        transporterName: req.user.business_name || 'Transporter'
                    },
                    leg.shipment_id
                );
            }

            // Create notification record
            if (shipment) {
                await supabase
                    .from('notifications')
                    .insert([{
                        id: crypto.randomUUID(),
                        user_id: shipment.shipper_id || shipment.shipper?.id,
                        title: `Checkpoint Update: ${type}`,
                        message: `Your shipment has reached ${location_name}`,
                        related_shipment_id: leg.shipment_id,
                        is_read: false,
                        created_at: new Date().toISOString()
                    }]);
            }

            res.status(201).json(checkpoint);
        } else {
            mockCheckpoints.push(checkpointData);
            res.status(201).json(checkpointData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get latest checkpoint for a route leg
router.get('/latest/:routeLegId', verifyToken, async (req, res) => {
    try {
        const { routeLegId } = req.params;

        if (supabase) {
            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .select(`
                    *,
                    verified_by:profiles!verified_by_user_id(id, business_name)
                `)
                .eq('route_leg_id', routeLegId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            res.json(checkpoint || null);
        } else {
            const checkpoints = mockCheckpoints
                .filter(c => c.route_leg_id === routeLegId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            res.json(checkpoints[0] || null);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Record handoff checkpoint (when cargo transfers between transporters)
router.post('/handoff', verifyToken, requireRole('transporter'), upload.single('verification_image'), async (req, res) => {
    try {
        const { route_leg_id, location_name, notes, from_transporter_verified } = req.body;

        if (!route_leg_id || !req.file) {
            return res.status(400).json({ error: 'Route leg ID and verification image are required' });
        }

        const handoffData = {
            id: crypto.randomUUID(),
            route_leg_id,
            type: 'handoff',
            location_name: location_name || 'Handoff Location',
            timestamp: new Date().toISOString(),
            image_proof_url: `/uploads/checkpoints/${req.file.filename}`,
            verified_by_user_id: from_transporter_verified ? req.user.id : null,
            notes: notes || 'Cargo handoff completed'
        };

        if (supabase) {
            // Verify the new transporter owns this leg (receiving transporter)
            const { data: leg } = await supabase
                .from('route_legs')
                .select('id, transporter_id, shipment_id, leg_sequence_index')
                .eq('id', route_leg_id)
                .eq('transporter_id', req.user.id)
                .single();

            if (!leg) {
                return res.status(403).json({ error: 'You are not authorized for this route leg' });
            }

            // Insert handoff checkpoint
            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .insert([handoffData])
                .select()
                .single();

            if (error) throw error;

            // Get shipment for notification
            const { data: shipment } = await supabase
                .from('shipments')
                .select(`shipper:profiles!shipper_id(email, id)`)
                .eq('id', leg.shipment_id)
                .single();

            if (shipment?.shipper?.email) {
                await sendCheckpointNotification(
                    shipment.shipper.email,
                    {
                        location: handoffData.location_name,
                        status: 'handoff',
                        timestamp: handoffData.timestamp,
                        transporterName: req.user.business_name || 'New Transporter'
                    },
                    leg.shipment_id
                );
            }

            // Create notification
            if (shipment?.shipper?.id) {
                await supabase
                    .from('notifications')
                    .insert([{
                        id: crypto.randomUUID(),
                        user_id: shipment.shipper.id,
                        title: 'Cargo Handoff Complete',
                        message: `Your shipment was transferred to a new transporter at ${handoffData.location_name}`,
                        related_shipment_id: leg.shipment_id,
                        is_read: false,
                        created_at: new Date().toISOString()
                    }]);
            }

            res.status(201).json(checkpoint);
        } else {
            mockCheckpoints.push(handoffData);
            res.status(201).json(handoffData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Security check checkpoint (with mandatory image)
router.post('/security-check', verifyToken, requireRole('transporter'), upload.single('security_image'), async (req, res) => {
    try {
        const { route_leg_id, location_name, notes } = req.body;

        if (!route_leg_id || !req.file) {
            return res.status(400).json({ error: 'Route leg ID and security image are required for security checks' });
        }

        const securityCheckData = {
            id: crypto.randomUUID(),
            route_leg_id,
            type: 'security_check',
            location_name: location_name || 'Security Checkpoint',
            timestamp: new Date().toISOString(),
            image_proof_url: `/uploads/checkpoints/${req.file.filename}`,
            verified_by_user_id: null,
            notes: notes || 'Security verification checkpoint'
        };

        if (supabase) {
            // Verify transporter owns this route leg
            const { data: leg } = await supabase
                .from('route_legs')
                .select('id, transporter_id, shipment_id')
                .eq('id', route_leg_id)
                .eq('transporter_id', req.user.id)
                .single();

            if (!leg) {
                return res.status(403).json({ error: 'You are not authorized for this route leg' });
            }

            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .insert([securityCheckData])
                .select()
                .single();

            if (error) throw error;

            // Get shipment for notification
            const { data: shipment } = await supabase
                .from('shipments')
                .select(`shipper:profiles!shipper_id(email, id)`)
                .eq('id', leg.shipment_id)
                .single();

            if (shipment?.shipper?.email) {
                await sendCheckpointNotification(
                    shipment.shipper.email,
                    {
                        location: securityCheckData.location_name,
                        status: 'security_check',
                        timestamp: securityCheckData.timestamp,
                        transporterName: req.user.business_name || 'Transporter'
                    },
                    leg.shipment_id
                );
            }

            res.status(201).json(checkpoint);
        } else {
            mockCheckpoints.push(securityCheckData);
            res.status(201).json(securityCheckData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get checkpoint types
router.get('/types/list', (req, res) => {
    res.json(CHECKPOINT_TYPES);
});

export default router;
