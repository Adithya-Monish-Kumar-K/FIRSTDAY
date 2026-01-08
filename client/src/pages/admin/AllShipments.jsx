import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Package, Search, Filter, MapPin, Calendar, 
    Clock, CheckCircle, Truck, AlertCircle, Eye
} from 'lucide-react';
import api from '../../api';
import './Admin.css';

const STATUS_CONFIG = {
    posted: { label: 'Posted', color: '#3b82f6', icon: Clock },
    processing: { label: 'Processing', color: '#f59e0b', icon: Clock },
    assigned: { label: 'Assigned', color: '#8b5cf6', icon: Truck },
    in_transit: { label: 'In Transit', color: '#06b6d4', icon: Truck },
    delivered: { label: 'Delivered', color: '#22c55e', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: '#ef4444', icon: AlertCircle },
};

export default function AllShipments() {
    const [shipments, setShipments] = useState([]);
    const [filteredShipments, setFilteredShipments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchAllShipments();
    }, []);

    useEffect(() => {
        filterShipments();
    }, [shipments, searchTerm, statusFilter]);

    const fetchAllShipments = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/shipments');
            setShipments(response.data || []);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
            // Use mock data if API fails
            setShipments([
                {
                    id: '1',
                    title: 'Electronics to Bangalore',
                    pickup_address: 'Chennai',
                    delivery_address: 'Bangalore',
                    status: 'in_transit',
                    cargo_type: 'electronics',
                    weight: 500,
                    created_at: '2024-01-15',
                    price: 15000
                },
                {
                    id: '2',
                    title: 'Furniture Delivery',
                    pickup_address: 'Mumbai',
                    delivery_address: 'Pune',
                    status: 'delivered',
                    cargo_type: 'furniture',
                    weight: 1200,
                    created_at: '2024-01-10',
                    price: 8500
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterShipments = () => {
        let filtered = [...shipments];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.title?.toLowerCase().includes(term) ||
                s.pickup_address?.toLowerCase().includes(term) ||
                s.delivery_address?.toLowerCase().includes(term)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        setFilteredShipments(filtered);
    };

    const getStatusConfig = (status) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG.posted;
    };

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading shipments...</p>
            </div>
        );
    }

    return (
        <div className="all-shipments">
            <div className="page-header">
                <div>
                    <h1><Package size={28} /> All Shipments</h1>
                    <p>View and manage all platform shipments</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="shipment-stats">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const count = shipments.filter(s => s.status === key).length;
                    return (
                        <div 
                            key={key} 
                            className={`stat-pill ${statusFilter === key ? 'active' : ''}`}
                            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                            style={{ borderColor: config.color }}
                        >
                            <span className="stat-dot" style={{ background: config.color }}></span>
                            <span className="stat-name">{config.label}</span>
                            <span className="stat-num">{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="filters-bar card glass">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search shipments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <Filter size={18} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                <div className="user-count">
                    {filteredShipments.length} shipments
                </div>
            </div>

            {/* Shipments Grid */}
            <div className="shipments-grid">
                {filteredShipments.map((shipment) => {
                    const statusConfig = getStatusConfig(shipment.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                        <div key={shipment.id} className="shipment-card card glass">
                            <div className="shipment-header">
                                <span 
                                    className="status-tag"
                                    style={{ 
                                        background: `${statusConfig.color}20`,
                                        color: statusConfig.color
                                    }}
                                >
                                    <StatusIcon size={14} />
                                    {statusConfig.label}
                                </span>
                                <span className="shipment-id">#{shipment.id.slice(0, 8)}</span>
                            </div>

                            <h3 className="shipment-title">{shipment.title || 'Shipment'}</h3>

                            <div className="shipment-route">
                                <div className="route-point">
                                    <div className="route-dot origin"></div>
                                    <span>{shipment.pickup_address}</span>
                                </div>
                                <div className="route-line"></div>
                                <div className="route-point">
                                    <div className="route-dot destination"></div>
                                    <span>{shipment.delivery_address}</span>
                                </div>
                            </div>

                            <div className="shipment-meta">
                                <span><Package size={14} /> {shipment.weight} kg</span>
                                <span><Calendar size={14} /> {new Date(shipment.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="shipment-footer">
                                <span className="shipment-price">₹{shipment.price?.toLocaleString()}</span>
                                <Link to={`/shipment/${shipment.id}`} className="view-btn">
                                    <Eye size={16} />
                                    View
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredShipments.length === 0 && (
                <div className="empty-state card glass">
                    <Package size={48} />
                    <h3>No shipments found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}
