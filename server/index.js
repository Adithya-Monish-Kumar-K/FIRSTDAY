import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import shipmentRoutes from './routes/shipments.js';
import checkpointRoutes from './routes/checkpoints.js';
import routeRoutes from './routes/routes.js';
import ratingRoutes from './routes/ratings.js';
import pricingRoutes from './routes/pricing.js';
import returnTripRoutes from './routes/returnTrips.js';
import optimizeRoutes from './routes/optimize.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'checkpoints');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/return-trips', returnTripRoutes);
app.use('/api/optimize', optimizeRoutes);

// API documentation
app.get('/api', (req, res) => {
    res.json({
        name: 'Logistics API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'GET /api/auth/me': 'Get current user',
                'PUT /api/auth/profile': 'Update profile'
            },
            vehicles: {
                'GET /api/vehicles': 'Get user vehicles',
                'GET /api/vehicles/available': 'Get available vehicles',
                'POST /api/vehicles': 'Add vehicle',
                'PUT /api/vehicles/:id': 'Update vehicle',
                'DELETE /api/vehicles/:id': 'Delete vehicle'
            },
            shipments: {
                'GET /api/shipments': 'Get shipments',
                'GET /api/shipments/available': 'Get available shipments',
                'POST /api/shipments': 'Create shipment',
                'POST /api/shipments/:id/accept': 'Accept shipment',
                'PUT /api/shipments/:id/status': 'Update status'
            },
            checkpoints: {
                'GET /api/checkpoints/shipment/:id': 'Get shipment checkpoints',
                'POST /api/checkpoints': 'Add checkpoint',
                'POST /api/checkpoints/handoff': 'Record handoff'
            },
            routes: {
                'POST /api/routes/directions': 'Get directions',
                'POST /api/routes/distance-matrix': 'Get distance matrix',
                'GET /api/routes/geocode': 'Geocode address',
                'POST /api/routes/eta': 'Calculate ETA'
            },
            ratings: {
                'GET /api/ratings/user/:id': 'Get user ratings',
                'POST /api/ratings': 'Create rating'
            },
            pricing: {
                'POST /api/pricing/calculate': 'Calculate fuel cost',
                'POST /api/pricing/shipping-price': 'Get price suggestion',
                'GET /api/pricing/fuel-prices': 'Get current fuel prices'
            },
            returnTrips: {
                'GET /api/return-trips/available': 'Get available return trips',
                'POST /api/return-trips': 'Create return trip',
                'POST /api/return-trips/match': 'Match with shipments'
            },
            optimize: {
                'POST /api/optimize/vrp': 'Solve VRP problem',
                'POST /api/optimize/optimize-order': 'Optimize delivery order',
                'POST /api/optimize/match-routes': 'Match compatible routes'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚚 Logistics Server Started Successfully!               ║
║                                                           ║
║   Server running on: http://localhost:${PORT}               ║
║   API Documentation: http://localhost:${PORT}/api           ║
║   Health Check: http://localhost:${PORT}/health             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
