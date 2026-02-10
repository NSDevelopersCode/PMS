import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import api from '../services/api';
import { getPinStatus as fetchPinStatus, verifyPin } from '../services/authService';

const LockScreenContext = createContext(null);

const LOCK_STATE_KEY = 'pms_lock_state';

export function LockScreenProvider({ children }) {
    const [isLocked, setIsLocked] = useState(false);
    const [lockedAt, setLockedAt] = useState(null);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [pinEnabled, setPinEnabled] = useState(false);
    const [pinStatusLoading, setPinStatusLoading] = useState(false);

    // Check sessionStorage on mount
    useEffect(() => {
        const stored = sessionStorage.getItem(LOCK_STATE_KEY);
        if (stored) {
            try {
                const { isLocked: locked, lockedAt: at } = JSON.parse(stored);
                if (locked) {
                    setIsLocked(true);
                    setLockedAt(at);
                }
            } catch {
                sessionStorage.removeItem(LOCK_STATE_KEY);
            }
        }
    }, []);

    // Load PIN status when locked
    useEffect(() => {
        if (isLocked) {
            refreshPinStatus();
        }
    }, [isLocked]);

    // Refresh PIN status from server
    const refreshPinStatus = useCallback(async () => {
        setPinStatusLoading(true);
        try {
            const response = await fetchPinStatus();
            setPinEnabled(response.isPinEnabled);
        } catch {
            setPinEnabled(false);
        } finally {
            setPinStatusLoading(false);
        }
    }, []);

    // Keyboard shortcut: Ctrl+Shift+L to lock
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                if (!isLocked) {
                    const now = Date.now();
                    setIsLocked(true);
                    setLockedAt(now);
                    setUnlockError('');
                    sessionStorage.setItem(LOCK_STATE_KEY, JSON.stringify({ isLocked: true, lockedAt: now }));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLocked]);

    // Lock the screen
    const lock = useCallback(() => {
        const now = Date.now();
        setIsLocked(true);
        setLockedAt(now);
        setUnlockError('');
        sessionStorage.setItem(LOCK_STATE_KEY, JSON.stringify({ isLocked: true, lockedAt: now }));
    }, []);

    // Unlock with password verification
    const unlock = useCallback(async (password) => {
        setUnlocking(true);
        setUnlockError('');

        try {
            const response = await api.post('/auth/verify-password', { password });
            if (response.data.success) {
                setIsLocked(false);
                setLockedAt(null);
                sessionStorage.removeItem(LOCK_STATE_KEY);
                return true;
            }
        } catch (err) {
            setUnlockError(err.response?.data?.message || 'Invalid password');
        } finally {
            setUnlocking(false);
        }
        return false;
    }, []);

    // Unlock with PIN verification
    const unlockWithPin = useCallback(async (pin) => {
        setUnlocking(true);
        setUnlockError('');

        try {
            const response = await verifyPin(pin);
            if (response.success) {
                setIsLocked(false);
                setLockedAt(null);
                sessionStorage.removeItem(LOCK_STATE_KEY);
                return true;
            }
        } catch (err) {
            setUnlockError(err.response?.data?.message || 'Invalid PIN');
        } finally {
            setUnlocking(false);
        }
        return false;
    }, []);

    // Clear lock on logout
    const clearLock = useCallback(() => {
        setIsLocked(false);
        setLockedAt(null);
        sessionStorage.removeItem(LOCK_STATE_KEY);
    }, []);

    return (
        <LockScreenContext.Provider value={{
            isLocked,
            lockedAt,
            unlocking,
            unlockError,
            pinEnabled,
            pinStatusLoading,
            lock,
            unlock,
            unlockWithPin,
            clearLock,
            refreshPinStatus
        }}>
            {children}
        </LockScreenContext.Provider>
    );
}

export function useLockScreen() {
    const context = useContext(LockScreenContext);
    if (!context) {
        throw new Error('useLockScreen must be used within LockScreenProvider');
    }
    return context;
}
