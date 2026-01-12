import api from './api';

// Fetch all active projects
export const getProjects = async () => {
    const response = await api.get('/projects');
    return response.data;
};

// Fetch project by ID
export const getProjectById = async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
};

// Create a new project (Admin only)
export const createProject = async (name, description = '') => {
    const response = await api.post('/projects', { name, description });
    return response.data;
};

export default {
    getProjects,
    getProjectById,
    createProject,
};
