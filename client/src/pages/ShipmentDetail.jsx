import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShipmentStore, useAuthStore, useNotificationStore } from '../store';
import { checkpointsApi, ratingsApi } from '../api';
import RouteMap from '../components/RouteMap';
import {
    MapPin, Package, Truck, Clock, DollarSign, User,
    Phone, Star, Camera, Upload, CheckCircle, ArrowLeft
} from 'lucide-react';
import './ShipmentDetail.css';

const STATUS_STEPS = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered'];

export default function ShipmentDetail() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const { currentShipment, fetchShipment, updateStatus, isLoading } = useShipmentStore();
    const { addNotification } = useNotificationStore();

    const [checkpoints, setCheckpoints] = useState([]);
    const [showCheckpointModal, setShowCheckpointModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [checkpointForm, setCheckpointForm] = useState({
        location: '',
        lat: '',
        lng: '',
        status: 'arrived',
        notes: '',
        image: null
    });
    const [ratingForm, setRatingForm] = useState({
        rating: 5,
        review: ''
    });

    useEffect(() => {
        fetchShipment(id);
        loadCheckpoints();
    }, [id]);

    const loadCheckpoints = async () => {
        try {
            const response = await checkpointsApi.getShipmentCheckpoints(id);
            setCheckpoints(response.data);
        } catch (error) {
            console.error('Failed to load checkpoints:', error);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        const result = await updateStatus(id, newStatus);
        if (result.success) {
            addNotification({ type: 'success', message: `Status updated to ${newStatus.replace('_', ' ')}` });
        }
    };

    const handleCheckpointSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('shipment_id', id);
        formData.append('location', checkpointForm.location);
        formData.append('lat', checkpointForm.lat);
        formData.append('lng', checkpointForm.lng);
        formData.append('status', checkpointForm.status);
        formData.append('notes', checkpointForm.notes);
        if (checkpointForm.image) {
            formData.append('image', checkpointForm.image);
        }

        try {
            await checkpointsApi.addCheckpoint(formData);
            addNotification({ type: 'success', message: 'Checkpoint added successfully!' });
            setShowCheckpointModal(false);
            loadCheckpoints();
            setCheckpointForm({
                location: '',
                lat: '',
                lng: '',
                status: 'arrived',
                notes: '',
                image: null
            });
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to add checkpoint' });
        }
    };

    const handleRatingSubmit = async (e) => {
        e.preventDefault();

        const ratedUserId = user?.role === 'shipper'
            ? currentShipment?.transporter_id
            : currentShipment?.shipper_id;

        try {
            await ratingsApi.createRating({
                shipment_id: id,
                rated_user_id: ratedUserId,
                rating: ratingForm.rating,
                review: ratingForm.review
            });
            addNotification({ type: 'success', message: 'Rating submitted!' });
            setShowRatingModal(false);
        } catch (error) {
            addNotification({ type: 'error', message: 'Failed to submit rating' });
        }
    };

    if (isLoading || !currentShipment) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading shipment details...</p>
            </div>
        );
    }

    const currentStatusIndex = STATUS_STEPS.indexOf(currentShipment.status);
    const isTransporter = user?.role === 'transporter';
    const canUpdateStatus = isTransporter && currentShipment.transporter_id === user?.id;

    return (
        <div className="shipment-detail">
            <Link to="/my-shipments" className="back-link">
                <ArrowLeft size={18} />
                Back to Shipments
            </Link>

            <div className="detail-header">
                <div>
                    <h1>Shipment #{currentShipment.id.slice(0, 8)}</h1>
                    <span className={`status-badge status-${currentShipment.status}`}>
                        {currentShipment.status.replace('_', ' ')}
                    </span>
                </div>
                <div className="header-actions">
                    {currentShipment.status === 'delivered' && (
                        <button className="btn btn-secondary" onClick={() => setShowRatingModal(true)}>
                            <Star size={18} />
                            Rate {isTransporter ? 'Shipper' : 'Transporter'}
                        </button>
                    )}
                    {canUpdateStatus && currentShipment.status !== 'delivered' && (
                        <button className="btn btn-primary" onClick={() => setShowCheckpointModal(true)}>
                            <MapPin size={18} />
                            Add Checkpoint
                        </button>
                    )}
                </div>
            </div>

            {/* Status Progress */}
            <div className="status-progress card">
                {STATUS_STEPS.map((step, index) => (
                    <div
                        key={step}
                        className={`progress-step ${index <= currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'current' : ''}`}
                    >
                        <div className="step-circle">
                            {index < currentStatusIndex ? <CheckCircle size={20} /> : index + 1}
                        </div>
                        <span className="step-label">{step.replace('_', ' ')}</span>
                        {canUpdateStatus && index === currentStatusIndex + 1 && currentStatusIndex < STATUS_STEPS.length - 1 && (
                            <button
                                className="btn btn-sm btn-primary update-btn"
                                onClick={() => handleStatusUpdate(step)}
                            >
                                Mark as {step.replace('_', ' ')}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="detail-grid">
                {/* Route Map */}
                <div className="map-section card">
                    <h3>Route</h3>
                    <RouteMap
                        height="350px"
                        origin={currentShipment.origin}
                        destination={currentShipment.destination}
                        checkpoints={checkpoints}
                    />
                </div>

                {/* Shipment Info */}
                <div className="info-section">
                    <div className="info-card card">
                        <h3>Route Details</h3>
                        <div className="info-row">
                            <MapPin size={18} className="origin-icon" />
                            <div>
                                <span className="label">Pickup</span>
                                <span className="value">{currentShipment.origin?.address || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <MapPin size={18} className="dest-icon" />
                            <div>
                                <span className="label">Delivery</span>
                                <span className="value">{currentShipment.destination?.address || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <Clock size={18} />
                            <div>
                                <span className="label">Pickup Date</span>
                                <span className="value">{new Date(currentShipment.pickup_date).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="info-card card">
                        <h3>Cargo Details</h3>
                        <div className="info-row">
                            <Package size={18} />
                            <div>
                                <span className="label">Type</span>
                                <span className="value">{currentShipment.cargo_type}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <Truck size={18} />
                            <div>
                                <span className="label">Weight</span>
                                <span className="value">{currentShipment.weight} tons</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <DollarSign size={18} />
                            <div>
                                <span className="label">Price</span>
                                <span className="value price">
                                    {currentShipment.price ? `₹${currentShipment.price.toLocaleString()}` : 'Not set'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {currentShipment.transporter && (
                        <div className="info-card card">
                            <h3>Transporter</h3>
                            <div className="info-row">
                                <User size={18} />
                                <div>
                                    <span className="label">Name</span>
                                    <span className="value">{currentShipment.transporter.name}</span>
                                </div>
                            </div>
                            <div className="info-row">
                                <Phone size={18} />
                                <div>
                                    <span className="label">Phone</span>
                                    <span className="value">{currentShipment.transporter.phone || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="info-row">
                                <Star size={18} />
                                <div>
                                    <span className="label">Rating</span>
                                    <span className="value">{currentShipment.transporter.rating || 'N/A'} ⭐</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Checkpoints Timeline */}
            <div className="checkpoints-section card">
                <h3>Checkpoints & Updates</h3>
                {checkpoints.length === 0 ? (
                    <p className="no-checkpoints">No checkpoints recorded yet</p>
                ) : (
                    <div className="checkpoints-timeline">
                        {checkpoints.map((checkpoint, index) => (
                            <div key={checkpoint.id} className="checkpoint-item">
                                <div className="checkpoint-marker">
                                    <div className={`marker-dot ${checkpoint.is_handoff ? 'handoff' : ''}`}></div>
                                    {index < checkpoints.length - 1 && <div className="marker-line"></div>}
                                </div>
                                <div className="checkpoint-content">
                                    <div className="checkpoint-header">
                                        <span className="checkpoint-location">{checkpoint.location}</span>
                                        <span className="checkpoint-time">{new Date(checkpoint.timestamp).toLocaleString()}</span>
                                    </div>
                                    <span className="checkpoint-status">{checkpoint.status}</span>
                                    {checkpoint.notes && <p className="checkpoint-notes">{checkpoint.notes}</p>}
                                    {checkpoint.image_url && (
                                        <img src={checkpoint.image_url} alt="Checkpoint" className="checkpoint-image" />
                                    )}
                                    {checkpoint.is_handoff && (
                                        <span className="handoff-badge">🔄 Handoff Point</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Checkpoint Modal */}
            {showCheckpointModal && (
                <div className="modal-overlay" onClick={() => setShowCheckpointModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Add Checkpoint</h2>
                        <form onSubmit={handleCheckpointSubmit}>
                            <div className="input-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Highway Rest Stop, NH-44"
                                    value={checkpointForm.location}
                                    onChange={(e) => setCheckpointForm({ ...checkpointForm, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="input-row">
                                <div className="input-group">
                                    <label>Latitude</label>
                                    <input
                                        type="number"
                                        className="input"
                                        step="any"
                                        placeholder="13.0827"
                                        value={checkpointForm.lat}
                                        onChange={(e) => setCheckpointForm({ ...checkpointForm, lat: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Longitude</label>
                                    <input
                                        type="number"
                                        className="input"
                                        step="any"
                                        placeholder="80.2707"
                                        value={checkpointForm.lng}
                                        onChange={(e) => setCheckpointForm({ ...checkpointForm, lng: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Status</label>
                                <select
                                    className="input select"
                                    value={checkpointForm.status}
                                    onChange={(e) => setCheckpointForm({ ...checkpointForm, status: e.target.value })}
                                >
                                    <option value="arrived">Arrived</option>
                                    <option value="departed">Departed</option>
                                    <option value="loading">Loading</option>
                                    <option value="unloading">Unloading</option>
                                    <option value="rest_stop">Rest Stop</option>
                                    <option value="delay">Delay</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    className="input"
                                    placeholder="Add any notes..."
                                    rows={3}
                                    value={checkpointForm.notes}
                                    onChange={(e) => setCheckpointForm({ ...checkpointForm, notes: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label>Photo (Security Verification)</label>
                                <div className="file-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setCheckpointForm({ ...checkpointForm, image: e.target.files[0] })}
                                    />
                                    <Camera size={24} />
                                    <span>{checkpointForm.image ? checkpointForm.image.name : 'Upload photo of cargo'}</span>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckpointModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Checkpoint
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Rate Your Experience</h2>
                        <form onSubmit={handleRatingSubmit}>
                            <div className="input-group">
                                <label>Rating</label>
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${star <= ratingForm.rating ? 'active' : ''}`}
                                            onClick={() => setRatingForm({ ...ratingForm, rating: star })}
                                        >
                                            <Star size={32} fill={star <= ratingForm.rating ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Review (Optional)</label>
                                <textarea
                                    className="input"
                                    placeholder="Share your experience..."
                                    rows={4}
                                    value={ratingForm.review}
                                    onChange={(e) => setRatingForm({ ...ratingForm, review: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRatingModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Submit Rating
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
