import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Current fuel prices (would typically be fetched from an API)
const FUEL_PRICES = {
    diesel: 89.50,  // INR per liter
    petrol: 102.50,
    cng: 76.00
};

// Average mileage by vehicle type (km per liter)
const VEHICLE_MILEAGE = {
    open: 6,
    covered: 5.5,
    refrigerated: 4.5,
    container: 4,
    tanker: 5,
    flatbed: 5
};

// Calculate fuel cost for a trip
router.post('/calculate', verifyToken, async (req, res) => {
    try {
        const {
            distance_km,
            vehicle_type,
            fuel_type = 'diesel',
            custom_mileage,
            custom_fuel_price,
            load_factor = 1 // 1 = full load, 0.5 = half load, etc.
        } = req.body;

        if (!distance_km || !vehicle_type) {
            return res.status(400).json({ error: 'Distance and vehicle type are required' });
        }

        const baseMileage = custom_mileage || VEHICLE_MILEAGE[vehicle_type] || 5;
        const fuelPrice = custom_fuel_price || FUEL_PRICES[fuel_type] || FUEL_PRICES.diesel;

        // Adjust mileage based on load factor (heavier load = worse mileage)
        const adjustedMileage = baseMileage * (1 - (load_factor * 0.2));

        const fuelRequired = distance_km / adjustedMileage;
        const fuelCost = fuelRequired * fuelPrice;

        // Additional costs
        const tollEstimate = distance_km * 1.5; // Rough estimate: 1.5 INR per km for tolls
        const driverAllowance = (distance_km / 300) * 500; // 500 INR per 300 km
        const maintenanceFactor = distance_km * 2; // 2 INR per km for maintenance

        const totalCost = fuelCost + tollEstimate + driverAllowance + maintenanceFactor;

        res.json({
            distance_km: parseFloat(distance_km),
            vehicle_type,
            fuel_type,
            fuel_price_per_liter: fuelPrice,
            mileage_kmpl: adjustedMileage,
            fuel_required_liters: Math.round(fuelRequired * 100) / 100,
            costs: {
                fuel: Math.round(fuelCost * 100) / 100,
                toll_estimate: Math.round(tollEstimate * 100) / 100,
                driver_allowance: Math.round(driverAllowance * 100) / 100,
                maintenance: Math.round(maintenanceFactor * 100) / 100,
                total: Math.round(totalCost * 100) / 100
            },
            per_km_cost: Math.round((totalCost / distance_km) * 100) / 100,
            currency: 'INR'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current fuel prices
router.get('/prices', (req, res) => {
    res.json({
        prices: FUEL_PRICES,
        last_updated: new Date().toISOString(),
        currency: 'INR',
        unit: 'per liter'
    });
});

// Get vehicle mileage data
router.get('/mileage', (req, res) => {
    res.json({
        mileage: VEHICLE_MILEAGE,
        unit: 'km per liter',
        note: 'Average mileage for empty/light load. Actual mileage may vary based on load, road conditions, and driving style.'
    });
});

// Calculate shipping price suggestion
router.post('/shipping-price', verifyToken, async (req, res) => {
    try {
        const {
            distance_km,
            vehicle_type,
            weight_tons,
            cargo_type,
            urgency = 'normal', // normal, express, overnight
            return_empty = true
        } = req.body;

        if (!distance_km || !vehicle_type || !weight_tons) {
            return res.status(400).json({ error: 'Distance, vehicle type, and weight are required' });
        }

        // Base rate per km per ton
        const baseRatePerKmTon = 8; // INR

        // Urgency multipliers
        const urgencyMultiplier = {
            normal: 1,
            express: 1.3,
            overnight: 1.5
        };

        // Cargo type multipliers
        const cargoMultiplier = {
            general: 1,
            perishable: 1.4,
            fragile: 1.3,
            hazardous: 1.6,
            livestock: 1.5,
            heavy_machinery: 1.2
        };

        // Vehicle type base rates
        const vehicleBaseRate = {
            open: 30,
            covered: 35,
            refrigerated: 50,
            container: 45,
            tanker: 55,
            flatbed: 40
        };

        const baseCost = distance_km * weight_tons * baseRatePerKmTon;
        const vehicleCost = vehicleBaseRate[vehicle_type] * distance_km;
        const cargoAdjustment = baseCost * ((cargoMultiplier[cargo_type] || 1) - 1);
        const urgencyAdjustment = baseCost * ((urgencyMultiplier[urgency] || 1) - 1);

        // If return empty, factor in return cost (usually 50% of one-way)
        const returnCost = return_empty ? (baseCost + vehicleCost) * 0.3 : 0;

        const subtotal = baseCost + vehicleCost + cargoAdjustment + urgencyAdjustment + returnCost;

        // Add profit margin (15-25%)
        const minPrice = subtotal * 1.15;
        const maxPrice = subtotal * 1.25;

        res.json({
            distance_km: parseFloat(distance_km),
            weight_tons: parseFloat(weight_tons),
            vehicle_type,
            cargo_type: cargo_type || 'general',
            urgency,
            breakdown: {
                base_cost: Math.round(baseCost),
                vehicle_cost: Math.round(vehicleCost),
                cargo_adjustment: Math.round(cargoAdjustment),
                urgency_adjustment: Math.round(urgencyAdjustment),
                return_cost: Math.round(returnCost),
                subtotal: Math.round(subtotal)
            },
            suggested_price: {
                min: Math.round(minPrice),
                max: Math.round(maxPrice),
                recommended: Math.round((minPrice + maxPrice) / 2)
            },
            per_km: Math.round(subtotal / distance_km),
            per_ton: Math.round(subtotal / weight_tons),
            currency: 'INR'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
