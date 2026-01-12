import api from './api';

// Fetch all tickets (backend filters based on user role)
export const getTickets = async () => {
    const response = await api.get('/tickets');
    return response.data;
};

// Fetch single ticket by ID
export const getTicketById = async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
};

// Create a new ticket
export const createTicket = async (data) => {
    const response = await api.post('/tickets', data);
    return response.data;
};

// Assign ticket to developer (Admin only)
export const assignTicket = async (ticketId, developerId) => {
    const response = await api.patch(`/tickets/${ticketId}/assign`, { developerId });
    return response.data;
};

// Update ticket status
export const updateTicketStatus = async (ticketId, status, comments = '') => {
    const response = await api.patch(`/tickets/${ticketId}/status`, { status, comments });
    return response.data;
};

// Close ticket (Admin/EndUser)
export const closeTicket = async (ticketId, comments = '') => {
    const response = await api.patch(`/tickets/${ticketId}/close`, { comments });
    return response.data;
};

// Get ticket messages
export const getTicketMessages = async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}/messages`);
    return response.data;
};

// Send ticket message
export const sendTicketMessage = async (ticketId, message) => {
    const response = await api.post(`/tickets/${ticketId}/messages`, { message });
    return response.data;
};

// Compute ticket statistics from data
export const getTicketStats = (tickets) => {
    if (!Array.isArray(tickets)) return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };

    return {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        inProgress: tickets.filter(t => t.status === 'InProgress').length,
        resolved: tickets.filter(t => t.status === 'Resolved').length,
        closed: tickets.filter(t => t.status === 'Closed').length,
    };
};

export default {
    getTickets,
    getTicketById,
    createTicket,
    assignTicket,
    updateTicketStatus,
    closeTicket,
    getTicketMessages,
    sendTicketMessage,
    getTicketStats,
};
