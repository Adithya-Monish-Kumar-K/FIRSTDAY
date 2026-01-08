import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { useState, useCallback, useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
};

// Color palette for different transporters
const TRANSPORTER_COLORS = [
    '#6366f1', // Primary
    '#d946ef', // Accent
    '#10b981', // Success
    '#f59e0b', // Warning
    '#ef4444', // Error
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
];

export default function RouteMap({
    origin,
    destination,
    waypoints = [],
    checkpoints = [],
    routes = [],
    onMapClick,
    showMarkers = true,
    fitBounds = true,
    height = '500px'
}) {
    const [map, setMap] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);

    const onLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Fit bounds to show all markers
    useEffect(() => {
        if (map && fitBounds) {
            const bounds = new window.google.maps.LatLngBounds();
            let hasPoints = false;

            if (origin) {
                bounds.extend(origin);
                hasPoints = true;
            }
            if (destination) {
                bounds.extend(destination);
                hasPoints = true;
            }
            waypoints.forEach(wp => {
                bounds.extend(wp);
                hasPoints = true;
            });
            checkpoints.forEach(cp => {
                if (cp.lat && cp.lng) {
                    bounds.extend({ lat: cp.lat, lng: cp.lng });
                    hasPoints = true;
                }
            });
            routes.forEach(route => {
                route.path?.forEach(point => {
                    bounds.extend(point);
                    hasPoints = true;
                });
            });

            if (hasPoints) {
                map.fitBounds(bounds, { padding: 50 });
            }
        }
    }, [map, origin, destination, waypoints, checkpoints, routes, fitBounds]);

    const handleMapClick = (e) => {
        if (onMapClick) {
            onMapClick({
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
            });
        }
    };

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="map-placeholder" style={{ height }}>
                <div className="map-placeholder-content">
                    <p>🗺️ Map Preview</p>
                    <p className="text-sm">Configure VITE_GOOGLE_MAPS_API_KEY to enable maps</p>
                    {origin && destination && (
                        <div className="route-info">
                            <p><strong>Origin:</strong> {origin.address || `${origin.lat}, ${origin.lng}`}</p>
                            <p><strong>Destination:</strong> {destination.address || `${destination.lat}, ${destination.lng}`}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height }}>
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={origin || defaultCenter}
                    zoom={10}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                        styles: mapStyles,
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: true,
                    }}
                >
                    {/* Origin Marker */}
                    {showMarkers && origin && (
                        <Marker
                            position={origin}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 12,
                                fillColor: '#10b981',
                                fillOpacity: 1,
                                strokeColor: '#fff',
                                strokeWeight: 3,
                            }}
                            onClick={() => setSelectedMarker({ type: 'origin', ...origin })}
                        />
                    )}

                    {/* Destination Marker */}
                    {showMarkers && destination && (
                        <Marker
                            position={destination}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 12,
                                fillColor: '#ef4444',
                                fillOpacity: 1,
                                strokeColor: '#fff',
                                strokeWeight: 3,
                            }}
                            onClick={() => setSelectedMarker({ type: 'destination', ...destination })}
                        />
                    )}

                    {/* Waypoint Markers */}
                    {showMarkers && waypoints.map((wp, index) => (
                        <Marker
                            key={`waypoint-${index}`}
                            position={wp}
                            label={{
                                text: `${index + 1}`,
                                color: '#fff',
                                fontWeight: 'bold',
                            }}
                            onClick={() => setSelectedMarker({ type: 'waypoint', index, ...wp })}
                        />
                    ))}

                    {/* Checkpoint Markers */}
                    {showMarkers && checkpoints.map((cp, index) => (
                        cp.lat && cp.lng && (
                            <Marker
                                key={`checkpoint-${index}`}
                                position={{ lat: cp.lat, lng: cp.lng }}
                                icon={{
                                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                                    scale: 6,
                                    fillColor: cp.is_handoff ? '#d946ef' : '#6366f1',
                                    fillOpacity: 1,
                                    strokeColor: '#fff',
                                    strokeWeight: 2,
                                    rotation: 0,
                                }}
                                onClick={() => setSelectedMarker({ type: 'checkpoint', ...cp })}
                            />
                        )
                    ))}

                    {/* Route Polylines */}
                    {routes.map((route, index) => (
                        <Polyline
                            key={`route-${index}`}
                            path={route.path}
                            options={{
                                strokeColor: route.color || TRANSPORTER_COLORS[index % TRANSPORTER_COLORS.length],
                                strokeOpacity: 0.8,
                                strokeWeight: 5,
                            }}
                        />
                    ))}

                    {/* Simple route line if no routes but origin/destination exist */}
                    {routes.length === 0 && origin && destination && (
                        <Polyline
                            path={[origin, ...waypoints, destination]}
                            options={{
                                strokeColor: '#6366f1',
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                geodesic: true,
                            }}
                        />
                    )}

                    {/* Info Window */}
                    {selectedMarker && (
                        <InfoWindow
                            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div className="info-window">
                                {selectedMarker.type === 'origin' && (
                                    <>
                                        <h4>📍 Origin</h4>
                                        <p>{selectedMarker.address || 'Starting Point'}</p>
                                    </>
                                )}
                                {selectedMarker.type === 'destination' && (
                                    <>
                                        <h4>🎯 Destination</h4>
                                        <p>{selectedMarker.address || 'End Point'}</p>
                                    </>
                                )}
                                {selectedMarker.type === 'waypoint' && (
                                    <>
                                        <h4>📌 Waypoint {selectedMarker.index + 1}</h4>
                                        <p>{selectedMarker.address || `Stop ${selectedMarker.index + 1}`}</p>
                                    </>
                                )}
                                {selectedMarker.type === 'checkpoint' && (
                                    <>
                                        <h4>{selectedMarker.is_handoff ? '🔄 Handoff Point' : '📍 Checkpoint'}</h4>
                                        <p><strong>Location:</strong> {selectedMarker.location}</p>
                                        <p><strong>Status:</strong> {selectedMarker.status}</p>
                                        <p><strong>Time:</strong> {new Date(selectedMarker.timestamp).toLocaleString()}</p>
                                    </>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </LoadScript>
        </div>
    );
}

// Styles for the map placeholder
const placeholderStyles = `
.map-placeholder {
  background: var(--dark-surface);
  border: 2px dashed var(--dark-border);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.map-placeholder-content {
  color: var(--dark-text-secondary);
}

.map-placeholder-content p:first-child {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

.route-info {
  margin-top: var(--space-4);
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

.info-window {
  color: #333;
  padding: 8px;
}

.info-window h4 {
  color: #333;
  margin-bottom: 4px;
}

.info-window p {
  color: #666;
  margin: 2px 0;
  font-size: 13px;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = placeholderStyles;
    document.head.appendChild(style);
}
