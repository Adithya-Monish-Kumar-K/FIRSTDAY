import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendCheckpointNotification } from '../config/email.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();

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

// Get checkpoints for a shipment
router.get('/shipment/:shipmentId', verifyToken, async (req, res) => {
    try {
        const { shipmentId } = req.params;

        if (supabase) {
            const { data: checkpoints, error } = await supabase
                .from('checkpoints')
                .select(`
          *,
          transporter:users!transporter_id(id, name, phone)
        `)
                .eq('shipment_id', shipmentId)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            res.json(checkpoints);
        } else {
            const checkpoints = mockCheckpoints.filter(c => c.shipment_id === shipmentId);
            res.json(checkpoints);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add checkpoint (transporter only)
router.post('/', verifyToken, requireRole('transporter'), upload.single('image'), async (req, res) => {
    try {
        const { shipment_id, location, lat, lng, status, notes, handoff_to_transporter_id } = req.body;

        if (!shipment_id || !location) {
            return res.status(400).json({ error: 'Shipment ID and location are required' });
        }

        const checkpointData = {
            id: crypto.randomUUID(),
            shipment_id,
            transporter_id: req.user.id,
            location,
            lat: parseFloat(lat) || null,
            lng: parseFloat(lng) || null,
            status: status || 'arrived',
            notes: notes || '',
            image_url: req.file ? `/uploads/checkpoints/${req.file.filename}` : null,
            handoff_to_transporter_id: handoff_to_transporter_id || null,
            is_handoff: !!handoff_to_transporter_id,
            timestamp: new Date().toISOString()
        };

        if (supabase) {
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
          shipper:users!shipper_id(email, name)
        `)
                .eq('id', shipment_id)
                .single();

            // Send email notification
            if (shipment?.shipper?.email) {
                await sendCheckpointNotification(
                    shipment.shipper.email,
                    { ...checkpointData, transporterName: req.user.name },
                    shipment_id
                );
            }

            // If handoff, update shipment transporter
            if (handoff_to_transporter_id) {
                await supabase
                    .from('shipments')
                    .update({
                        transporter_id: handoff_to_transporter_id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', shipment_id);
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

// Get latest checkpoint for a shipment
router.get('/latest/:shipmentId', verifyToken, async (req, res) => {
    try {
        const { shipmentId } = req.params;

        if (supabase) {
            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .select(`
          *,
          transporter:users!transporter_id(id, name, phone)
        `)
                .eq('shipment_id', shipmentId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            res.json(checkpoint || null);
        } else {
            const checkpoints = mockCheckpoints
                .filter(c => c.shipment_id === shipmentId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            res.json(checkpoints[0] || null);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify handoff with image
router.post('/handoff', verifyToken, requireRole('transporter'), upload.single('verification_image'), async (req, res) => {
    try {
        const { shipment_id, from_transporter_id, notes, location, lat, lng } = req.body;

        if (!shipment_id || !req.file) {
            return res.status(400).json({ error: 'Shipment ID and verification image are required' });
        }

        const handoffData = {
            id: crypto.randomUUID(),
            shipment_id,
            transporter_id: req.user.id, // New transporter (receiving)
            from_transporter_id: from_transporter_id || null,
            location: location || 'Handoff Location',
            lat: parseFloat(lat) || null,
            lng: parseFloat(lng) || null,
            status: 'handoff_complete',
            notes: notes || 'Cargo received',
            image_url: `/uploads/checkpoints/${req.file.filename}`,
            is_handoff: true,
            timestamp: new Date().toISOString()
        };

        if (supabase) {
            // Insert handoff checkpoint
            const { data: checkpoint, error } = await supabase
                .from('checkpoints')
                .insert([handoffData])
                .select()
                .single();

            if (error) throw error;

            // Update shipment with new transporter
            await supabase
                .from('shipments')
                .update({
                    transporter_id: req.user.id,
                    status: 'in_transit',
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipment_id);

            // Get shipment for notification
            const { data: shipment } = await supabase
                .from('shipments')
                .select(`shipper:users!shipper_id(email)`)
                .eq('id', shipment_id)
                .single();

            if (shipment?.shipper?.email) {
                await sendCheckpointNotification(
                    shipment.shipper.email,
                    { ...handoffData, transporterName: req.user.name },
                    shipment_id
                );
            }

            res.status(201).json(checkpoint);
        } else {
            mockCheckpoints.push(handoffData);

            // Update mock shipment
            const shipmentIndex = global.mockShipments?.findIndex(s => s.id === shipment_id);
            if (shipmentIndex !== undefined && shipmentIndex !== -1) {
                global.mockShipments[shipmentIndex].transporter_id = req.user.id;
                global.mockShipments[shipmentIndex].status = 'in_transit';
            }

            res.status(201).json(handoffData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
