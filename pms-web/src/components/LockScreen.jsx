import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLockScreen } from '../hooks/useLockScreen';
function LockScreen() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { unlock, unlockWithPin, unlocking, unlockError, pinEnabled, pinStatusLoading } = useLockScreen();
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState(['', '', '', '']);
    const [usePasswordMode, setUsePasswordMode] = useState(false);
    const pinRefs = [useRef(), useRef(), useRef(), useRef()];

    // Auto-focus first PIN input when PIN mode is active
    useEffect(() => {
        if (pinEnabled && !usePasswordMode && !pinStatusLoading) {
            pinRefs[0].current?.focus();
        }
    }, [pinEnabled, usePasswordMode, pinStatusLoading]);

    // Handle PIN input change
    const handlePinChange = async (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            pinRefs[index + 1].current?.focus();
        }

        // Auto-submit when 4 digits entered
        if (value && index === 3) {
            const fullPin = newPin.join('');
            if (fullPin.length === 4) {
                const success = await unlockWithPin(fullPin);
                if (!success) {
                    // Clear PIN on error
                    setPin(['', '', '', '']);
                    pinRefs[0].current?.focus();
                }
            }
        }
    };

    // Handle backspace
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs[index - 1].current?.focus();
        }
    };

    // Handle password submit
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim() || unlocking) return;

        const success = await unlock(password);
        if (success) {
            setPassword('');
        }
    };

    // Toggle between PIN and password mode
    const toggleMode = () => {
        setUsePasswordMode(!usePasswordMode);
        setPassword('');
        setPin(['', '', '', '']);
    };

    // Determine which mode to show
    const showPinMode = pinEnabled && !usePasswordMode && !pinStatusLoading;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm" />

            {/* Lock card */}
            <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
                {/* Lock icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                    Session Locked
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                    {showPinMode ? 'Enter your PIN to unlock' : 'Enter your password to unlock'}
                </p>

                {/* User info */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${user?.role === 'Admin'
                        ? (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700')
                        : user?.role === 'Developer'
                            ? (isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700')
                            : (isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700')
                        }`}>
                        {user?.role}
                    </span>
                </div>

                {/* Loading PIN status */}
                {pinStatusLoading && (
                    <div className="flex justify-center py-4 mb-4">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                )}

                {/* Error message */}
                {unlockError && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm text-center">
                        {unlockError}
                    </div>
                )}

                {/* PIN Mode */}
                {showPinMode && (
                    <div>
                        {/* PIN Input */}
                        <div className="flex justify-center gap-3 mb-6">
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
                                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100 dark:disabled:bg-slate-800"
                                    disabled={unlocking}
                                    autoComplete="off"
                                />
                            ))}
                        </div>

                        {/* Unlocking indicator */}
                        {unlocking && (
                            <div className="flex justify-center mb-4">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <div className="w-4 h-4 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                                    <span className="text-sm">Verifying...</span>
                                </div>
                            </div>
                        )}

                        {/* Switch to password mode */}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2"
                        >
                            Use password instead
                        </button>
                    </div>
                )}

                {/* Password Mode */}
                {!showPinMode && !pinStatusLoading && (
                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-4 text-center text-lg"
                            autoFocus={!pinEnabled}
                            disabled={unlocking}
                        />
                        <button
                            type="submit"
                            disabled={!password.trim() || unlocking}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            {unlocking ? 'Verifying...' : 'Unlock'}
                        </button>

                        {/* Switch to PIN mode (if PIN enabled) */}
                        {pinEnabled && (
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2 mt-2"
                            >
                                Use PIN instead
                            </button>
                        )}
                    </form>
                )}

                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
                    Your session is still active. Locking protects your screen.
                </p>
            </div>
        </div>
    );
}

export default LockScreen;
