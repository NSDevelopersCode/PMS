import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, isAuthenticated, getToken, decodeToken } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = () => {
            if (isAuthenticated()) {
                const storedUser = getCurrentUser();
                const token = getToken();
                if (storedUser && token) {
                    const decoded = decodeToken(token);
                    setUser({
                        ...storedUser,
                        role: decoded?.role || storedUser.role,
                    });
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        const result = await apiLogin(email, password);
        if (result.success && result.user) {
            const token = getToken();
            const decoded = decodeToken(token);
            setUser({
                ...result.user,
                role: decoded?.role || result.user.role,
            });
        }
        return result;
    };

    const register = async (name, email, password, role) => {
        const result = await apiRegister(name, email, password, role);
        if (result.success && result.user) {
            const token = getToken();
            const decoded = decodeToken(token);
            setUser({
                ...result.user,
                role: decoded?.role || result.user.role,
            });
        }
        return result;
    };

    const logout = () => {
        apiLogout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
        isDeveloper: user?.role === 'Developer',
        isEndUser: user?.role === 'EndUser',
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
