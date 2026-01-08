import express from 'express';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAP_API;

// Calculate route between two points
router.post('/directions', verifyToken, async (req, res) => {
    try {
        const { origin, destination, waypoints } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required' });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            // Return mock data when API key is not configured
            return res.json({
                status: 'OK',
                routes: [{
                    summary: 'Mock Route',
                    legs: [{
                        distance: { text: '350 km', value: 350000 },
                        duration: { text: '6 hours', value: 21600 },
                        start_address: origin.address || 'Start Point',
                        end_address: destination.address || 'End Point',
                        steps: []
                    }],
                    overview_polyline: { points: '' },
                    bounds: {
                        northeast: { lat: origin.lat + 0.1, lng: origin.lng + 0.1 },
                        southwest: { lat: destination.lat - 0.1, lng: destination.lng - 0.1 }
                    }
                }],
                geocoded_waypoints: []
            });
        }

        const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
        const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&key=${GOOGLE_MAPS_API_KEY}`;

        if (waypoints && waypoints.length > 0) {
            const waypointsStr = waypoints.map(wp =>
                typeof wp === 'string' ? wp : `${wp.lat},${wp.lng}`
            ).join('|');
            url += `&waypoints=optimize:true|${encodeURIComponent(waypointsStr)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            return res.status(400).json({ error: data.error_message || 'Failed to get directions' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate distance matrix
router.post('/distance-matrix', verifyToken, async (req, res) => {
    try {
        const { origins, destinations } = req.body;

        if (!origins?.length || !destinations?.length) {
            return res.status(400).json({ error: 'Origins and destinations are required' });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            // Return mock distance matrix
            const rows = origins.map((_, i) => ({
                elements: destinations.map((_, j) => ({
                    distance: { text: `${100 + i * 50 + j * 30} km`, value: (100 + i * 50 + j * 30) * 1000 },
                    duration: { text: `${2 + i + j} hours`, value: (2 + i + j) * 3600 },
                    status: 'OK'
                }))
            }));

            return res.json({
                status: 'OK',
                rows,
                origin_addresses: origins.map((o, i) => `Origin ${i + 1}`),
                destination_addresses: destinations.map((d, i) => `Destination ${i + 1}`)
            });
        }

        const originsStr = origins.map(o =>
            typeof o === 'string' ? o : `${o.lat},${o.lng}`
        ).join('|');
        const destsStr = destinations.map(d =>
            typeof d === 'string' ? d : `${d.lat},${d.lng}`
        ).join('|');

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destsStr)}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            return res.status(400).json({ error: data.error_message || 'Failed to calculate distance matrix' });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Geocode address
router.get('/geocode', verifyToken, async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            // Return mock geocode
            return res.json({
                status: 'OK',
                results: [{
                    formatted_address: address,
                    geometry: {
                        location: { lat: 13.0827, lng: 80.2707 }
                    },
                    place_id: 'mock_place_id'
                }]
            });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reverse geocode
router.get('/reverse-geocode', verifyToken, async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            return res.json({
                status: 'OK',
                results: [{
                    formatted_address: `Location at ${lat}, ${lng}`,
                    geometry: {
                        location: { lat: parseFloat(lat), lng: parseFloat(lng) }
                    }
                }]
            });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate estimated time of arrival
router.post('/eta', verifyToken, async (req, res) => {
    try {
        const { origin, destination, departure_time } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required' });
        }

        if (!GOOGLE_MAPS_API_KEY) {
            // Mock ETA calculation
            const distanceKm = 350; // Mock distance
            const avgSpeedKmh = 60;
            const durationHours = distanceKm / avgSpeedKmh;
            const handoffTimeHours = 0.5; // 30 min per handoff

            const departureDate = departure_time ? new Date(departure_time) : new Date();
            const arrivalDate = new Date(departureDate.getTime() + (durationHours + handoffTimeHours) * 3600000);

            return res.json({
                distance_km: distanceKm,
                duration_hours: durationHours,
                estimated_arrival: arrivalDate.toISOString(),
                departure_time: departureDate.toISOString()
            });
        }

        const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
        const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&key=${GOOGLE_MAPS_API_KEY}`;

        if (departure_time) {
            const departureTimestamp = Math.floor(new Date(departure_time).getTime() / 1000);
            url += `&departure_time=${departureTimestamp}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' || !data.routes.length) {
            return res.status(400).json({ error: 'Failed to calculate ETA' });
        }

        const route = data.routes[0];
        const leg = route.legs[0];
        const durationSeconds = leg.duration_in_traffic?.value || leg.duration.value;
        const departureDate = departure_time ? new Date(departure_time) : new Date();
        const arrivalDate = new Date(departureDate.getTime() + durationSeconds * 1000);

        res.json({
            distance_km: leg.distance.value / 1000,
            duration_hours: durationSeconds / 3600,
            estimated_arrival: arrivalDate.toISOString(),
            departure_time: departureDate.toISOString(),
            traffic_duration_seconds: leg.duration_in_traffic?.value || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
