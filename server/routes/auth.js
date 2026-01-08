import express from 'express';
import { supabase } from '../config/database.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Mock users for development (when Supabase is not configured)
const mockUsers = [
    { id: '1', email: 'transporter@test.com', password: 'password123', role: 'transporter', name: 'John Transporter' },
    { id: '2', email: 'shipper@test.com', password: 'password123', role: 'shipper', name: 'Jane Shipper' },
];

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, phone } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['transporter', 'shipper'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be transporter or shipper' });
        }

        if (supabase) {
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Create user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // Insert user profile
            const { data: user, error: profileError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email,
                    name,
                    role,
                    phone,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            const token = generateToken(user);
            res.status(201).json({ user, token });
        } else {
            // Mock mode
            const newUser = {
                id: crypto.randomUUID(),
                email,
                name,
                role,
                phone,
                created_at: new Date().toISOString()
            };
            mockUsers.push({ ...newUser, password });
            const token = generateToken(newUser);
            res.status(201).json({ user: newUser, token });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (supabase) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (userError) throw userError;

            const token = generateToken(user);
            res.json({ user, token });
        } else {
            // Mock mode
            const user = mockUsers.find(u => u.email === email && u.password === password);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const { password: _, ...userData } = user;
            const token = generateToken(userData);
            res.json({ user: userData, token });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
    try {
        if (supabase) {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', req.user.id)
                .single();

            if (error) throw error;
            res.json(user);
        } else {
            const user = mockUsers.find(u => u.id === req.user.id);
            if (user) {
                const { password: _, ...userData } = user;
                res.json(userData);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        if (supabase) {
            const { data: user, error } = await supabase
                .from('users')
                .update({ name, phone, address, updated_at: new Date().toISOString() })
                .eq('id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(user);
        } else {
            const userIndex = mockUsers.findIndex(u => u.id === req.user.id);
            if (userIndex !== -1) {
                mockUsers[userIndex] = { ...mockUsers[userIndex], name, phone, address };
                const { password: _, ...userData } = mockUsers[userIndex];
                res.json(userData);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
