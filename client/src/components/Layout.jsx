import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationStore } from '../store';
import {
    Truck, Package, Map, BarChart3, LogOut, Menu, X,
    Bell, Settings, Home, Route, DollarSign, Star, RefreshCw,
    Zap, Users, Shield, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuthStore();
    const { notifications, removeNotification } = useNotificationStore();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Role-based navigation
    const getNavItems = () => {
        const commonItems = [
            { to: '/dashboard', icon: Home, label: 'Dashboard' },
        ];

        if (user?.role === 'admin') {
            return [
                ...commonItems,
                { to: '/admin', icon: Shield, label: 'Admin Panel' },
                { to: '/admin/users', icon: Users, label: 'Users' },
                { to: '/admin/shipments', icon: Package, label: 'All Shipments' },
                { to: '/optimizer', icon: Zap, label: 'Optimizer' },
                { to: '/vehicles', icon: Truck, label: 'Vehicles' },
                { to: '/tracking', icon: Map, label: 'Tracking' },
                { to: '/pricing', icon: DollarSign, label: 'Pricing' },
            ];
        }

        if (user?.role === 'transporter') {
            return [
                ...commonItems,
                { to: '/available-shipments', icon: Package, label: 'Available Loads' },
                { to: '/my-shipments', icon: Truck, label: 'My Shipments' },
                { to: '/vehicles', icon: Truck, label: 'My Vehicles' },
                { to: '/routes', icon: Route, label: 'Route Planner' },
                { to: '/optimizer', icon: Zap, label: 'Optimizer' },
                { to: '/return-trips', icon: RefreshCw, label: 'Return Trips' },
                { to: '/earnings', icon: DollarSign, label: 'Earnings' },
                { to: '/ratings', icon: Star, label: 'My Ratings' },
            ];
        }

        // Shipper
        return [
            ...commonItems,
            { to: '/create-shipment', icon: Package, label: 'Create Shipment' },
            { to: '/my-shipments', icon: Truck, label: 'My Shipments' },
            { to: '/tracking', icon: Map, label: 'Track Shipments' },
            { to: '/optimizer', icon: Zap, label: 'Optimizer' },
            { to: '/analytics', icon: BarChart3, label: 'Analytics' },
            { to: '/pricing', icon: DollarSign, label: 'Price Calculator' },
        ];
    };

    const navItems = getNavItems();

    const getRoleBadge = () => {
        switch (user?.role) {
            case 'admin':
                return { color: '#ef4444', label: 'Admin' };
            case 'transporter':
                return { color: '#f59e0b', label: 'Transporter' };
            case 'shipper':
                return { color: '#3b82f6', label: 'Shipper' };
            default:
                return { color: '#6b7280', label: 'Guest' };
        }
    };

    const roleBadge = getRoleBadge();

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <Truck size={24} />
                        </div>
                        {sidebarOpen && <span className="logo-text">ChainFreight</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            {sidebarOpen && <span>{label}</span>}
                            {sidebarOpen && <ChevronRight size={16} className="nav-arrow" />}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <NavLink to="/settings" className="nav-item">
                        <Settings size={20} />
                        {sidebarOpen && <span>Settings</span>}
                    </NavLink>
                    <button onClick={handleLogout} className="nav-item logout-btn">
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className="header glass-dark">
                    <div className="header-left">
                        <h1 className="page-title">
                            {/* Dynamic title based on route */}
                        </h1>
                    </div>

                    <div className="header-right">
                        {/* Notifications */}
                        <div className="notification-wrapper">
                            <button
                                className="icon-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="notification-badge">{notifications.length}</span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h4>Notifications</h4>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <p className="no-notifications">No new notifications</p>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`notification-item ${notif.type}`}
                                                onClick={() => removeNotification(notif.id)}
                                            >
                                                <p>{notif.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="user-menu">
                            <div className="avatar" style={{ background: roleBadge.color }}>
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user?.name || user?.business_name || 'User'}</span>
                                <span className="user-role" style={{ color: roleBadge.color }}>
                                    {roleBadge.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="main-content">
                    <Outlet />
                </main>
            </div>

            {/* Toast Notifications */}
            <div className="toast-container">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`toast toast-${notif.type}`}
                        onClick={() => removeNotification(notif.id)}
                    >
                        {notif.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
