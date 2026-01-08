import { useState } from 'react';
import { pricingApi, routesApi } from '../api';
import { DollarSign, Truck, Fuel, MapPin, Calculator, Info } from 'lucide-react';
import './Pricing.css';

const VEHICLE_TYPES = [
    { value: 'open', label: 'Open Truck' },
    { value: 'covered', label: 'Covered Truck' },
    { value: 'refrigerated', label: 'Refrigerated' },
    { value: 'container', label: 'Container' },
    { value: 'tanker', label: 'Tanker' },
    { value: 'flatbed', label: 'Flatbed' }
];

const CARGO_TYPES = [
    { value: 'general', label: 'General Cargo' },
    { value: 'perishable', label: 'Perishable Goods' },
    { value: 'fragile', label: 'Fragile Items' },
    { value: 'hazardous', label: 'Hazardous Materials' },
    { value: 'livestock', label: 'Livestock' },
    { value: 'heavy_machinery', label: 'Heavy Machinery' }
];

export default function Pricing() {
    const [mode, setMode] = useState('shipping'); // 'shipping' or 'fuel'
    const [formData, setFormData] = useState({
        distance_km: '',
        weight_tons: '',
        vehicle_type: 'covered',
        cargo_type: 'general',
        urgency: 'normal',
        fuel_type: 'diesel',
        load_factor: 1
    });
    const [result, setResult] = useState(null);
    const [fuelPrices, setFuelPrices] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [originAddress, setOriginAddress] = useState('');
    const [destAddress, setDestAddress] = useState('');

    const handleCalculateDistance = async () => {
        if (!originAddress || !destAddress) return;

        setIsLoading(true);
        try {
            const originRes = await routesApi.geocode(originAddress);
            const destRes = await routesApi.geocode(destAddress);

            if (originRes.data.results?.[0] && destRes.data.results?.[0]) {
                const origin = originRes.data.results[0].geometry.location;
                const dest = destRes.data.results[0].geometry.location;

                const etaRes = await routesApi.getETA(origin, dest);
                setFormData(prev => ({
                    ...prev,
                    distance_km: Math.round(etaRes.data.distance_km)
                }));
            }
        } catch (error) {
            console.error('Distance calculation failed:', error);
        }
        setIsLoading(false);
    };

    const handleCalculate = async () => {
        if (!formData.distance_km) return;

        setIsLoading(true);
        try {
            if (mode === 'shipping') {
                const response = await pricingApi.getShippingPrice(
                    formData.distance_km,
                    formData.vehicle_type,
                    formData.weight_tons || 1,
                    formData.cargo_type,
                    formData.urgency
                );
                setResult(response.data);
            } else {
                const response = await pricingApi.calculateFuelCost(
                    formData.distance_km,
                    formData.vehicle_type,
                    formData.fuel_type,
                    formData.load_factor
                );
                setResult(response.data);
            }
        } catch (error) {
            console.error('Calculation failed:', error);
        }
        setIsLoading(false);
    };

    const loadFuelPrices = async () => {
        try {
            const response = await pricingApi.getFuelPrices();
            setFuelPrices(response.data);
        } catch (error) {
            console.error('Failed to load fuel prices:', error);
        }
    };

    useState(() => {
        loadFuelPrices();
    }, []);

    return (
        <div className="pricing-page">
            <div className="page-header">
                <div>
                    <h1>Price Calculator</h1>
                    <p>Estimate shipping costs and fuel expenses</p>
                </div>
            </div>

            <div className="pricing-grid">
                {/* Calculator */}
                <div className="calculator-panel card">
                    {/* Mode Tabs */}
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${mode === 'shipping' ? 'active' : ''}`}
                            onClick={() => { setMode('shipping'); setResult(null); }}
                        >
                            <DollarSign size={18} />
                            Shipping Price
                        </button>
                        <button
                            className={`mode-tab ${mode === 'fuel' ? 'active' : ''}`}
                            onClick={() => { setMode('fuel'); setResult(null); }}
                        >
                            <Fuel size={18} />
                            Fuel Cost
                        </button>
                    </div>

                    {/* Distance Input */}
                    <div className="distance-section">
                        <h3><MapPin size={18} /> Calculate Distance</h3>
                        <div className="address-inputs">
                            <input
                                type="text"
                                className="input"
                                placeholder="From address..."
                                value={originAddress}
                                onChange={(e) => setOriginAddress(e.target.value)}
                            />
                            <input
                                type="text"
                                className="input"
                                placeholder="To address..."
                                value={destAddress}
                                onChange={(e) => setDestAddress(e.target.value)}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={handleCalculateDistance}
                                disabled={isLoading}
                            >
                                Get Distance
                            </button>
                        </div>
                        <div className="divider-text">or enter manually</div>
                        <div className="input-group">
                            <label>Distance (km)</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="e.g., 350"
                                value={formData.distance_km}
                                onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Common Fields */}
                    <div className="input-group">
                        <label>Vehicle Type</label>
                        <select
                            className="input select"
                            value={formData.vehicle_type}
                            onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                        >
                            {VEHICLE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shipping-specific fields */}
                    {mode === 'shipping' && (
                        <>
                            <div className="input-group">
                                <label>Cargo Weight (tons)</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="e.g., 5"
                                    value={formData.weight_tons}
                                    onChange={(e) => setFormData({ ...formData, weight_tons: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label>Cargo Type</label>
                                <select
                                    className="input select"
                                    value={formData.cargo_type}
                                    onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                                >
                                    {CARGO_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Urgency</label>
                                <div className="urgency-options">
                                    {['normal', 'express', 'overnight'].map(urgency => (
                                        <button
                                            key={urgency}
                                            type="button"
                                            className={`urgency-btn ${formData.urgency === urgency ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, urgency })}
                                        >
                                            {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                                            {urgency === 'express' && <span className="urgency-mult">+30%</span>}
                                            {urgency === 'overnight' && <span className="urgency-mult">+50%</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Fuel-specific fields */}
                    {mode === 'fuel' && (
                        <>
                            <div className="input-group">
                                <label>Fuel Type</label>
                                <div className="fuel-options">
                                    {['diesel', 'petrol', 'cng'].map(fuel => (
                                        <button
                                            key={fuel}
                                            type="button"
                                            className={`fuel-btn ${formData.fuel_type === fuel ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, fuel_type: fuel })}
                                        >
                                            {fuel.toUpperCase()}
                                            {fuelPrices?.prices?.[fuel] && (
                                                <span className="fuel-price">₹{fuelPrices.prices[fuel]}/L</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Load Factor: {Math.round(formData.load_factor * 100)}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={formData.load_factor}
                                    onChange={(e) => setFormData({ ...formData, load_factor: parseFloat(e.target.value) })}
                                    className="slider"
                                />
                                <div className="slider-labels">
                                    <span>Empty</span>
                                    <span>Full Load</span>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        className="btn btn-primary btn-lg calculate-btn"
                        onClick={handleCalculate}
                        disabled={!formData.distance_km || isLoading}
                    >
                        <Calculator size={20} />
                        {isLoading ? 'Calculating...' : 'Calculate Price'}
                    </button>
                </div>

                {/* Result Panel */}
                <div className="result-panel">
                    {result ? (
                        <div className="result-card card">
                            <h2>{mode === 'shipping' ? 'Shipping Price Estimate' : 'Fuel Cost Estimate'}</h2>

                            {mode === 'shipping' ? (
                                <>
                                    <div className="price-display">
                                        <span className="price-label">Suggested Price Range</span>
                                        <div className="price-range">
                                            <span className="price-min">₹{result.suggested_price?.min?.toLocaleString()}</span>
                                            <span className="price-sep">–</span>
                                            <span className="price-max">₹{result.suggested_price?.max?.toLocaleString()}</span>
                                        </div>
                                        <span className="recommended">
                                            Recommended: ₹{result.suggested_price?.recommended?.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="breakdown">
                                        <h4>Cost Breakdown</h4>
                                        <div className="breakdown-item">
                                            <span>Base Cost</span>
                                            <span>₹{result.breakdown?.base_cost?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Vehicle Cost</span>
                                            <span>₹{result.breakdown?.vehicle_cost?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Cargo Adjustment</span>
                                            <span>₹{result.breakdown?.cargo_adjustment?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Urgency Adjustment</span>
                                            <span>₹{result.breakdown?.urgency_adjustment?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Return Trip Factor</span>
                                            <span>₹{result.breakdown?.return_cost?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item total">
                                            <span>Subtotal</span>
                                            <span>₹{result.breakdown?.subtotal?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="per-unit">
                                        <span>₹{result.per_km}/km</span>
                                        <span>₹{result.per_ton}/ton</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="price-display">
                                        <span className="price-label">Total Estimated Cost</span>
                                        <div className="single-price">
                                            ₹{result.costs?.total?.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="breakdown">
                                        <h4>Cost Breakdown</h4>
                                        <div className="breakdown-item">
                                            <span>Fuel ({result.fuel_required_liters} L @ ₹{result.fuel_price_per_liter}/L)</span>
                                            <span>₹{result.costs?.fuel?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Toll Estimate</span>
                                            <span>₹{result.costs?.toll_estimate?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Driver Allowance</span>
                                            <span>₹{result.costs?.driver_allowance?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span>Maintenance Factor</span>
                                            <span>₹{result.costs?.maintenance?.toLocaleString()}</span>
                                        </div>
                                        <div className="breakdown-item total">
                                            <span>Total</span>
                                            <span>₹{result.costs?.total?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="fuel-stats">
                                        <div className="fuel-stat">
                                            <Fuel size={18} />
                                            <span>{result.fuel_required_liters} liters</span>
                                        </div>
                                        <div className="fuel-stat">
                                            <Truck size={18} />
                                            <span>{result.mileage_kmpl} km/L</span>
                                        </div>
                                        <div className="fuel-stat">
                                            <DollarSign size={18} />
                                            <span>₹{result.per_km_cost}/km</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="disclaimer">
                                <Info size={16} />
                                <span>
                                    This is an estimate. Actual costs may vary based on road conditions,
                                    traffic, and other factors.
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="result-placeholder card">
                            <Calculator size={64} />
                            <h3>Enter details to calculate</h3>
                            <p>Fill in the form and click calculate to see the estimated price</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
