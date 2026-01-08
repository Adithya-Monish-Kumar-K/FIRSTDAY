import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShipmentStore, useAuthStore } from '../store';
import {
    Package, Truck, MapPin, Clock, DollarSign,
    CheckCircle, AlertCircle, Filter, Search
} from 'lucide-react';
import { useState } from 'react';
import './MyShipments.css';

const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
];

export default function MyShipments() {
    const { user } = useAuthStore();
    const { shipments, fetchShipments, isLoading } = useShipmentStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchShipments();
    }, []);

    const filteredShipments = shipments.filter(shipment => {
        if (statusFilter !== 'all' && shipment.status !== statusFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesId = shipment.id.toLowerCase().includes(query);
            const matchesOrigin = shipment.origin?.address?.toLowerCase().includes(query);
            const matchesDest = shipment.destination?.address?.toLowerCase().includes(query);
            if (!matchesId && !matchesOrigin && !matchesDest) return false;
        }
        return true;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock size={16} className="status-pending" />;
            case 'accepted': return <CheckCircle size={16} className="status-accepted" />;
            case 'picked_up': return <Package size={16} className="status-picked" />;
            case 'in_transit': return <Truck size={16} className="status-transit" />;
            case 'delivered': return <CheckCircle size={16} className="status-delivered" />;
            case 'cancelled': return <AlertCircle size={16} className="status-cancelled" />;
            default: return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'accepted':
            case 'picked_up':
            case 'in_transit': return 'primary';
            case 'delivered': return 'success';
            case 'cancelled': return 'error';
            default: return 'primary';
        }
    };

    return (
        <div className="my-shipments">
            <div className="page-header">
                <div>
                    <h1>My Shipments</h1>
                    <p>{user?.role === 'shipper' ? 'Track and manage your shipments' : 'Your accepted deliveries'}</p>
                </div>
                {user?.role === 'shipper' && (
                    <Link to="/create-shipment" className="btn btn-primary">
                        <Package size={18} />
                        New Shipment
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by ID or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="status-tabs">
                    {STATUS_FILTERS.map(filter => (
                        <button
                            key={filter.value}
                            className={`status-tab ${statusFilter === filter.value ? 'active' : ''}`}
                            onClick={() => setStatusFilter(filter.value)}
                        >
                            {filter.label}
                            {filter.value !== 'all' && (
                                <span className="count">
                                    {shipments.filter(s => s.status === filter.value).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Shipments List */}
            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading shipments...</p>
                </div>
            ) : filteredShipments.length === 0 ? (
                <div className="empty-state card">
                    <Package size={64} />
                    <h3>No shipments found</h3>
                    <p>
                        {statusFilter !== 'all'
                            ? `No shipments with "${statusFilter}" status`
                            : user?.role === 'shipper'
                                ? 'Create your first shipment to get started'
                                : 'Accept shipments from the available loads page'
                        }
                    </p>
                    {user?.role === 'shipper' ? (
                        <Link to="/create-shipment" className="btn btn-primary">
                            Create Shipment
                        </Link>
                    ) : (
                        <Link to="/available-shipments" className="btn btn-primary">
                            Find Loads
                        </Link>
                    )}
                </div>
            ) : (
                <div className="shipments-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Route</th>
                                <th>Cargo</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Price</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShipments.map(shipment => (
                                <tr key={shipment.id}>
                                    <td>
                                        <span className="shipment-id">#{shipment.id.slice(0, 8)}</span>
                                    </td>
                                    <td>
                                        <div className="route-cell">
                                            <div className="route-from">
                                                <MapPin size={14} className="origin" />
                                                <span>{shipment.origin?.address?.split(',')[0] || 'Origin'}</span>
                                            </div>
                                            <div className="route-to">
                                                <MapPin size={14} className="destination" />
                                                <span>{shipment.destination?.address?.split(',')[0] || 'Destination'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cargo-cell">
                                            <span className="cargo-type">{shipment.cargo_type}</span>
                                            <span className="cargo-weight">{shipment.weight} tons</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${getStatusColor(shipment.status)}`}>
                                            {getStatusIcon(shipment.status)}
                                            {shipment.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="date-cell">
                                            {new Date(shipment.pickup_date || shipment.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="price-cell">
                                            {shipment.price ? `₹${shipment.price.toLocaleString()}` : '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/shipment/${shipment.id}`} className="btn btn-ghost btn-sm">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
