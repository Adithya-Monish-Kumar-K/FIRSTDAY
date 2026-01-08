import { useState, useEffect } from 'react';
import { useShipmentStore } from '../store';
import { checkpointsApi } from '../api';
import RouteMap from '../components/RouteMap';
import { MapPin, Package, Clock, Search, RefreshCw } from 'lucide-react';
import './Tracking.css';

export default function Tracking() {
    const { shipments, fetchShipments, isLoading } = useShipmentStore();
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [checkpoints, setCheckpoints] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchShipments();
    }, []);

    useEffect(() => {
        if (selectedShipment) {
            loadCheckpoints(selectedShipment.id);
        }
    }, [selectedShipment]);

    const loadCheckpoints = async (shipmentId) => {
        try {
            const response = await checkpointsApi.getShipmentCheckpoints(shipmentId);
            setCheckpoints(response.data);
        } catch (error) {
            console.error('Failed to load checkpoints:', error);
        }
    };

    const trackableShipments = shipments.filter(s =>
        ['accepted', 'picked_up', 'in_transit'].includes(s.status)
    );

    const filteredShipments = trackableShipments.filter(s => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return s.id.toLowerCase().includes(query) ||
            s.origin?.address?.toLowerCase().includes(query) ||
            s.destination?.address?.toLowerCase().includes(query);
    });

    return (
        <div className="tracking-page">
            <div className="page-header">
                <div>
                    <h1>Track Shipments</h1>
                    <p>Monitor your active shipments in real-time</p>
                </div>
                <button className="btn btn-ghost" onClick={() => fetchShipments()}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            <div className="tracking-grid">
                {/* Shipments List */}
                <div className="shipments-panel card">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : filteredShipments.length === 0 ? (
                        <div className="empty-state">
                            <Package size={48} />
                            <p>No active shipments to track</p>
                        </div>
                    ) : (
                        <div className="shipments-list">
                            {filteredShipments.map(shipment => (
                                <div
                                    key={shipment.id}
                                    className={`shipment-item ${selectedShipment?.id === shipment.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedShipment(shipment)}
                                >
                                    <div className="shipment-header">
                                        <span className="shipment-id">#{shipment.id.slice(0, 8)}</span>
                                        <span className={`status-dot ${shipment.status}`}></span>
                                    </div>
                                    <div className="shipment-route">
                                        <div className="route-point">
                                            <MapPin size={14} className="origin" />
                                            <span>{shipment.origin?.address?.split(',')[0] || 'Origin'}</span>
                                        </div>
                                        <div className="route-point">
                                            <MapPin size={14} className="destination" />
                                            <span>{shipment.destination?.address?.split(',')[0] || 'Destination'}</span>
                                        </div>
                                    </div>
                                    <div className="shipment-meta">
                                        <span><Package size={12} /> {shipment.weight} tons</span>
                                        <span><Clock size={12} /> {shipment.status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map & Details */}
                <div className="map-panel">
                    <div className="map-container card">
                        <RouteMap
                            height="100%"
                            origin={selectedShipment?.origin}
                            destination={selectedShipment?.destination}
                            checkpoints={checkpoints}
                        />
                    </div>

                    {selectedShipment && (
                        <div className="details-panel card">
                            <h3>Shipment #{selectedShipment.id.slice(0, 8)}</h3>

                            <div className="tracking-info">
                                <div className="info-item">
                                    <span className="label">Status</span>
                                    <span className={`status-badge ${selectedShipment.status}`}>
                                        {selectedShipment.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Cargo</span>
                                    <span className="value">{selectedShipment.cargo_type} - {selectedShipment.weight} tons</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Vehicle</span>
                                    <span className="value">{selectedShipment.vehicle_type_required}</span>
                                </div>
                            </div>

                            <div className="checkpoints-mini">
                                <h4>Recent Updates</h4>
                                {checkpoints.length === 0 ? (
                                    <p className="no-updates">No updates yet</p>
                                ) : (
                                    <div className="checkpoint-list">
                                        {checkpoints.slice(-3).reverse().map(cp => (
                                            <div key={cp.id} className="checkpoint-mini-item">
                                                <div className="checkpoint-dot"></div>
                                                <div className="checkpoint-info">
                                                    <span className="checkpoint-location">{cp.location}</span>
                                                    <span className="checkpoint-time">
                                                        {new Date(cp.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
