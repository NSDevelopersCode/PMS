import api from './api';

// Fetch all tickets (backend filters based on user role)
// By default excludes archived tickets. Pass includeArchived=true to include them.
export const getTickets = async (includeArchived = false) => {
    const response = await api.get('/tickets', { params: { includeArchived } });
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

// Close ticket with optional satisfaction rating (Admin/EndUser)
export const closeTicket = async (ticketId, { comments = '', satisfactionScore = null, satisfactionComment = '' } = {}) => {
    const payload = { comments };
    if (satisfactionScore !== null) {
        payload.satisfactionScore = satisfactionScore;
        payload.satisfactionComment = satisfactionComment;
    }
    const response = await api.patch(`/tickets/${ticketId}/close`, payload);
    return response.data;
};

// Reopen ticket (EndUser owner or Admin)
export const reopenTicket = async (ticketId, comment) => {
    const response = await api.patch(`/tickets/${ticketId}/reopen`, { comment });
    return response.data;
};

// Archive closed ticket (Admin only)
export const archiveTicket = async (ticketId) => {
    const response = await api.patch(`/tickets/${ticketId}/archive`);
    return response.data;
};

// Unarchive ticket (Admin only)
export const unarchiveTicket = async (ticketId) => {
    const response = await api.patch(`/tickets/${ticketId}/unarchive`);
    return response.data;
};

// Get ticket messages
export const getTicketMessages = async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}/messages`);
    return response.data;
};

// Send ticket message with optional file attachments
export const sendTicketMessage = async (ticketId, message, files = []) => {
    const formData = new FormData();
    if (message) {
        formData.append('message', message);
    }
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('files', file);
        });
    }
    const response = await api.post(`/tickets/${ticketId}/messages`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Download attachment - returns blob URL
export const downloadAttachment = async (attachmentId) => {
    const response = await api.get(`/attachments/${attachmentId}`, {
        responseType: 'blob',
    });
    return {
        url: URL.createObjectURL(response.data),
        contentType: response.headers['content-type'],
        filename: response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'download',
    };
};

// Get attachment download URL (for direct linking)
export const getAttachmentUrl = (attachmentId) => {
    return `${api.defaults.baseURL}/attachments/${attachmentId}`;
};

// Compute ticket statistics from data
export const getTicketStats = (tickets) => {
    if (!Array.isArray(tickets)) return { total: 0, open: 0, inProgress: 0, resolved: 0, reopened: 0, closed: 0 };

    return {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        inProgress: tickets.filter(t => t.status === 'InProgress').length,
        resolved: tickets.filter(t => t.status === 'Resolved').length,
        reopened: tickets.filter(t => t.status === 'Reopened').length,
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
    reopenTicket,
    getTicketMessages,
    sendTicketMessage,
    downloadAttachment,
    getAttachmentUrl,
    getTicketStats,
};
