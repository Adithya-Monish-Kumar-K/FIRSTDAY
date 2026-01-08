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
import routeLegRoutes from './routes/routeLegs.js';
import notificationRoutes from './routes/notifications.js';

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
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
        version: '1.0.0',
        service: 'ChainFreight Logistics API'
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
app.use('/api/route-legs', routeLegRoutes);
app.use('/api/notifications', notificationRoutes);

// API documentation
app.get('/api', (req, res) => {
    res.json({
        name: 'ChainFreight Logistics API',
        version: '1.0.0',
        description: 'Road-Based Logistics Optimization Platform API',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user (shipper/transporter)',
                'POST /api/auth/login': 'Login user',
                'GET /api/auth/me': 'Get current user profile',
                'PUT /api/auth/profile': 'Update profile',
                'GET /api/auth/profile/:id': 'Get public profile',
                'GET /api/auth/roles': 'Get available roles'
            },
            vehicles: {
                'GET /api/vehicles': 'Get transporter vehicles',
                'GET /api/vehicles/available': 'Get available vehicles (with filters)',
                'GET /api/vehicles/:id': 'Get single vehicle',
                'POST /api/vehicles': 'Add vehicle (transporter only)',
                'PUT /api/vehicles/:id': 'Update vehicle',
                'PUT /api/vehicles/:id/location': 'Update vehicle location',
                'DELETE /api/vehicles/:id': 'Delete vehicle',
                'GET /api/vehicles/types/list': 'Get vehicle types enum',
                'GET /api/vehicles/capabilities/list': 'Get capability options'
            },
            shipments: {
                'GET /api/shipments': 'Get shipments (filtered by role)',
                'GET /api/shipments/available': 'Get available shipments (marketplace)',
                'GET /api/shipments/:id': 'Get single shipment with route legs',
                'POST /api/shipments': 'Create shipment (shipper only)',
                'PUT /api/shipments/:id': 'Update shipment',
                'PUT /api/shipments/:id/status': 'Update shipment status',
                'POST /api/shipments/:id/cancel': 'Cancel shipment',
                'GET /api/shipments/types/cargo': 'Get cargo types',
                'GET /api/shipments/types/statuses': 'Get status enum'
            },
            routeLegs: {
                'GET /api/route-legs/shipment/:shipmentId': 'Get legs for shipment',
                'GET /api/route-legs/available': 'Get unassigned legs (marketplace)',
                'GET /api/route-legs/my-legs': 'Get transporter assigned legs',
                'GET /api/route-legs/:id': 'Get single leg',
                'POST /api/route-legs': 'Create route legs for shipment',
                'POST /api/route-legs/:id/accept': 'Accept/claim a leg',
                'POST /api/route-legs/:id/start': 'Start transport',
                'POST /api/route-legs/:id/complete': 'Complete leg',
                'PUT /api/route-legs/:id': 'Update leg'
            },
            checkpoints: {
                'GET /api/checkpoints/route-leg/:routeLegId': 'Get checkpoints for leg',
                'GET /api/checkpoints/shipment/:shipmentId': 'Get all checkpoints for shipment',
                'GET /api/checkpoints/latest/:routeLegId': 'Get latest checkpoint',
                'POST /api/checkpoints': 'Add checkpoint (with image)',
                'POST /api/checkpoints/handoff': 'Record handoff with verification image',
                'POST /api/checkpoints/security-check': 'Security check with image',
                'GET /api/checkpoints/types/list': 'Get checkpoint types'
            },
            notifications: {
                'GET /api/notifications': 'Get user notifications',
                'GET /api/notifications/unread-count': 'Get unread count',
                'GET /api/notifications/:id': 'Get single notification',
                'PUT /api/notifications/:id/read': 'Mark as read',
                'PUT /api/notifications/read-all': 'Mark all as read',
                'DELETE /api/notifications/:id': 'Delete notification',
                'DELETE /api/notifications/clear/read': 'Clear read notifications'
            },
            routes: {
                'POST /api/routes/directions': 'Get directions (Google Maps)',
                'POST /api/routes/distance-matrix': 'Get distance matrix',
                'GET /api/routes/geocode': 'Geocode address',
                'GET /api/routes/reverse-geocode': 'Reverse geocode',
                'POST /api/routes/eta': 'Calculate ETA'
            },
            ratings: {
                'GET /api/ratings/user/:id': 'Get user ratings',
                'GET /api/ratings/shipment/:id': 'Get shipment ratings',
                'GET /api/ratings/my-ratings': 'Get my received ratings',
                'POST /api/ratings': 'Create rating',
                'PUT /api/ratings/:id': 'Update rating',
                'DELETE /api/ratings/:id': 'Delete rating'
            },
            pricing: {
                'POST /api/pricing/calculate': 'Calculate fuel cost',
                'POST /api/pricing/shipping-price': 'Get price suggestion',
                'GET /api/pricing/prices': 'Get current fuel prices',
                'GET /api/pricing/mileage': 'Get vehicle mileage data'
            },
            returnTrips: {
                'GET /api/return-trips/available': 'Get available return trips',
                'GET /api/return-trips/my-trips': 'Get transporter return trips',
                'POST /api/return-trips': 'Create return trip',
                'POST /api/return-trips/match': 'Match with shipments',
                'PUT /api/return-trips/:id': 'Update return trip',
                'DELETE /api/return-trips/:id': 'Delete return trip'
            },
            optimize: {
                'POST /api/optimize/vrp': 'Solve VRP problem (local)',
                'POST /api/optimize/optimize-order': 'Optimize delivery order',
                'POST /api/optimize/match-routes': 'Match compatible routes',
                'POST /api/optimize/chain': '🔥 Multi-transporter chain optimization (Python OR-Tools)',
                'GET /api/optimize/health': 'Check optimizer service health'
            }
        },
        schemas: {
            userRoles: ['shipper', 'transporter', 'admin'],
            vehicleTypes: ['lorry', 'truck', 'trailer', 'mini_truck', 'tempo'],
            shipmentStatuses: ['posted', 'processing', 'assigned', 'in_transit', 'delivered', 'cancelled'],
            checkpointTypes: ['pickup', 'handoff', 'delivery', 'security_check'],
            legStatuses: ['pending', 'assigned', 'active', 'completed']
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
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚛 ChainFreight Logistics Server Started!                   ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                   ║
║   API Documentation: http://localhost:${PORT}/api               ║
║   Health Check: http://localhost:${PORT}/health                 ║
║                                                               ║
║   Features:                                                   ║
║   • Multi-leg shipment routing                                ║
║   • Checkpoint tracking with image proof                      ║
║   • Load consolidation & return trip matching                 ║
║   • Dynamic pricing & fuel cost calculation                   ║
║   • VRP optimization via Google OR-Tools                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
