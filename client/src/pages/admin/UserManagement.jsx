import { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, UserCheck, UserX, Mail, Calendar, MoreVertical } from 'lucide-react';
import api from '../../api';
import './Admin.css';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, roleFilter]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // In production, this would call an admin endpoint
            // For now, we'll use mock data
            const mockUsers = [
                { id: '1', name: 'John Shipper', email: 'john@shipper.com', role: 'shipper', is_verified: true, created_at: '2024-01-15' },
                { id: '2', name: 'Fast Trucks Co', email: 'fast@trucks.com', role: 'transporter', is_verified: true, created_at: '2024-01-10', business_name: 'Fast Trucks Co' },
                { id: '3', name: 'Admin User', email: 'admin@gmail.com', role: 'admin', is_verified: true, created_at: '2024-01-01' },
                { id: '4', name: 'New Shipper', email: 'new@shipper.com', role: 'shipper', is_verified: false, created_at: '2024-02-01' },
                { id: '5', name: 'Speedy Transport', email: 'speedy@transport.com', role: 'transporter', is_verified: true, created_at: '2024-01-20', business_name: 'Speedy Transport LLC' },
            ];
            setUsers(mockUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = [...users];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u => 
                u.name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }

        setFilteredUsers(filtered);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#ef4444';
            case 'transporter': return '#f59e0b';
            case 'shipper': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="page-header">
                <div>
                    <h1><Users size={28} /> User Management</h1>
                    <p>View and manage all platform users</p>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar card glass">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <Filter size={18} />
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="all">All Roles</option>
                        <option value="shipper">Shippers</option>
                        <option value="transporter">Transporters</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>

                <div className="user-count">
                    {filteredUsers.length} users
                </div>
            </div>

            {/* Users Table */}
            <div className="users-table card glass">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} onClick={() => setSelectedUser(user)}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar" style={{ background: getRoleColor(user.role) }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-info">
                                            <span className="user-name">{user.name}</span>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="role-badge" style={{ 
                                        background: `${getRoleColor(user.role)}20`,
                                        color: getRoleColor(user.role)
                                    }}>
                                        {user.role === 'admin' && <Shield size={14} />}
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    {user.is_verified ? (
                                        <span className="status-badge verified">
                                            <UserCheck size={14} />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="status-badge pending">
                                            <UserX size={14} />
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className="date-cell">
                                        <Calendar size={14} />
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </span>
                                </td>
                                <td>
                                    <button className="action-menu-btn">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No users found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <div className="modal-content card glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>User Details</h2>
                            <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-avatar" style={{ background: getRoleColor(selectedUser.role) }}>
                                {selectedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <h3>{selectedUser.name}</h3>
                            <p className="detail-email"><Mail size={16} /> {selectedUser.email}</p>
                            
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Role</span>
                                    <span className="detail-value">{selectedUser.role}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value">{selectedUser.is_verified ? 'Verified' : 'Pending'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Joined</span>
                                    <span className="detail-value">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                </div>
                                {selectedUser.business_name && (
                                    <div className="detail-item">
                                        <span className="detail-label">Business</span>
                                        <span className="detail-value">{selectedUser.business_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
