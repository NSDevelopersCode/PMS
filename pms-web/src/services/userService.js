import api from './api';

// Get all users (Admin only)
export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

// Get all developers (Admin only)
export const getDevelopers = async () => {
    const response = await api.get('/users/developers');
    return response.data;
};

// Create user (Admin only - for Developer/Admin)
export const createUser = async (name, email, password, role) => {
    const response = await api.post('/users', { name, email, password, role });
    return response.data;
};

// Update user status (Admin only)
export const updateUserStatus = async (userId, isActive) => {
    const response = await api.patch(`/users/${userId}/status`, { isActive });
    return response.data;
};

export default {
    getUsers,
    getDevelopers,
    createUser,
    updateUserStatus,
};
