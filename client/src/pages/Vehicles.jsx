import { useEffect, useState } from 'react';
import { useVehicleStore, useNotificationStore } from '../store';
import {
    Truck, Plus, Edit2, Trash2, X, CheckCircle, AlertCircle,
    Settings, Package
} from 'lucide-react';
import './Vehicles.css';

const VEHICLE_TYPES = [
    { value: 'open', label: 'Open Truck', icon: '🚛' },
    { value: 'covered', label: 'Covered Truck', icon: '📦' },
    { value: 'refrigerated', label: 'Refrigerated', icon: '❄️' },
    { value: 'container', label: 'Container', icon: '🚢' },
    { value: 'tanker', label: 'Tanker', icon: '🛢️' },
    { value: 'flatbed', label: 'Flatbed', icon: '🏗️' }
];

const FEATURES = ['gps', 'refrigerated', 'hydraulic_lift', 'covered', 'insured', 'tracking'];

export default function Vehicles() {
    const { vehicles, fetchVehicles, addVehicle, updateVehicle, deleteVehicle, isLoading } = useVehicleStore();
    const { addNotification } = useNotificationStore();

    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [formData, setFormData] = useState({
        vehicle_number: '',
        type: 'covered',
        capacity_tons: '',
        capacity_volume: '',
        features: []
    });

    useEffect(() => {
        fetchVehicles();
    }, []);

    const resetForm = () => {
        setFormData({
            vehicle_number: '',
            type: 'covered',
            capacity_tons: '',
            capacity_volume: '',
            features: []
        });
        setEditingVehicle(null);
    };

    const handleOpenModal = (vehicle = null) => {
        if (vehicle) {
            setEditingVehicle(vehicle);
            setFormData({
                vehicle_number: vehicle.vehicle_number,
                type: vehicle.type,
                capacity_tons: vehicle.capacity_tons,
                capacity_volume: vehicle.capacity_volume || '',
                features: vehicle.features || []
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleFeatureToggle = (feature) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.includes(feature)
                ? prev.features.filter(f => f !== feature)
                : [...prev.features, feature]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editingVehicle) {
            const result = await updateVehicle(editingVehicle.id, formData);
            if (result.success) {
                addNotification({ type: 'success', message: 'Vehicle updated successfully!' });
                handleCloseModal();
            } else {
                addNotification({ type: 'error', message: 'Failed to update vehicle' });
            }
        } else {
            const result = await addVehicle(formData);
            if (result.success) {
                addNotification({ type: 'success', message: 'Vehicle added successfully!' });
                handleCloseModal();
            } else {
                addNotification({ type: 'error', message: result.error || 'Failed to add vehicle' });
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;

        const result = await deleteVehicle(id);
        if (result.success) {
            addNotification({ type: 'success', message: 'Vehicle deleted' });
        } else {
            addNotification({ type: 'error', message: 'Failed to delete vehicle' });
        }
    };

    const handleStatusChange = async (vehicle, newStatus) => {
        const result = await updateVehicle(vehicle.id, { status: newStatus });
        if (result.success) {
            addNotification({ type: 'success', message: `Vehicle marked as ${newStatus}` });
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'available': return <CheckCircle size={16} className="status-available" />;
            case 'in_use': return <Truck size={16} className="status-in-use" />;
            case 'maintenance': return <Settings size={16} className="status-maintenance" />;
            default: return null;
        }
    };

    return (
        <div className="vehicles-page">
            <div className="page-header">
                <div>
                    <h1>My Vehicles</h1>
                    <p>Manage your fleet and vehicle capacity</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} />
                    Add Vehicle
                </button>
            </div>

            {/* Stats */}
            <div className="vehicle-stats">
                <div className="stat-card card">
                    <div className="stat-icon available">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{vehicles.filter(v => v.status === 'available').length}</span>
                        <span className="stat-label">Available</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon in-use">
                        <Truck size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{vehicles.filter(v => v.status === 'in_use').length}</span>
                        <span className="stat-label">In Use</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon maintenance">
                        <Settings size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{vehicles.filter(v => v.status === 'maintenance').length}</span>
                        <span className="stat-label">Maintenance</span>
                    </div>
                </div>
                <div className="stat-card card">
                    <div className="stat-icon total">
                        <Package size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{vehicles.reduce((sum, v) => sum + v.capacity_tons, 0)}</span>
                        <span className="stat-label">Total Capacity (tons)</span>
                    </div>
                </div>
            </div>

            {/* Vehicles Grid */}
            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading vehicles...</p>
                </div>
            ) : vehicles.length === 0 ? (
                <div className="empty-state card">
                    <Truck size={64} />
                    <h3>No vehicles yet</h3>
                    <p>Add your first vehicle to start accepting shipments</p>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Add Vehicle
                    </button>
                </div>
            ) : (
                <div className="vehicles-grid">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="vehicle-card card">
                            <div className="vehicle-header">
                                <div className="vehicle-type-icon">
                                    {VEHICLE_TYPES.find(t => t.value === vehicle.type)?.icon || '🚛'}
                                </div>
                                <div className="vehicle-actions">
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={() => handleOpenModal(vehicle)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm delete-btn"
                                        onClick={() => handleDelete(vehicle.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="vehicle-number">{vehicle.vehicle_number}</div>
                            <div className="vehicle-type">{VEHICLE_TYPES.find(t => t.value === vehicle.type)?.label || vehicle.type}</div>

                            <div className="vehicle-capacity">
                                <div className="capacity-bar">
                                    <div
                                        className="capacity-fill"
                                        style={{ width: `${(vehicle.current_load / vehicle.capacity_tons) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="capacity-text">
                                    <span>{vehicle.current_load || 0} / {vehicle.capacity_tons} tons</span>
                                    <span className="capacity-percent">
                                        {Math.round((vehicle.current_load / vehicle.capacity_tons) * 100) || 0}%
                                    </span>
                                </div>
                            </div>

                            {vehicle.features?.length > 0 && (
                                <div className="vehicle-features">
                                    {vehicle.features.map(feature => (
                                        <span key={feature} className="feature-tag">
                                            {feature.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="vehicle-status">
                                <span className={`status-badge status-${vehicle.status}`}>
                                    {getStatusIcon(vehicle.status)}
                                    {vehicle.status.replace('_', ' ')}
                                </span>
                                <select
                                    className="status-select"
                                    value={vehicle.status}
                                    onChange={(e) => handleStatusChange(vehicle, e.target.value)}
                                >
                                    <option value="available">Available</option>
                                    <option value="in_use">In Use</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Vehicle Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., TN01AB1234"
                                    value={formData.vehicle_number}
                                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Vehicle Type</label>
                                <div className="type-selector">
                                    {VEHICLE_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`type-option ${formData.type === type.value ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, type: type.value })}
                                        >
                                            <span className="type-icon">{type.icon}</span>
                                            <span className="type-label">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label>Capacity (tons)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="e.g., 10"
                                        value={formData.capacity_tons}
                                        onChange={(e) => setFormData({ ...formData, capacity_tons: e.target.value })}
                                        required
                                        min="0.1"
                                        step="0.1"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Volume (m³)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="e.g., 50"
                                        value={formData.capacity_volume}
                                        onChange={(e) => setFormData({ ...formData, capacity_volume: e.target.value })}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Features</label>
                                <div className="features-selector">
                                    {FEATURES.map(feature => (
                                        <button
                                            key={feature}
                                            type="button"
                                            className={`feature-option ${formData.features.includes(feature) ? 'active' : ''}`}
                                            onClick={() => handleFeatureToggle(feature)}
                                        >
                                            {formData.features.includes(feature) && <CheckCircle size={14} />}
                                            {feature.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                    {isLoading ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
