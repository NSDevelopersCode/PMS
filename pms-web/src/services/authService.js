import api from './api';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'pms_token';
const USER_KEY = 'pms_user';

/**
 * Decode JWT token to get user info
 */
export const decodeToken = (token) => {
    try {
        const decoded = jwtDecode(token);
        return {
            userId: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
            name: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
            email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
            role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
            exp: decoded.exp,
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
    try {
        const decoded = jwtDecode(token);
        return decoded.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

/**
 * Register a new user
 */
export const register = async (name, email, password, role = 'EndUser') => {
    const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
    });

    if (response.data.success && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
};

/**
 * Login user
 */
export const login = async (email, password) => {
    const response = await api.post('/auth/login', {
        email,
        password,
    });

    if (response.data.success && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
};

/**
 * Logout user
 */
export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

/**
 * Get current user from storage
 */
export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

/**
 * Get current token
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;
    return !isTokenExpired(token);
};

export default {
    register,
    login,
    logout,
    getCurrentUser,
    getToken,
    isAuthenticated,
    decodeToken,
};
