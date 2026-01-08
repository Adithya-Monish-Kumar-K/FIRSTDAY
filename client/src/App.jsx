import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';

// Layout
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateShipment from './pages/CreateShipment';
import AvailableShipments from './pages/AvailableShipments';
import MyShipments from './pages/MyShipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Vehicles from './pages/Vehicles';
import RoutePlanner from './pages/RoutePlanner';
import Tracking from './pages/Tracking';
import Pricing from './pages/Pricing';
import Optimizer from './pages/Optimizer';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AllShipments from './pages/admin/AllShipments';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

// Public Route (redirect if authenticated)
function PublicRoute({ children }) {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function App() {
    const { checkAuth, token } = useAuthStore();

    useEffect(() => {
        if (token) {
            checkAuth();
        }
    }, []);

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/register" element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                } />

                {/* Protected Routes */}
                <Route element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    {/* Common Routes */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/my-shipments" element={<MyShipments />} />
                    <Route path="/shipment/:id" element={<ShipmentDetail />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/optimizer" element={<Optimizer />} />
                    <Route path="/settings" element={<div className="card"><h2>Settings (Coming Soon)</h2></div>} />

                    {/* Shipper Only */}
                    <Route path="/create-shipment" element={
                        <ProtectedRoute allowedRoles={['shipper', 'admin']}>
                            <CreateShipment />
                        </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                        <ProtectedRoute allowedRoles={['shipper', 'admin']}>
                            <div className="card"><h2>Analytics (Coming Soon)</h2></div>
                        </ProtectedRoute>
                    } />

                    {/* Transporter Only */}
                    <Route path="/available-shipments" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <AvailableShipments />
                        </ProtectedRoute>
                    } />
                    <Route path="/vehicles" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <Vehicles />
                        </ProtectedRoute>
                    } />
                    <Route path="/routes" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <RoutePlanner />
                        </ProtectedRoute>
                    } />
                    <Route path="/return-trips" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <div className="card"><h2>Return Trips (Coming Soon)</h2></div>
                        </ProtectedRoute>
                    } />
                    <Route path="/earnings" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <div className="card"><h2>Earnings (Coming Soon)</h2></div>
                        </ProtectedRoute>
                    } />
                    <Route path="/ratings" element={
                        <ProtectedRoute allowedRoles={['transporter', 'admin']}>
                            <div className="card"><h2>Ratings (Coming Soon)</h2></div>
                        </ProtectedRoute>
                    } />

                    {/* Admin Only */}
                    <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/users" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <UserManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/shipments" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AllShipments />
                        </ProtectedRoute>
                    } />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
