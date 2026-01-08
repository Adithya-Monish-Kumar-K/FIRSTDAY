import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth-storage');
        if (token) {
            try {
                const parsed = JSON.parse(token);
                if (parsed.state?.token) {
                    config.headers.Authorization = `Bearer ${parsed.state.token}`;
                }
            } catch (e) {
                // Invalid token format
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth on 401
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// API helper functions
export const routesApi = {
    getDirections: (origin, destination, waypoints) =>
        api.post('/routes/directions', { origin, destination, waypoints }),

    getDistanceMatrix: (origins, destinations) =>
        api.post('/routes/distance-matrix', { origins, destinations }),

    geocode: (address) =>
        api.get('/routes/geocode', { params: { address } }),

    reverseGeocode: (lat, lng) =>
        api.get('/routes/reverse-geocode', { params: { lat, lng } }),

    getETA: (origin, destination, departureTime) =>
        api.post('/routes/eta', { origin, destination, departure_time: departureTime }),
};

export const pricingApi = {
    calculateFuelCost: (distanceKm, vehicleType, fuelType, loadFactor) =>
        api.post('/pricing/calculate', {
            distance_km: distanceKm,
            vehicle_type: vehicleType,
            fuel_type: fuelType,
            load_factor: loadFactor
        }),

    getShippingPrice: (distanceKm, vehicleType, weightTons, cargoType, urgency) =>
        api.post('/pricing/shipping-price', {
            distance_km: distanceKm,
            vehicle_type: vehicleType,
            weight_tons: weightTons,
            cargo_type: cargoType,
            urgency
        }),

    getFuelPrices: () => api.get('/pricing/prices'),
};

export const checkpointsApi = {
    getShipmentCheckpoints: (shipmentId) =>
        api.get(`/checkpoints/shipment/${shipmentId}`),

    addCheckpoint: (formData) =>
        api.post('/checkpoints', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    recordHandoff: (formData) =>
        api.post('/checkpoints/handoff', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    getLatestCheckpoint: (shipmentId) =>
        api.get(`/checkpoints/latest/${shipmentId}`),
};

export const ratingsApi = {
    getUserRatings: (userId) => api.get(`/ratings/user/${userId}`),
    getShipmentRatings: (shipmentId) => api.get(`/ratings/shipment/${shipmentId}`),
    createRating: (ratingData) => api.post('/ratings', ratingData),
    getMyRatings: () => api.get('/ratings/my-ratings'),
};

export const returnTripsApi = {
    getAvailable: (params) =>
        api.get('/return-trips/available', { params }),
    create: (tripData) => api.post('/return-trips', tripData),
    getMyTrips: () => api.get('/return-trips/my-trips'),
    matchWithShipment: (matchData) => api.post('/return-trips/match', matchData),
    update: (id, tripData) => api.put(`/return-trips/${id}`, tripData),
    delete: (id) => api.delete(`/return-trips/${id}`),
};

export const optimizeApi = {
    solveVRP: (vrpData) => api.post('/optimize/vrp', vrpData),
    optimizeOrder: (origin, destinations, returnToOrigin) =>
        api.post('/optimize/optimize-order', {
            origin,
            destinations,
            return_to_origin: returnToOrigin
        }),
    matchRoutes: (shipments, availableRoutes) =>
        api.post('/optimize/match-routes', { shipments, available_routes: availableRoutes }),
    
    // Chain optimization - multi-transporter routing
    chainOptimize: (origin, destination, productType, shipments, urgencyMultiplier = 1) =>
        api.post('/optimize/chain', {
            origin,
            destination,
            product_type: productType,
            urgency_multiplier: urgencyMultiplier,
            shipments
        }),
    
    // Health check
    health: () => api.get('/optimize/health'),
};

// Notifications API
export const notificationsApi = {
    getAll: () => api.get('/notifications'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

// Route Legs API
export const routeLegsApi = {
    getForShipment: (shipmentId) => api.get(`/route-legs/shipment/${shipmentId}`),
    getAvailable: () => api.get('/route-legs/available'),
    getMyLegs: () => api.get('/route-legs/my-legs'),
    create: (data) => api.post('/route-legs', data),
    accept: (id) => api.post(`/route-legs/${id}/accept`),
    start: (id) => api.post(`/route-legs/${id}/start`),
    complete: (id, data) => api.post(`/route-legs/${id}/complete`, data),
};

// Admin API
export const adminApi = {
    getAllUsers: () => api.get('/auth/users'),
    getAllShipments: () => api.get('/shipments/all'),
    getStats: () => api.get('/admin/stats'),
};

