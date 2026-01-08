import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import {
    MapPin, Plus, Trash2, Navigation, Zap, Clock,
    Truck, ArrowRight, Shuffle, AlertCircle
} from 'lucide-react';
import './RoutePlanner.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px'
};

const defaultCenter = { lat: 13.0827, lng: 80.2707 }; // Chennai

const mapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
    { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
    { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023e58' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

export default function RoutePlanner() {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [waypoints, setWaypoints] = useState([]);
    const [originAddress, setOriginAddress] = useState('');
    const [destAddress, setDestAddress] = useState('');
    const [waypointInput, setWaypointInput] = useState('');
    const [directions, setDirections] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const mapRef = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: ['places', 'geometry']
    });

    const handleAddressSearch = async (type) => {
        const address = type === 'origin' ? originAddress : type === 'destination' ? destAddress : waypointInput;
        if (!address || !isLoaded) return;

        try {
            const geocoder = new window.google.maps.Geocoder();
            const result = await geocoder.geocode({ address });
            
            if (result.results?.[0]) {
                const location = result.results[0].geometry.location;
                const formattedAddress = result.results[0].formatted_address;
                const point = { 
                    lat: location.lat(), 
                    lng: location.lng(), 
                    address: formattedAddress 
                };

                if (type === 'origin') {
                    setOrigin(point);
                    setOriginAddress(formattedAddress);
                } else if (type === 'destination') {
                    setDestination(point);
                    setDestAddress(formattedAddress);
                } else if (type === 'waypoint') {
                    setWaypoints([...waypoints, point]);
                    setWaypointInput('');
                }
                setError(null);
            } else {
                setError(`Could not find address: ${address}`);
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
            setError('Geocoding failed. Please try again.');
        }
    };

    const calculateRoute = async (optimize = false) => {
        if (!origin || !destination || !isLoaded) return;

        setIsLoading(true);
        setError(null);
        
        try {
            const directionsService = new window.google.maps.DirectionsService();
            
            const waypointsRequest = waypoints.map(wp => ({
                location: wp,
                stopover: true
            }));

            const result = await directionsService.route({
                origin: origin,
                destination: destination,
                waypoints: waypointsRequest,
                optimizeWaypoints: optimize,
                travelMode: window.google.maps.TravelMode.DRIVING
            });

            if (result.status === 'OK') {
                setDirections(result);
                
                // Calculate total distance and duration
                const route = result.routes[0];
                let totalDist = 0;
                let totalDur = 0;
                
                route.legs.forEach(leg => {
                    totalDist += leg.distance.value;
                    totalDur += leg.duration.value;
                });

                setRouteInfo({
                    distance: {
                        text: (totalDist / 1000).toFixed(1) + ' km',
                        value: totalDist
                    },
                    duration: {
                        text: Math.round(totalDur / 60) + ' mins',
                        value: totalDur
                    },
                    legs: route.legs,
                    optimizedOrder: route.waypoint_order
                });
            } else {
                setError('Could not calculate route: ' + result.status);
            }
        } catch (error) {
            console.error('Route calculation failed:', error);
            setError('Route calculation failed. Please check your inputs.');
        } finally {
            setIsLoading(false);
        }
    };

    const removeWaypoint = (index) => {
        setWaypoints(waypoints.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (directions && mapRef.current) {
            const bounds = new window.google.maps.LatLngBounds();
            const route = directions.routes[0];
            
            // Extend bounds for start and end location
            if (route.legs[0].start_location) bounds.extend(route.legs[0].start_location);
            if (route.legs[0].end_location) bounds.extend(route.legs[0].end_location);
            
            // Extend bounds for all waypoints if any
            route.legs.forEach(leg => {
                leg.steps.forEach(step => {
                    bounds.extend(step.start_location);
                    bounds.extend(step.end_location);
                });
            });

            mapRef.current.fitBounds(bounds);
        }
    }, [directions]);

    if (loadError) return <div className="p-4 text-red-500">Error loading maps: {loadError.message}</div>;
    if (!isLoaded) return <div className="p-4 text-white">Loading Maps...</div>;

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

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

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
                                onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch('origin')}
                            />
                            <div className={`location-status ${origin ? 'success' : ''}`}></div>
                        </div>
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
                                onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch('destination')}
                            />
                            <div className={`location-status ${destination ? 'success' : ''}`}></div>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={() => calculateRoute(false)}
                            disabled={!origin || !destination || isLoading}
                        >
                            <ArrowRight size={18} />
                            {isLoading ? 'Calculating...' : 'Calculate Route'}
                        </button>
                        {waypoints.length > 0 && (
                            <button
                                className="btn btn-accent"
                                onClick={() => calculateRoute(true)}
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
                                        <span className="stat-value">{routeInfo.distance.text}</span>
                                        <span className="stat-label">Total Distance</span>
                                    </div>
                                </div>
                                <div className="summary-stat">
                                    <Clock size={20} />
                                    <div>
                                        <span className="stat-value">{routeInfo.duration.text}</span>
                                        <span className="stat-label">Est. Time</span>
                                    </div>
                                </div>
                            </div>
                            
                            {routeInfo.optimizedOrder && routeInfo.optimizedOrder.some((idx, i) => idx !== i) && (
                                <div className="optimized-badge">
                                    <Zap size={14} /> Optimized Sequence Applied
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Map Panel */}
                <div className="map-panel card">
                     <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={origin || defaultCenter}
                        zoom={origin ? 10 : 7}
                        options={{
                            styles: mapStyles,
                            disableDefaultUI: false,
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: true,
                        }}
                        onLoad={onMapLoad}
                    >
                        {origin && <Marker position={origin} label="A" />}
                        {destination && <Marker position={destination} label="B" />}
                        {waypoints.map((wp, i) => (
                            <Marker key={i} position={wp} label={`${i+1}`} />
                        ))}
                        
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: false,
                                    preserveViewport: false,
                                    polylineOptions: {
                                        strokeColor: '#6366f1',
                                        strokeWeight: 6,
                                        strokeOpacity: 0.9,
                                        zIndex: 50
                                    }
                                }}
                            />
                        )}
                    </GoogleMap>
                </div>
            </div>
        </div>
    );
}
