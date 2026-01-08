import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { user, token } = response.data;
                    set({ user, token, isAuthenticated: true, isLoading: false });
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    return { success: true };
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error.response?.data?.error || 'Login failed'
                    });
                    return { success: false, error: error.response?.data?.error };
                }
            },

            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/register', userData);
                    const { user, token } = response.data;
                    set({ user, token, isAuthenticated: true, isLoading: false });
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    return { success: true };
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error.response?.data?.error || 'Registration failed'
                    });
                    return { success: false, error: error.response?.data?.error };
                }
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                delete api.defaults.headers.common['Authorization'];
            },

            updateProfile: async (profileData) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.put('/auth/profile', profileData);
                    set({ user: response.data, isLoading: false });
                    return { success: true };
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error.response?.data?.error || 'Update failed'
                    });
                    return { success: false };
                }
            },

            checkAuth: async () => {
                const token = get().token;
                if (!token) return;

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                try {
                    const response = await api.get('/auth/me');
                    set({ user: response.data, isAuthenticated: true });
                } catch {
                    set({ user: null, token: null, isAuthenticated: false });
                    delete api.defaults.headers.common['Authorization'];
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);

export const useShipmentStore = create((set, get) => ({
    shipments: [],
    currentShipment: null,
    isLoading: false,
    error: null,

    fetchShipments: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await api.get(`/shipments?${queryString}`);
            set({ shipments: response.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
        }
    },

    fetchAvailableShipments: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await api.get(`/shipments/available?${queryString}`);
            set({ shipments: response.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
        }
    },

    fetchShipment: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/shipments/${id}`);
            set({ currentShipment: response.data, isLoading: false });
            return response.data;
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return null;
        }
    },

    createShipment: async (shipmentData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/shipments', shipmentData);
            set((state) => ({
                shipments: [response.data, ...state.shipments],
                isLoading: false
            }));
            return { success: true, data: response.data };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false, error: error.response?.data?.error };
        }
    },

    acceptShipment: async (id, vehicleId, proposedPrice) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post(`/shipments/${id}/accept`, {
                vehicle_id: vehicleId,
                proposed_price: proposedPrice
            });
            set((state) => ({
                shipments: state.shipments.map(s =>
                    s.id === id ? response.data : s
                ),
                currentShipment: state.currentShipment?.id === id ? response.data : state.currentShipment,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false, error: error.response?.data?.error };
        }
    },

    updateStatus: async (id, status) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.put(`/shipments/${id}/status`, { status });
            set((state) => ({
                shipments: state.shipments.map(s =>
                    s.id === id ? response.data : s
                ),
                currentShipment: state.currentShipment?.id === id ? response.data : state.currentShipment,
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false };
        }
    },

    clearCurrentShipment: () => set({ currentShipment: null }),
}));

export const useVehicleStore = create((set) => ({
    vehicles: [],
    isLoading: false,
    error: null,

    fetchVehicles: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/vehicles');
            set({ vehicles: response.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
        }
    },

    fetchAvailableVehicles: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await api.get(`/vehicles/available?${queryString}`);
            set({ vehicles: response.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
        }
    },

    addVehicle: async (vehicleData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/vehicles', vehicleData);
            set((state) => ({
                vehicles: [...state.vehicles, response.data],
                isLoading: false
            }));
            return { success: true, data: response.data };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false, error: error.response?.data?.error };
        }
    },

    updateVehicle: async (id, vehicleData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.put(`/vehicles/${id}`, vehicleData);
            set((state) => ({
                vehicles: state.vehicles.map(v => v.id === id ? response.data : v),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false };
        }
    },

    deleteVehicle: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await api.delete(`/vehicles/${id}`);
            set((state) => ({
                vehicles: state.vehicles.filter(v => v.id !== id),
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ isLoading: false, error: error.response?.data?.error });
            return { success: false };
        }
    },
}));

export const useNotificationStore = create((set) => ({
    notifications: [],

    addNotification: (notification) => {
        const id = Date.now();
        set((state) => ({
            notifications: [...state.notifications, { ...notification, id }]
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id)
            }));
        }, 5000);
    },

    removeNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
        }));
    },
}));
