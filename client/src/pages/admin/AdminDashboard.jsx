import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Users, Package, Truck, TrendingUp, AlertCircle, 
    CheckCircle, Clock, Activity, Zap, BarChart3 
} from 'lucide-react';
import api from '../../api';
import './Admin.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalShippers: 0,
        totalTransporters: 0,
        totalShipments: 0,
        activeShipments: 0,
        completedShipments: 0,
        totalVehicles: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [optimizerHealth, setOptimizerHealth] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        checkOptimizerHealth();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch stats from various endpoints
            const [shipmentsRes, vehiclesRes] = await Promise.all([
                api.get('/shipments').catch(() => ({ data: [] })),
                api.get('/vehicles').catch(() => ({ data: [] }))
            ]);

            const shipments = shipmentsRes.data || [];
            const vehicles = vehiclesRes.data || [];

            setStats({
                totalUsers: 25, // Mock - would come from admin endpoint
                totalShippers: 15,
                totalTransporters: 10,
                totalShipments: shipments.length,
                activeShipments: shipments.filter(s => 
                    ['posted', 'processing', 'assigned', 'in_transit'].includes(s.status)
                ).length,
                completedShipments: shipments.filter(s => s.status === 'delivered').length,
                totalVehicles: vehicles.length
            });

            // Mock recent activity
            setRecentActivity([
                { id: 1, type: 'shipment', message: 'New shipment created by Shipper A', time: '2 min ago' },
                { id: 2, type: 'user', message: 'New transporter registered', time: '15 min ago' },
                { id: 3, type: 'delivery', message: 'Shipment #1234 delivered', time: '1 hour ago' },
                { id: 4, type: 'optimization', message: 'Route optimization completed', time: '2 hours ago' },
            ]);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkOptimizerHealth = async () => {
        try {
            const response = await api.get('/optimize/health');
            setOptimizerHealth(response.data);
        } catch {
            setOptimizerHealth({ server: 'unknown', optimizer: 'unknown' });
        }
    };

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#3b82f6' },
        { label: 'Shippers', value: stats.totalShippers, icon: Package, color: '#10b981' },
        { label: 'Transporters', value: stats.totalTransporters, icon: Truck, color: '#f59e0b' },
        { label: 'Total Shipments', value: stats.totalShipments, icon: TrendingUp, color: '#8b5cf6' },
        { label: 'Active Shipments', value: stats.activeShipments, icon: Clock, color: '#06b6d4' },
        { label: 'Completed', value: stats.completedShipments, icon: CheckCircle, color: '#22c55e' },
    ];

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>System overview and management</p>
                </div>
                <div className="system-status">
                    <div className={`status-indicator ${optimizerHealth?.server === 'healthy' ? 'healthy' : 'warning'}`}>
                        <Activity size={16} />
                        Server: {optimizerHealth?.server || 'checking...'}
                    </div>
                    <div className={`status-indicator ${optimizerHealth?.optimizer === 'healthy' ? 'healthy' : 'warning'}`}>
                        <Zap size={16} />
                        Optimizer: {optimizerHealth?.optimizer || 'checking...'}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div key={index} className="stat-card card glass">
                        <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="admin-sections">
                <div className="quick-actions card glass">
                    <h2><BarChart3 size={20} /> Quick Actions</h2>
                    <div className="actions-grid">
                        <Link to="/admin/users" className="action-btn">
                            <Users size={24} />
                            <span>Manage Users</span>
                        </Link>
                        <Link to="/admin/shipments" className="action-btn">
                            <Package size={24} />
                            <span>All Shipments</span>
                        </Link>
                        <Link to="/optimizer" className="action-btn">
                            <Zap size={24} />
                            <span>Optimizer</span>
                        </Link>
                        <Link to="/vehicles" className="action-btn">
                            <Truck size={24} />
                            <span>Vehicles</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="recent-activity card glass">
                    <h2><Activity size={20} /> Recent Activity</h2>
                    <div className="activity-list">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="activity-item">
                                <div className={`activity-dot ${activity.type}`}></div>
                                <div className="activity-content">
                                    <p>{activity.message}</p>
                                    <span className="activity-time">{activity.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
