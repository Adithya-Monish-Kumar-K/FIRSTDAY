import { useEffect, useState } from 'react';
import { useShipmentStore, useVehicleStore, useNotificationStore } from '../store';
import RouteMap from '../components/RouteMap';
import {
    Package, MapPin, Truck, DollarSign, Clock, Filter,
    Search, ChevronDown, Eye, Check
} from 'lucide-react';
import './AvailableShipments.css';

const VEHICLE_TYPES = ['all', 'open', 'covered', 'refrigerated', 'container', 'tanker', 'flatbed'];

export default function AvailableShipments() {
    const { shipments, fetchAvailableShipments, acceptShipment, isLoading } = useShipmentStore();
    const { vehicles, fetchVehicles } = useVehicleStore();
    const { addNotification } = useNotificationStore();

    const [filters, setFilters] = useState({
        vehicle_type: 'all',
        min_weight: '',
        max_weight: '',
        search: ''
    });
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [proposedPrice, setProposedPrice] = useState('');

    useEffect(() => {
        fetchAvailableShipments();
        fetchVehicles();
    }, []);

    const filteredShipments = shipments.filter(shipment => {
        if (filters.vehicle_type !== 'all' && shipment.vehicle_type_required !== filters.vehicle_type) {
            return false;
        }
        if (filters.min_weight && shipment.weight < parseFloat(filters.min_weight)) {
            return false;
        }
        if (filters.max_weight && shipment.weight > parseFloat(filters.max_weight)) {
            return false;
        }
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesOrigin = shipment.origin?.address?.toLowerCase().includes(searchLower);
            const matchesDest = shipment.destination?.address?.toLowerCase().includes(searchLower);
            if (!matchesOrigin && !matchesDest) return false;
        }
        return true;
    });

    const handleAccept = async () => {
        if (!selectedVehicle) {
            addNotification({ type: 'error', message: 'Please select a vehicle' });
            return;
        }

        const result = await acceptShipment(
            selectedShipment.id,
            selectedVehicle,
            proposedPrice ? parseFloat(proposedPrice) : null
        );

        if (result.success) {
            addNotification({ type: 'success', message: 'Shipment accepted successfully!' });
            setShowAcceptModal(false);
            setSelectedShipment(null);
            fetchAvailableShipments();
        } else {
            addNotification({ type: 'error', message: result.error || 'Failed to accept shipment' });
        }
    };

    // Get compatible vehicles
    const compatibleVehicles = vehicles.filter(v => {
        if (!selectedShipment) return true;
        return v.type === selectedShipment.vehicle_type_required &&
            v.status === 'available' &&
            v.capacity_tons >= selectedShipment.weight;
    });

    return (
        <div className="available-shipments">
            <div className="page-header">
                <div>
                    <h1>Available Shipments</h1>
                    <p>Find and accept loads that match your route</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar card">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by location..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="filter-group">
                    <label>Vehicle Type</label>
                    <select
                        className="input select"
                        value={filters.vehicle_type}
                        onChange={(e) => setFilters({ ...filters, vehicle_type: e.target.value })}
                    >
                        {VEHICLE_TYPES.map(type => (
                            <option key={type} value={type}>
                                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Weight Range (tons)</label>
                    <div className="range-inputs">
                        <input
                            type="number"
                            className="input"
                            placeholder="Min"
                            value={filters.min_weight}
                            onChange={(e) => setFilters({ ...filters, min_weight: e.target.value })}
                        />
                        <span>-</span>
                        <input
                            type="number"
                            className="input"
                            placeholder="Max"
                            value={filters.max_weight}
                            onChange={(e) => setFilters({ ...filters, max_weight: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFilters({ vehicle_type: 'all', min_weight: '', max_weight: '', search: '' })}
                >
                    Clear Filters
                </button>
            </div>

            <div className="content-grid">
                {/* Shipments List */}
                <div className="shipments-list">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading shipments...</p>
                        </div>
                    ) : filteredShipments.length === 0 ? (
                        <div className="empty-state card">
                            <Package size={48} />
                            <h3>No shipments found</h3>
                            <p>Try adjusting your filters or check back later</p>
                        </div>
                    ) : (
                        filteredShipments.map(shipment => (
                            <div
                                key={shipment.id}
                                className={`shipment-card card ${selectedShipment?.id === shipment.id ? 'selected' : ''}`}
                                onClick={() => setSelectedShipment(shipment)}
                            >
                                <div className="shipment-header">
                                    <span className="shipment-id">#{shipment.id.slice(0, 8)}</span>
                                    <span className="badge badge-primary">{shipment.vehicle_type_required}</span>
                                </div>

                                <div className="shipment-route">
                                    <div className="route-point">
                                        <div className="route-dot origin"></div>
                                        <div className="route-info">
                                            <span className="route-label">Pickup</span>
                                            <span className="route-address">{shipment.origin?.address || 'TBD'}</span>
                                        </div>
                                    </div>
                                    <div className="route-connector">
                                        <div className="route-line-vertical"></div>
                                        {shipment.distance_km && (
                                            <span className="route-distance">{Math.round(shipment.distance_km)} km</span>
                                        )}
                                    </div>
                                    <div className="route-point">
                                        <div className="route-dot destination"></div>
                                        <div className="route-info">
                                            <span className="route-label">Delivery</span>
                                            <span className="route-address">{shipment.destination?.address || 'TBD'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shipment-details">
                                    <div className="detail-item">
                                        <Package size={14} />
                                        <span>{shipment.weight} tons</span>
                                    </div>
                                    <div className="detail-item">
                                        <Clock size={14} />
                                        <span>{new Date(shipment.pickup_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="detail-item">
                                        <Truck size={14} />
                                        <span>{shipment.cargo_type}</span>
                                    </div>
                                </div>

                                <div className="shipment-actions">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedShipment(shipment);
                                        }}
                                    >
                                        <Eye size={16} /> View
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedShipment(shipment);
                                            setShowAcceptModal(true);
                                        }}
                                    >
                                        <Check size={16} /> Accept
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Map / Details Panel */}
                <div className="details-panel card">
                    {selectedShipment ? (
                        <>
                            <div className="panel-header">
                                <h3>Shipment Details</h3>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAcceptModal(true)}
                                >
                                    Accept Shipment
                                </button>
                            </div>

                            <div className="panel-map">
                                <RouteMap
                                    height="300px"
                                    origin={selectedShipment.origin}
                                    destination={selectedShipment.destination}
                                />
                            </div>

                            <div className="panel-details">
                                <div className="detail-row">
                                    <span className="detail-label">Cargo Type</span>
                                    <span className="detail-value">{selectedShipment.cargo_type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Weight</span>
                                    <span className="detail-value">{selectedShipment.weight} tons</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Volume</span>
                                    <span className="detail-value">{selectedShipment.volume || 'N/A'} m³</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Vehicle Required</span>
                                    <span className="detail-value">{selectedShipment.vehicle_type_required}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Pickup Date</span>
                                    <span className="detail-value">{new Date(selectedShipment.pickup_date).toLocaleString()}</span>
                                </div>
                                {selectedShipment.description && (
                                    <div className="detail-row">
                                        <span className="detail-label">Description</span>
                                        <span className="detail-value">{selectedShipment.description}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="panel-empty">
                            <MapPin size={48} />
                            <p>Select a shipment to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Accept Modal */}
            {showAcceptModal && (
                <div className="modal-overlay" onClick={() => setShowAcceptModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Accept Shipment</h2>
                        <p>Select a vehicle and optionally propose a price</p>

                        <div className="input-group">
                            <label>Select Vehicle</label>
                            <select
                                className="input select"
                                value={selectedVehicle}
                                onChange={(e) => setSelectedVehicle(e.target.value)}
                            >
                                <option value="">Choose a vehicle...</option>
                                {compatibleVehicles.map(vehicle => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.vehicle_number} - {vehicle.type} ({vehicle.capacity_tons} tons)
                                    </option>
                                ))}
                            </select>
                            {compatibleVehicles.length === 0 && (
                                <p className="error-text">No compatible vehicles available. Add a {selectedShipment?.vehicle_type_required} vehicle first.</p>
                            )}
                        </div>

                        <div className="input-group">
                            <label>Proposed Price (₹) - Optional</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="Leave empty for shipper to decide"
                                value={proposedPrice}
                                onChange={(e) => setProposedPrice(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowAcceptModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAccept}
                                disabled={!selectedVehicle || isLoading}
                            >
                                {isLoading ? 'Accepting...' : 'Confirm Accept'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
