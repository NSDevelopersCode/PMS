import { useState, useEffect, useRef } from 'react';
import { setupPin, disablePin, getPinStatus } from '../services/authService';

function SetupPinModal({ isOpen, onClose }) {
    const [pinEnabled, setPinEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [mode, setMode] = useState('setup'); // 'setup' or 'disable'
    const pinRefs = [useRef(), useRef(), useRef(), useRef()];
    const confirmPinRefs = [useRef(), useRef(), useRef(), useRef()];

    // Load PIN status on open
    useEffect(() => {
        if (isOpen) {
            loadPinStatus();
        }
    }, [isOpen]);

    const loadPinStatus = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getPinStatus();
            setPinEnabled(response.isPinEnabled);
            setMode(response.isPinEnabled ? 'disable' : 'setup');
        } catch (err) {
            setError('Failed to load PIN status');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCurrentPassword('');
        setPin(['', '', '', '']);
        setConfirmPin(['', '', '', '']);
        setError('');
        setSuccess('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handlePinChange = (index, value, isConfirm = false) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newPin = isConfirm ? [...confirmPin] : [...pin];
        newPin[index] = value;

        if (isConfirm) {
            setConfirmPin(newPin);
        } else {
            setPin(newPin);
        }

        // Auto-focus next input
        if (value && index < 3) {
            const refs = isConfirm ? confirmPinRefs : pinRefs;
            refs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index, e, isConfirm = false) => {
        const refs = isConfirm ? confirmPinRefs : pinRefs;
        const currentPin = isConfirm ? confirmPin : pin;

        if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
            refs[index - 1].current?.focus();
        }
    };

    const handleSetupPin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const pinCode = pin.join('');
        const confirmPinCode = confirmPin.join('');

        if (pinCode.length !== 4) {
            setError('Please enter a 4-digit PIN');
            return;
        }

        if (pinCode !== confirmPinCode) {
            setError('PINs do not match');
            return;
        }

        if (!currentPassword) {
            setError('Please enter your current password');
            return;
        }

        setSubmitting(true);
        try {
            const response = await setupPin(currentPassword, pinCode);
            if (response.success) {
                setSuccess('PIN setup successful!');
                setPinEnabled(true);
                setMode('disable');
                resetForm();
                setTimeout(() => handleClose(), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to setup PIN');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDisablePin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPassword) {
            setError('Please enter your current password');
            return;
        }

        setSubmitting(true);
        try {
            const response = await disablePin(currentPassword);
            if (response.success) {
                setSuccess('PIN disabled successfully!');
                setPinEnabled(false);
                setMode('setup');
                resetForm();
                setTimeout(() => handleClose(), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to disable PIN');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-transparent dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">PIN Settings</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                        </div>
                    ) : mode === 'setup' ? (
                        <form onSubmit={handleSetupPin}>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Set up a 4-digit PIN to quickly unlock your screen instead of entering your password.
                            </p>

                            {/* Current Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    disabled={submitting}
                                />
                            </div>

                            {/* PIN Entry */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Enter 4-Digit PIN
                                </label>
                                <div className="flex justify-center gap-3">
                                    {pin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={pinRefs[index]}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                            disabled={submitting}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Confirm PIN */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm PIN
                                </label>
                                <div className="flex justify-center gap-3">
                                    {confirmPin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={confirmPinRefs[index]}
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value, true)}
                                            onKeyDown={(e) => handleKeyDown(index, e, true)}
                                            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                            disabled={submitting}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                {submitting ? 'Setting up...' : 'Enable PIN Unlock'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleDisablePin}>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PIN is Enabled</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                    You can unlock your screen using your 4-digit PIN.
                                </p>
                            </div>

                            {/* Current Password to Disable */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Enter Password to Disable PIN
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            {/* Disable Button */}
                            <button
                                type="submit"
                                disabled={submitting || !currentPassword}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                {submitting ? 'Disabling...' : 'Disable PIN Unlock'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SetupPinModal;
