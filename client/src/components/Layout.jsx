import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationStore } from '../store';
import {
    Truck, Package, Map, BarChart3, User, LogOut, Menu, X,
    Bell, Settings, Home, Route, DollarSign, Star, RefreshCw
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

    const navItems = user?.role === 'transporter' ? [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/available-shipments', icon: Package, label: 'Available Loads' },
        { to: '/my-shipments', icon: Truck, label: 'My Shipments' },
        { to: '/vehicles', icon: Truck, label: 'My Vehicles' },
        { to: '/routes', icon: Route, label: 'Route Planner' },
        { to: '/return-trips', icon: RefreshCw, label: 'Return Trips' },
        { to: '/earnings', icon: DollarSign, label: 'Earnings' },
        { to: '/ratings', icon: Star, label: 'My Ratings' },
    ] : [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/create-shipment', icon: Package, label: 'Create Shipment' },
        { to: '/my-shipments', icon: Truck, label: 'My Shipments' },
        { to: '/tracking', icon: Map, label: 'Track Shipments' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/pricing', icon: DollarSign, label: 'Price Calculator' },
    ];

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <Truck size={24} />
                        </div>
                        {sidebarOpen && <span className="logo-text">LogiFlow</span>}
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
                            <div className="avatar">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-info">
                                <span className="user-name">{user?.name || 'User'}</span>
                                <span className="user-role">{user?.role || 'Guest'}</span>
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
