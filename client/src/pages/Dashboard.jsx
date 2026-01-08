import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useShipmentStore, useVehicleStore } from '../store';
import {
    Truck, Package, MapPin, DollarSign, TrendingUp, Clock,
    ArrowRight, Star, AlertCircle, CheckCircle, Plus
} from 'lucide-react';
import RouteMap from '../components/RouteMap';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuthStore();
    const { shipments, fetchShipments, isLoading: shipmentsLoading } = useShipmentStore();
    const { vehicles, fetchVehicles, isLoading: vehiclesLoading } = useVehicleStore();

    useEffect(() => {
        fetchShipments();
        if (user?.role === 'transporter') {
            fetchVehicles();
        }
    }, []);

    if (user?.role === 'transporter') {
        return <TransporterDashboard shipments={shipments} vehicles={vehicles} />;
    }

    return <ShipperDashboard shipments={shipments} />;
}

function TransporterDashboard({ shipments, vehicles }) {
    const activeShipments = shipments.filter(s => ['accepted', 'picked_up', 'in_transit'].includes(s.status));
    const completedThisMonth = shipments.filter(s => {
        if (s.status !== 'delivered') return false;
        const deliveryDate = new Date(s.delivery_date);
        const now = new Date();
        return deliveryDate.getMonth() === now.getMonth() && deliveryDate.getFullYear() === now.getFullYear();
    });

    const stats = [
        {
            icon: Truck,
            label: 'Active Shipments',
            value: activeShipments.length,
            color: 'primary'
        },
        {
            icon: CheckCircle,
            label: 'Completed This Month',
            value: completedThisMonth.length,
            color: 'success'
        },
        {
            icon: DollarSign,
            label: 'Earnings This Month',
            value: `₹${(completedThisMonth.reduce((sum, s) => sum + (s.price || 0), 0)).toLocaleString()}`,
            color: 'warning'
        },
        {
            icon: Star,
            label: 'Average Rating',
            value: '4.8',
            color: 'accent'
        }
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back! 👋</h1>
                    <p>Here's what's happening with your deliveries today</p>
                </div>
                <Link to="/available-shipments" className="btn btn-primary">
                    <Package size={18} />
                    Find New Loads
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className={`stat-card card stat-${stat.color}`}>
                        <div className="stat-icon">
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid">
                {/* Active Shipments */}
                <div className="dashboard-section card">
                    <div className="section-header">
                        <h2>Active Shipments</h2>
                        <Link to="/my-shipments" className="btn btn-ghost btn-sm">
                            View All <ArrowRight size={16} />
                        </Link>
                    </div>

                    {activeShipments.length === 0 ? (
                        <div className="empty-state">
                            <Package size={48} />
                            <p>No active shipments</p>
                            <Link to="/available-shipments" className="btn btn-primary btn-sm">
                                Find Loads
                            </Link>
                        </div>
                    ) : (
                        <div className="shipment-list">
                            {activeShipments.slice(0, 3).map(shipment => (
                                <ShipmentCard key={shipment.id} shipment={shipment} />
                            ))}
                        </div>
                    )}
                </div>

                {/* My Vehicles */}
                <div className="dashboard-section card">
                    <div className="section-header">
                        <h2>My Vehicles</h2>
                        <Link to="/vehicles" className="btn btn-ghost btn-sm">
                            Manage <ArrowRight size={16} />
                        </Link>
                    </div>

                    {vehicles.length === 0 ? (
                        <div className="empty-state">
                            <Truck size={48} />
                            <p>No vehicles registered</p>
                            <Link to="/vehicles" className="btn btn-primary btn-sm">
                                <Plus size={16} /> Add Vehicle
                            </Link>
                        </div>
                    ) : (
                        <div className="vehicle-list">
                            {vehicles.slice(0, 3).map(vehicle => (
                                <VehicleCard key={vehicle.id} vehicle={vehicle} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Route Map Preview */}
                <div className="dashboard-section card map-section">
                    <div className="section-header">
                        <h2>Route Overview</h2>
                        <Link to="/routes" className="btn btn-ghost btn-sm">
                            Plan Route <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="map-wrapper">
                        <RouteMap
                            height="300px"
                            origin={activeShipments[0]?.origin}
                            destination={activeShipments[0]?.destination}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShipperDashboard({ shipments }) {
    const pendingShipments = shipments.filter(s => s.status === 'pending');
    const activeShipments = shipments.filter(s => ['accepted', 'picked_up', 'in_transit'].includes(s.status));
    const deliveredShipments = shipments.filter(s => s.status === 'delivered');

    const stats = [
        {
            icon: Clock,
            label: 'Pending',
            value: pendingShipments.length,
            color: 'warning'
        },
        {
            icon: Truck,
            label: 'In Transit',
            value: activeShipments.length,
            color: 'primary'
        },
        {
            icon: CheckCircle,
            label: 'Delivered',
            value: deliveredShipments.length,
            color: 'success'
        },
        {
            icon: DollarSign,
            label: 'Total Spent',
            value: `₹${shipments.reduce((sum, s) => sum + (s.price || 0), 0).toLocaleString()}`,
            color: 'accent'
        }
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back! 👋</h1>
                    <p>Manage your shipments and track deliveries</p>
                </div>
                <Link to="/create-shipment" className="btn btn-primary">
                    <Plus size={18} />
                    New Shipment
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className={`stat-card card stat-${stat.color}`}>
                        <div className="stat-icon">
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid">
                {/* Pending Shipments */}
                {pendingShipments.length > 0 && (
                    <div className="dashboard-section card pending-section">
                        <div className="section-header">
                            <h2>
                                <AlertCircle size={20} className="warning-icon" />
                                Pending Shipments
                            </h2>
                        </div>
                        <div className="shipment-list">
                            {pendingShipments.slice(0, 3).map(shipment => (
                                <ShipmentCard key={shipment.id} shipment={shipment} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Shipments */}
                <div className="dashboard-section card">
                    <div className="section-header">
                        <h2>Active Shipments</h2>
                        <Link to="/my-shipments" className="btn btn-ghost btn-sm">
                            View All <ArrowRight size={16} />
                        </Link>
                    </div>

                    {activeShipments.length === 0 ? (
                        <div className="empty-state">
                            <Truck size={48} />
                            <p>No active shipments</p>
                            <Link to="/create-shipment" className="btn btn-primary btn-sm">
                                Create Shipment
                            </Link>
                        </div>
                    ) : (
                        <div className="shipment-list">
                            {activeShipments.slice(0, 3).map(shipment => (
                                <ShipmentCard key={shipment.id} shipment={shipment} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Deliveries */}
                <div className="dashboard-section card">
                    <div className="section-header">
                        <h2>Recent Deliveries</h2>
                        <Link to="/my-shipments?status=delivered" className="btn btn-ghost btn-sm">
                            View All <ArrowRight size={16} />
                        </Link>
                    </div>

                    {deliveredShipments.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={48} />
                            <p>No completed deliveries yet</p>
                        </div>
                    ) : (
                        <div className="shipment-list">
                            {deliveredShipments.slice(0, 3).map(shipment => (
                                <ShipmentCard key={shipment.id} shipment={shipment} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="dashboard-section card">
                    <div className="section-header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <Link to="/create-shipment" className="quick-action-btn">
                            <Plus size={24} />
                            <span>New Shipment</span>
                        </Link>
                        <Link to="/tracking" className="quick-action-btn">
                            <MapPin size={24} />
                            <span>Track Shipment</span>
                        </Link>
                        <Link to="/pricing" className="quick-action-btn">
                            <DollarSign size={24} />
                            <span>Price Calculator</span>
                        </Link>
                        <Link to="/analytics" className="quick-action-btn">
                            <TrendingUp size={24} />
                            <span>Analytics</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShipmentCard({ shipment }) {
    const statusColors = {
        pending: 'warning',
        accepted: 'primary',
        picked_up: 'primary',
        in_transit: 'primary',
        delivered: 'success',
        cancelled: 'error'
    };

    return (
        <Link to={`/shipment/${shipment.id}`} className="shipment-card">
            <div className="shipment-card-header">
                <span className="shipment-id">#{shipment.id.slice(0, 8)}</span>
                <span className={`badge badge-${statusColors[shipment.status]}`}>
                    {shipment.status.replace('_', ' ')}
                </span>
            </div>
            <div className="shipment-route">
                <div className="route-point">
                    <div className="route-dot origin"></div>
                    <span>{shipment.origin?.address || 'Origin'}</span>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                    <div className="route-dot destination"></div>
                    <span>{shipment.destination?.address || 'Destination'}</span>
                </div>
            </div>
            <div className="shipment-meta">
                <span><Package size={14} /> {shipment.weight} tons</span>
                <span><Truck size={14} /> {shipment.vehicle_type_required}</span>
                {shipment.price && <span><DollarSign size={14} /> ₹{shipment.price.toLocaleString()}</span>}
            </div>
        </Link>
    );
}

function VehicleCard({ vehicle }) {
    const statusColors = {
        available: 'success',
        in_use: 'primary',
        maintenance: 'warning'
    };

    return (
        <div className="vehicle-card">
            <div className="vehicle-header">
                <span className="vehicle-number">{vehicle.vehicle_number}</span>
                <span className={`badge badge-${statusColors[vehicle.status]}`}>
                    {vehicle.status}
                </span>
            </div>
            <div className="vehicle-info">
                <span className="vehicle-type">{vehicle.type}</span>
                <span className="vehicle-capacity">{vehicle.capacity_tons} tons capacity</span>
            </div>
            <div className="vehicle-load">
                <div className="load-bar">
                    <div
                        className="load-fill"
                        style={{ width: `${(vehicle.current_load / vehicle.capacity_tons) * 100}%` }}
                    ></div>
                </div>
                <span>{vehicle.current_load} / {vehicle.capacity_tons} tons loaded</span>
            </div>
        </div>
    );
}
