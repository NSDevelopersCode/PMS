import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLockScreen } from '../hooks/useLockScreen';
import NotificationBell from './NotificationBell';
import ChangePasswordModal from './ChangePasswordModal';
import SetupPinModal from './SetupPinModal';

function AppLayout() {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { lock } = useLockScreen();
    const navigate = useNavigate();
    const location = useLocation();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get role-based navigation items
    const getNavItems = () => {
        switch (user?.role) {
            case 'Admin':
                return [
                    { label: 'Dashboard', path: '/admin' },
                    { label: 'Manage Users', path: '/admin/users' },
                ];
            case 'Developer':
                return [
                    { label: 'Dashboard', path: '/developer' },
                ];
            case 'EndUser':
                return [
                    { label: 'My Tickets', path: '/user' },
                    { label: 'Create Ticket', path: '/user/create-ticket' },
                ];
            default:
                return [];
        }
    };

    // Get base path for notifications based on role
    const getBasePath = () => {
        switch (user?.role) {
            case 'Admin': return '/admin';
            case 'Developer': return '/developer';
            case 'EndUser': return '/user';
            default: return '/';
        }
    };

    // Get role badge colors
    const getRoleBadge = () => {
        switch (user?.role) {
            case 'Admin': return isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700';
            case 'Developer': return isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700';
            case 'EndUser': return isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700';
            default: return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
        }
    };

    const navItems = getNavItems();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Persistent Header */}
            <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                    {/* Logo and Navigation */}
                    <div className="flex items-center gap-6">
                        <Link to={getBasePath()} className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">PMS</h1>
                        </Link>

                        {/* Navigation Menu */}
                        <nav className="hidden sm:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right Side - Actions & User Menu */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            {isDark ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>

                        {/* Lock Button */}
                        <button
                            onClick={lock}
                            title="Lock Screen (Ctrl+Shift+L)"
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <NotificationBell basePath={getBasePath()} />

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadge()}`}>
                                    {user?.role}
                                </span>
                                <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-20">
                                        <button
                                            onClick={() => {
                                                setShowChangePassword(true);
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                        >
                                            Change Password
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowPinSetup(true);
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                        >
                                            PIN Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                lock();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                                        >
                                            Lock Screen
                                        </button>
                                        <hr className="my-1 border-gray-200 dark:border-slate-700" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="sm:hidden border-t border-gray-200 dark:border-slate-700 px-4 py-2 flex gap-1 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive
                                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {/* Page Content - Outlet renders the nested route */}
            <Outlet />

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
            />

            {/* PIN Setup Modal */}
            <SetupPinModal
                isOpen={showPinSetup}
                onClose={() => setShowPinSetup(false)}
            />
        </div>
    );
}

export default AppLayout;
