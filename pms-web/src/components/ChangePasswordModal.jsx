import { useState } from 'react';
import api from '../services/api';

function ChangePasswordModal({ isOpen, onClose }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Client-side validation
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });

            if (response.data.success) {
                setSuccess(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Auto-close after 2 seconds
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-transparent dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Change Password</h2>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-green-600 dark:text-green-400 font-medium">Password changed successfully!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                required
                                minLength={8}
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 8 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-medium rounded-lg transition-colors"
                            >
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ChangePasswordModal;
