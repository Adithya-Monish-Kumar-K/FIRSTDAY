import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipmentStore, useNotificationStore } from '../store';
import { routesApi, pricingApi } from '../api';
import RouteMap from '../components/RouteMap';
import {
    Package, MapPin, Truck, Calendar, DollarSign,
    ArrowRight, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import './CreateShipment.css';

const CARGO_TYPES = [
    { value: 'general', label: 'General Cargo', icon: '📦' },
    { value: 'perishable', label: 'Perishable Goods', icon: '🥬' },
    { value: 'fragile', label: 'Fragile Items', icon: '🔮' },
    { value: 'hazardous', label: 'Hazardous Materials', icon: '⚠️' },
    { value: 'livestock', label: 'Livestock', icon: '🐄' },
    { value: 'heavy_machinery', label: 'Heavy Machinery', icon: '🏗️' }
];

const VEHICLE_TYPES = [
    { value: 'open', label: 'Open Truck', desc: 'For non-sensitive cargo' },
    { value: 'covered', label: 'Covered Truck', desc: 'Protected from weather' },
    { value: 'refrigerated', label: 'Refrigerated', desc: 'Temperature controlled' },
    { value: 'container', label: 'Container', desc: 'For large shipments' },
    { value: 'tanker', label: 'Tanker', desc: 'For liquids' },
    { value: 'flatbed', label: 'Flatbed', desc: 'For oversized cargo' }
];

export default function CreateShipment() {
    const navigate = useNavigate();
    const { createShipment, isLoading } = useShipmentStore();
    const { addNotification } = useNotificationStore();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        origin: null,
        destination: null,
        cargo_type: 'general',
        weight: '',
        volume: '',
        vehicle_type_required: 'covered',
        pickup_date: '',
        description: '',
        special_requirements: []
    });

    const [routeInfo, setRouteInfo] = useState(null);
    const [priceEstimate, setPriceEstimate] = useState(null);
    const [originAddress, setOriginAddress] = useState('');
    const [destAddress, setDestAddress] = useState('');

    const handleAddressSearch = async (type) => {
        const address = type === 'origin' ? originAddress : destAddress;
        if (!address) return;

        try {
            const response = await routesApi.geocode(address);
            if (response.data.results?.[0]) {
                const result = response.data.results[0];
                const location = {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    address: result.formatted_address
                };

                setFormData(prev => ({
                    ...prev,
                    [type]: location
                }));

                // Calculate route if both points exist
                if (type === 'origin' && formData.destination) {
                    calculateRoute(location, formData.destination);
                } else if (type === 'destination' && formData.origin) {
                    calculateRoute(formData.origin, location);
                }
            }
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to find address' });
        }
    };

    const calculateRoute = async (origin, destination) => {
        try {
            const response = await routesApi.getETA(origin, destination);
            setRouteInfo(response.data);
        } catch (error) {
            console.error('Route calculation failed:', error);
        }
    };

    const calculatePrice = async () => {
        if (!routeInfo || !formData.weight || !formData.vehicle_type_required) return;

        try {
            const response = await pricingApi.getShippingPrice(
                routeInfo.distance_km,
                formData.vehicle_type_required,
                formData.weight,
                formData.cargo_type,
                'normal'
            );
            setPriceEstimate(response.data);
        } catch (error) {
            console.error('Price calculation failed:', error);
        }
    };

    const handleSubmit = async () => {
        const result = await createShipment({
            ...formData,
            distance_km: routeInfo?.distance_km,
            estimated_duration_hours: routeInfo?.duration_hours
        });

        if (result.success) {
            addNotification({ type: 'success', message: 'Shipment created successfully!' });
            navigate('/my-shipments');
        } else {
            addNotification({ type: 'error', message: result.error || 'Failed to create shipment' });
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return formData.origin && formData.destination;
            case 2: return formData.weight && formData.cargo_type && formData.vehicle_type_required;
            case 3: return formData.pickup_date;
            default: return true;
        }
    };

    return (
        <div className="create-shipment">
            <div className="page-header">
                <h1>Create New Shipment</h1>
                <p>Fill in the details to post your shipment request</p>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
                {[
                    { num: 1, label: 'Route' },
                    { num: 2, label: 'Cargo' },
                    { num: 3, label: 'Schedule' },
                    { num: 4, label: 'Review' }
                ].map(({ num, label }) => (
                    <div
                        key={num}
                        className={`progress-step ${step >= num ? 'active' : ''} ${step === num ? 'current' : ''}`}
                        onClick={() => num < step && setStep(num)}
                    >
                        <div className="step-circle">
                            {step > num ? <CheckCircle size={18} /> : num}
                        </div>
                        <span className="step-label">{label}</span>
                    </div>
                ))}
            </div>

            <div className="form-container">
                <div className="form-main">
                    {/* Step 1: Route */}
                    {step === 1 && (
                        <div className="form-step animate-fadeIn">
                            <h2><MapPin size={24} /> Route Details</h2>
                            <p className="step-description">Enter pickup and delivery locations</p>

                            <div className="location-inputs">
                                <div className="input-group">
                                    <label>Pickup Location</label>
                                    <div className="address-input">
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Enter pickup address..."
                                            value={originAddress}
                                            onChange={(e) => setOriginAddress(e.target.value)}
                                            onBlur={() => handleAddressSearch('origin')}
                                        />
                                        {formData.origin && (
                                            <div className="address-confirmed">
                                                <CheckCircle size={16} />
                                                <span>{formData.origin.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Delivery Location</label>
                                    <div className="address-input">
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Enter delivery address..."
                                            value={destAddress}
                                            onChange={(e) => setDestAddress(e.target.value)}
                                            onBlur={() => handleAddressSearch('destination')}
                                        />
                                        {formData.destination && (
                                            <div className="address-confirmed">
                                                <CheckCircle size={16} />
                                                <span>{formData.destination.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {routeInfo && (
                                <div className="route-summary card">
                                    <div className="route-stat">
                                        <span className="route-stat-label">Distance</span>
                                        <span className="route-stat-value">{Math.round(routeInfo.distance_km)} km</span>
                                    </div>
                                    <div className="route-stat">
                                        <span className="route-stat-label">Est. Duration</span>
                                        <span className="route-stat-value">{Math.round(routeInfo.duration_hours * 10) / 10} hours</span>
                                    </div>
                                </div>
                            )}

                            <div className="map-preview">
                                <RouteMap
                                    height="350px"
                                    origin={formData.origin}
                                    destination={formData.destination}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Cargo */}
                    {step === 2 && (
                        <div className="form-step animate-fadeIn">
                            <h2><Package size={24} /> Cargo Details</h2>
                            <p className="step-description">Describe your cargo and requirements</p>

                            <div className="input-group">
                                <label>Cargo Type</label>
                                <div className="cargo-type-grid">
                                    {CARGO_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`cargo-type-btn ${formData.cargo_type === type.value ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, cargo_type: type.value })}
                                        >
                                            <span className="cargo-icon">{type.icon}</span>
                                            <span className="cargo-label">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label>Weight (tons)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="e.g., 5"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        min="0.1"
                                        step="0.1"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Volume (m³)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="e.g., 20"
                                        value={formData.volume}
                                        onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Vehicle Type Required</label>
                                <div className="vehicle-type-grid">
                                    {VEHICLE_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`vehicle-type-btn ${formData.vehicle_type_required === type.value ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, vehicle_type_required: type.value })}
                                        >
                                            <Truck size={20} />
                                            <span className="vehicle-label">{type.label}</span>
                                            <span className="vehicle-desc">{type.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    className="input textarea"
                                    placeholder="Add any additional details about your cargo..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Schedule */}
                    {step === 3 && (
                        <div className="form-step animate-fadeIn">
                            <h2><Calendar size={24} /> Schedule</h2>
                            <p className="step-description">Set your preferred pickup date</p>

                            <div className="input-group">
                                <label>Pickup Date</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.pickup_date}
                                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>

                            <div className="info-box">
                                <Info size={20} />
                                <div>
                                    <p><strong>Estimated Delivery Time</strong></p>
                                    <p>Based on the route and typical transit times, your cargo is expected to arrive approximately {Math.round((routeInfo?.duration_hours || 6) + 2)} hours after pickup.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <div className="form-step animate-fadeIn">
                            <h2><CheckCircle size={24} /> Review & Submit</h2>
                            <p className="step-description">Verify your shipment details before submitting</p>

                            <div className="review-sections">
                                <div className="review-section">
                                    <h3>Route</h3>
                                    <div className="review-item">
                                        <span className="review-label">From</span>
                                        <span className="review-value">{formData.origin?.address}</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">To</span>
                                        <span className="review-value">{formData.destination?.address}</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Distance</span>
                                        <span className="review-value">{Math.round(routeInfo?.distance_km || 0)} km</span>
                                    </div>
                                </div>

                                <div className="review-section">
                                    <h3>Cargo</h3>
                                    <div className="review-item">
                                        <span className="review-label">Type</span>
                                        <span className="review-value">{CARGO_TYPES.find(t => t.value === formData.cargo_type)?.label}</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Weight</span>
                                        <span className="review-value">{formData.weight} tons</span>
                                    </div>
                                    <div className="review-item">
                                        <span className="review-label">Vehicle</span>
                                        <span className="review-value">{VEHICLE_TYPES.find(t => t.value === formData.vehicle_type_required)?.label}</span>
                                    </div>
                                </div>

                                <div className="review-section">
                                    <h3>Schedule</h3>
                                    <div className="review-item">
                                        <span className="review-label">Pickup Date</span>
                                        <span className="review-value">{new Date(formData.pickup_date).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {priceEstimate && (
                                <div className="price-estimate card card-glow">
                                    <div className="price-header">
                                        <DollarSign size={24} />
                                        <span>Estimated Price</span>
                                    </div>
                                    <div className="price-range">
                                        <span className="price-min">₹{priceEstimate.suggested_price?.min?.toLocaleString()}</span>
                                        <span className="price-separator">-</span>
                                        <span className="price-max">₹{priceEstimate.suggested_price?.max?.toLocaleString()}</span>
                                    </div>
                                    <p className="price-note">Final price will be determined by the transporter</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="form-navigation">
                    {step > 1 && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStep(step - 1)}
                        >
                            Back
                        </button>
                    )}

                    {step < 4 ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!canProceed()}
                            onClick={() => {
                                if (step === 2) calculatePrice();
                                setStep(step + 1);
                            }}
                        >
                            Continue <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Shipment'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
