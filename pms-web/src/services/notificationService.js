import api from './api';

// Get current user's notifications
export const getNotifications = async () => {
    const response = await api.get('/notifications');
    return response.data;
};

// Get unread notification count
export const getUnreadCount = async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
};

// Mark a single notification as read
export const markAsRead = async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
};

export default {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
};
