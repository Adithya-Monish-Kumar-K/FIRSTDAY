import express from 'express';
import { supabase, supabaseAdmin } from '../config/database.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Role enum matching database schema
const USER_ROLES = ['shipper', 'transporter', 'admin'];

// Mock users for development (when Supabase is not configured)
const mockUsers = [
    {
        id: '1',
        email: 'transporter@test.com',
        password: 'password123',
        role: 'transporter',
        business_name: 'Fast Logistics Co.',
        phone: '+91 9876543210',
        verified: true,
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        email: 'shipper@test.com',
        password: 'password123',
        role: 'shipper',
        business_name: 'ABC Traders',
        phone: '+91 9876543211',
        verified: true,
        created_at: new Date().toISOString()
    },
    {
        id: '3',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin',
        business_name: 'ChainFreight Admin',
        phone: '+91 9876543212',
        verified: true,
        created_at: new Date().toISOString()
    },
];


// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, business_name, role, phone } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        if (!USER_ROLES.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${USER_ROLES.join(', ')}` });
        }

        // Email validation - must start with alphanumeric, contain @, and valid domain
        const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format. Email must start with a letter or number.' });
        }

        // Phone validation - must have at least 10 digits (if provided)
        if (phone) {
            const digitsOnly = phone.replace(/\D/g, '');
            if (digitsOnly.length < 10) {
                return res.status(400).json({ error: 'Phone number must contain at least 10 digits.' });
            }
        }

        if (supabase) {
            // Create user with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // Use admin client to insert profile (bypasses RLS)
            // This is needed because RLS INSERT policies require auth.uid()
            // which isn't properly set during the signup flow
            const adminClient = supabaseAdmin || supabase;
            
            const { data: profile, error: profileError } = await adminClient
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    email,
                    role,
                    business_name: business_name || null,
                    phone: phone || null,
                    verified: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            const token = generateToken(profile);
            res.status(201).json({ user: profile, token });
        } else {
            // Mock mode
            // Check if user exists
            const existingUser = mockUsers.find(u => u.email === email);
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const newUser = {
                id: crypto.randomUUID(),
                email,
                role,
                business_name: business_name || null,
                phone: phone || null,
                verified: false,
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

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) throw profileError;

            const token = generateToken(profile);
            res.json({ user: profile, token });
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
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', req.user.id)
                .single();

            if (error) throw error;
            res.json(profile);
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
        const { business_name, phone, verified } = req.body;

        const updateData = {
            ...(business_name !== undefined && { business_name }),
            ...(phone !== undefined && { phone }),
            // Only admin can update verified status - for now, ignore it in regular updates
        };

        if (supabase) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', req.user.id)
                .select()
                .single();

            if (error) throw error;
            res.json(profile);
        } else {
            const userIndex = mockUsers.findIndex(u => u.id === req.user.id);
            if (userIndex !== -1) {
                mockUsers[userIndex] = { ...mockUsers[userIndex], ...updateData };
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

// Get user by ID (public profile)
router.get('/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, role, business_name, verified, created_at')
                .eq('id', id)
                .single();

            if (error) throw error;
            res.json(profile);
        } else {
            const user = mockUsers.find(u => u.id === id);
            if (user) {
                const { password: _, email: __, phone: ___, ...publicData } = user;
                res.json(publicData);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available roles
router.get('/roles', (req, res) => {
    res.json(USER_ROLES);
});

export default router;
