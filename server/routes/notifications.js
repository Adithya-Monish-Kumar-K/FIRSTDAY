import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Mock notifications for development
let mockNotifications = [];

// Get user's notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, unread_only } = req.query;

        if (supabase) {
            let query = supabase
                .from('notifications')
                .select(`
                    *,
                    shipment:shipments!related_shipment_id(id, origin_address, dest_address, status)
                `)
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (unread_only === 'true') {
                query = query.eq('is_read', false);
            }

            const { data: notifications, error } = await query;

            if (error) throw error;
            res.json(notifications);
        } else {
            let notifications = mockNotifications.filter(n => n.user_id === req.user.id);
            if (unread_only === 'true') {
                notifications = notifications.filter(n => !n.is_read);
            }
            notifications = notifications
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
            res.json(notifications);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        if (supabase) {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', req.user.id)
                .eq('is_read', false);

            if (error) throw error;
            res.json({ count: count || 0 });
        } else {
            const count = mockNotifications.filter(
                n => n.user_id === req.user.id && !n.is_read
            ).length;
            res.json({ count });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single notification
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: notification, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    shipment:shipments!related_shipment_id(id, origin_address, dest_address, status)
                `)
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (error) throw error;
            res.json(notification);
        } else {
            const notification = mockNotifications.find(
                n => n.id === id && n.user_id === req.user.id
            );
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            res.json(notification);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: notification, error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
                .eq('user_id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(notification);
        } else {
            const index = mockNotifications.findIndex(
                n => n.id === id && n.user_id === req.user.id
            );
            if (index === -1) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            mockNotifications[index].is_read = true;
            res.json(mockNotifications[index]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notifications as read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        if (supabase) {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', req.user.id)
                .eq('is_read', false);

            if (error) throw error;
            res.json({ message: 'All notifications marked as read' });
        } else {
            mockNotifications.forEach(n => {
                if (n.user_id === req.user.id) {
                    n.is_read = true;
                }
            });
            res.json({ message: 'All notifications marked as read' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id)
                .eq('user_id', req.user.id);

            if (error) throw error;
            res.json({ message: 'Notification deleted' });
        } else {
            const index = mockNotifications.findIndex(
                n => n.id === id && n.user_id === req.user.id
            );
            if (index === -1) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            mockNotifications.splice(index, 1);
            res.json({ message: 'Notification deleted' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all read notifications
router.delete('/clear/read', verifyToken, async (req, res) => {
    try {
        if (supabase) {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', req.user.id)
                .eq('is_read', true);

            if (error) throw error;
            res.json({ message: 'Read notifications cleared' });
        } else {
            mockNotifications = mockNotifications.filter(
                n => !(n.user_id === req.user.id && n.is_read)
            );
            res.json({ message: 'Read notifications cleared' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create notification (internal use, typically called by other services)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { user_id, title, message, related_shipment_id } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({ error: 'User ID, title, and message are required' });
        }

        const notificationData = {
            id: crypto.randomUUID(),
            user_id,
            title,
            message,
            related_shipment_id: related_shipment_id || null,
            is_read: false,
            created_at: new Date().toISOString()
        };

        if (supabase) {
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert([notificationData])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(notification);
        } else {
            mockNotifications.push(notificationData);
            res.status(201).json(notificationData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
