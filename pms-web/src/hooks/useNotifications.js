import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';

const API_URL = 'http://localhost:5000';

export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const connectionRef = useRef(null);
    const fetchedRef = useRef(false);

    // Unread count is simply the length of notifications (since we only store unread)
    const unreadCount = notifications.length;

    // Fetch initial notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const notifs = await getNotifications();
            setNotifications(notifs);
            setError(null);
            console.log('Notifications fetched:', notifs.length);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            setError(err.message);
        }
    }, []);

    // Fetch on mount (regardless of SignalR)
    useEffect(() => {
        if (!fetchedRef.current) {
            fetchedRef.current = true;
            fetchNotifications();
        }
    }, [fetchNotifications]);

    // Connect to SignalR hub
    useEffect(() => {
        const token = localStorage.getItem('pms_token');
        if (!token) {
            console.log('No token found, skipping SignalR connection');
            return;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/hubs/notifications`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        // Handle receiving new notification
        connection.on('ReceiveNotification', (notification) => {
            console.log('Received notification via SignalR:', notification);
            // Prevent duplicates by checking if notification already exists
            setNotifications(prev => {
                const exists = prev.some(n => n.id === notification.id);
                if (exists) {
                    console.log('Duplicate notification skipped:', notification.id);
                    return prev;
                }
                return [notification, ...prev];
            });
        });

        // Connection state changes
        connection.onreconnecting(() => {
            console.log('SignalR reconnecting...');
            setIsConnected(false);
        });

        connection.onreconnected(() => {
            console.log('SignalR reconnected');
            setIsConnected(true);
            fetchNotifications(); // Refresh on reconnect
        });

        connection.onclose(() => {
            console.log('SignalR connection closed');
            setIsConnected(false);
        });

        // Start connection
        connection.start()
            .then(() => {
                console.log('SignalR connected successfully');
                setIsConnected(true);
            })
            .catch(err => {
                console.error('SignalR connection failed:', err);
                setIsConnected(false);
            });

        // Cleanup on unmount
        return () => {
            if (connection.state === signalR.HubConnectionState.Connected) {
                connection.stop();
            }
        };
    }, [fetchNotifications]);

    // Mark notification as read - removes from list
    const handleMarkAsRead = useCallback(async (notificationId) => {
        try {
            await markAsRead(notificationId);
            // Remove the notification from the list (count updates automatically)
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }, []);

    // Mark all as read - clears the list
    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllAsRead();
            // Clear all notifications (count updates automatically)
            setNotifications([]);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    return {
        notifications,
        unreadCount,
        isConnected,
        error,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        refetch: fetchNotifications
    };
}

export default useNotifications;
