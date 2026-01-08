import { useState } from 'react';
import { routesApi, optimizeApi } from '../api';
import RouteMap from '../components/RouteMap';
import {
    MapPin, Plus, Trash2, Navigation, Zap, Clock,
    Truck, ArrowRight, Shuffle
} from 'lucide-react';
import './RoutePlanner.css';

export default function RoutePlanner() {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [waypoints, setWaypoints] = useState([]);
    const [originAddress, setOriginAddress] = useState('');
    const [destAddress, setDestAddress] = useState('');
    const [waypointInput, setWaypointInput] = useState('');
    const [routeInfo, setRouteInfo] = useState(null);
    const [optimizedRoute, setOptimizedRoute] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAddressSearch = async (type) => {
        const address = type === 'origin' ? originAddress : type === 'destination' ? destAddress : waypointInput;
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

                if (type === 'origin') {
                    setOrigin(location);
                } else if (type === 'destination') {
                    setDestination(location);
                } else if (type === 'waypoint') {
                    setWaypoints([...waypoints, location]);
                    setWaypointInput('');
                }
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
    };

    const handleCalculateRoute = async () => {
        if (!origin || !destination) return;

        setIsLoading(true);
        try {
            const response = await routesApi.getDirections(origin, destination, waypoints);
            setRouteInfo(response.data.routes?.[0]);
        } catch (error) {
            console.error('Route calculation failed:', error);
        }
        setIsLoading(false);
    };

    const handleOptimizeRoute = async () => {
        if (!origin || waypoints.length === 0) return;

        setIsLoading(true);
        try {
            const destinations = destination ? [...waypoints, destination] : waypoints;
            const response = await optimizeApi.optimizeOrder(origin, destinations, true);
            setOptimizedRoute(response.data);
        } catch (error) {
            console.error('Optimization failed:', error);
        }
        setIsLoading(false);
    };

    const removeWaypoint = (index) => {
        setWaypoints(waypoints.filter((_, i) => i !== index));
    };

    return (
        <div className="route-planner">
            <div className="page-header">
                <div>
                    <h1>Route Planner</h1>
                    <p>Plan and optimize your delivery routes</p>
                </div>
            </div>

            <div className="planner-grid">
                {/* Input Panel */}
                <div className="input-panel card">
                    <h3><Navigation size={20} /> Plan Your Route</h3>

                    <div className="input-group">
                        <label>Start Location</label>
                        <div className="location-input">
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter start address..."
                                value={originAddress}
                                onChange={(e) => setOriginAddress(e.target.value)}
                                onBlur={() => handleAddressSearch('origin')}
                            />
                            <div className="location-marker origin"></div>
                        </div>
                        {origin && <span className="confirmed-address">{origin.address}</span>}
                    </div>

                    <div className="waypoints-section">
                        <label>Stops (Optional)</label>
                        {waypoints.map((wp, index) => (
                            <div key={index} className="waypoint-item">
                                <span className="waypoint-number">{index + 1}</span>
                                <span className="waypoint-address">{wp.address}</span>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeWaypoint(index)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <div className="location-input">
                            <input
                                type="text"
                                className="input"
                                placeholder="Add a stop..."
                                value={waypointInput}
                                onChange={(e) => setWaypointInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch('waypoint')}
                            />
                            <button className="btn btn-ghost btn-icon" onClick={() => handleAddressSearch('waypoint')}>
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>End Location</label>
                        <div className="location-input">
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter destination address..."
                                value={destAddress}
                                onChange={(e) => setDestAddress(e.target.value)}
                                onBlur={() => handleAddressSearch('destination')}
                            />
                            <div className="location-marker destination"></div>
                        </div>
                        {destination && <span className="confirmed-address">{destination.address}</span>}
                    </div>

                    <div className="action-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={handleCalculateRoute}
                            disabled={!origin || !destination || isLoading}
                        >
                            <ArrowRight size={18} />
                            Calculate Route
                        </button>
                        {waypoints.length > 0 && (
                            <button
                                className="btn btn-accent"
                                onClick={handleOptimizeRoute}
                                disabled={isLoading}
                            >
                                <Zap size={18} />
                                Optimize Order
                            </button>
                        )}
                    </div>

                    {/* Route Summary */}
                    {routeInfo && (
                        <div className="route-summary">
                            <h4>Route Summary</h4>
                            <div className="summary-stats">
                                <div className="summary-stat">
                                    <Truck size={20} />
                                    <div>
                                        <span className="stat-value">{routeInfo.legs?.[0]?.distance?.text || 'N/A'}</span>
                                        <span className="stat-label">Distance</span>
                                    </div>
                                </div>
                                <div className="summary-stat">
                                    <Clock size={20} />
                                    <div>
                                        <span className="stat-value">{routeInfo.legs?.[0]?.duration?.text || 'N/A'}</span>
                                        <span className="stat-label">Duration</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Optimized Route */}
                    {optimizedRoute && (
                        <div className="optimized-result">
                            <h4><Shuffle size={18} /> Optimized Route</h4>
                            <p className="savings">
                                {optimizedRoute.savings_percentage > 0
                                    ? `🎉 Saves ${optimizedRoute.savings_percentage}% distance!`
                                    : 'Current order is optimal'
                                }
                            </p>
                            <div className="optimized-stops">
                                {optimizedRoute.optimized_route?.map((stop, index) => (
                                    <div key={index} className="optimized-stop">
                                        <span className="stop-number">{index + 1}</span>
                                        <span className="stop-address">{stop.address}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="optimized-stats">
                                <span>Total: {Math.round(optimizedRoute.total_distance_km)} km</span>
                                <span>~{optimizedRoute.estimated_time_hours} hours</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Map Panel */}
                <div className="map-panel card">
                    <RouteMap
                        height="100%"
                        origin={origin}
                        destination={destination}
                        waypoints={waypoints}
                    />
                </div>
            </div>
        </div>
    );
}
