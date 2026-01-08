import express from 'express';
import { supabase } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Mock data for development
let mockRatings = [
    {
        id: '1',
        shipment_id: 'ship-001',
        rater_id: 'user-001',
        rated_user_id: 'user-002',
        rating: 5,
        review: 'Excellent service, very professional!',
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        shipment_id: 'ship-002',
        rater_id: 'user-003',
        rated_user_id: 'user-001',
        rating: 4,
        review: 'Good delivery, on time.',
        created_at: new Date().toISOString()
    }
];

// Get ratings for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!supabase) {
            const userRatings = mockRatings.filter(r => r.rated_user_id === userId);
            const avgRating = userRatings.length > 0
                ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
                : 0;
            return res.json({
                ratings: userRatings,
                average: Math.round(avgRating * 10) / 10,
                count: userRatings.length
            });
        }

        const { data, error } = await supabase
            .from('ratings')
            .select(`
                *,
                rater:profiles!rater_id(id, business_name)
            `)
            .eq('rated_user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const avgRating = data.length > 0
            ? data.reduce((sum, r) => sum + r.rating, 0) / data.length
            : 0;

        res.json({
            ratings: data,
            average: Math.round(avgRating * 10) / 10,
            count: data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get ratings for a shipment
router.get('/shipment/:shipmentId', async (req, res) => {
    try {
        const { shipmentId } = req.params;

        if (!supabase) {
            return res.json(mockRatings.filter(r => r.shipment_id === shipmentId));
        }

        const { data, error } = await supabase
            .from('ratings')
            .select(`
                *,
                rater:profiles!rater_id(id, business_name)
            `)
            .eq('shipment_id', shipmentId);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get my ratings (ratings I've received)
router.get('/my-ratings', verifyToken, async (req, res) => {
    try {
        if (!supabase) {
            const myRatings = mockRatings.filter(r => r.rated_user_id === req.user.id);
            const avgRating = myRatings.length > 0
                ? myRatings.reduce((sum, r) => sum + r.rating, 0) / myRatings.length
                : 0;
            return res.json({
                ratings: myRatings,
                average: Math.round(avgRating * 10) / 10,
                count: myRatings.length
            });
        }

        const { data, error } = await supabase
            .from('ratings')
            .select(`
                *,
                rater:profiles!rater_id(id, business_name),
                shipment:shipments!shipment_id(id, origin_address, dest_address)
            `)
            .eq('rated_user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const avgRating = data.length > 0
            ? data.reduce((sum, r) => sum + r.rating, 0) / data.length
            : 0;

        res.json({
            ratings: data,
            average: Math.round(avgRating * 10) / 10,
            count: data.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new rating
router.post('/', verifyToken, async (req, res) => {
    try {
        const { shipment_id, rated_user_id, rating, review } = req.body;

        if (!shipment_id || !rated_user_id || !rating) {
            return res.status(400).json({ error: 'Shipment ID, rated user ID, and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (rated_user_id === req.user.id) {
            return res.status(400).json({ error: 'You cannot rate yourself' });
        }

        const ratingData = {
            id: crypto.randomUUID(),
            shipment_id,
            rater_id: req.user.id,
            rated_user_id,
            rating: parseInt(rating),
            review: review || '',
            created_at: new Date().toISOString()
        };

        if (!supabase) {
            mockRatings.push(ratingData);
            return res.status(201).json(ratingData);
        }

        // Check if user has already rated this shipment
        const { data: existingRating } = await supabase
            .from('ratings')
            .select('id')
            .eq('shipment_id', shipment_id)
            .eq('rater_id', req.user.id)
            .single();

        if (existingRating) {
            return res.status(400).json({ error: 'You have already rated this shipment' });
        }

        const { data, error } = await supabase
            .from('ratings')
            .insert([ratingData])
            .select()
            .single();

        if (error) throw error;

        // Update user's average rating in profiles (if you track it there)
        // This could be done via a database trigger for better consistency

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a rating
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const updateData = {
            ...(rating !== undefined && { rating: parseInt(rating) }),
            ...(review !== undefined && { review })
        };

        if (!supabase) {
            const index = mockRatings.findIndex(r => r.id === id && r.rater_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Rating not found' });
            }
            mockRatings[index] = { ...mockRatings[index], ...updateData };
            return res.json(mockRatings[index]);
        }

        const { data, error } = await supabase
            .from('ratings')
            .update(updateData)
            .eq('id', id)
            .eq('rater_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a rating
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!supabase) {
            const index = mockRatings.findIndex(r => r.id === id && r.rater_id === req.user.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Rating not found' });
            }
            mockRatings.splice(index, 1);
            return res.json({ message: 'Rating deleted successfully' });
        }

        const { error } = await supabase
            .from('ratings')
            .delete()
            .eq('id', id)
            .eq('rater_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Rating deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
