import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

// Action icons and colors - returns function to get theme-aware colors
const getActionConfig = (isDark) => ({
    Created: { icon: '🎫', color: isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700', label: 'Ticket Created' },
    Assigned: { icon: '👤', color: isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700', label: 'Assigned' },
    Reassigned: { icon: '🔄', color: isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700', label: 'Reassigned' },
    StatusChanged: { icon: '📊', color: isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700', label: 'Status Changed' },
    PriorityChanged: { icon: '⚡', color: isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700', label: 'Priority Changed' },
    Resolved: { icon: '✅', color: isDark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-700', label: 'Resolved' },
    Closed: { icon: '🔒', color: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700', label: 'Closed' },
    Reopened: { icon: '🔓', color: isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700', label: 'Reopened' },
    Archived: { icon: '📦', color: isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600', label: 'Archived' },
    Unarchived: { icon: '📤', color: isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700', label: 'Unarchived' },
    AttachmentAdded: { icon: '📎', color: isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700', label: 'Attachment Added' },
    SatisfactionRated: { icon: '⭐', color: isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700', label: 'Satisfaction Rated' },
});

const getRoleColors = (isDark) => ({
    Admin: isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700',
    Developer: isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700',
    EndUser: isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700',
});

function TicketHistory({ ticketId }) {
    const { isDark } = useTheme();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const actionConfig = getActionConfig(isDark);
    const roleColors = getRoleColors(isDark);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get(`/tickets/${ticketId}/history`);
                setHistory(response.data);
            } catch (err) {
                setError('Failed to load history');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [ticketId]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDescription = (entry) => {
        const { Action, OldValue, NewValue, Comments } = entry;

        switch (Action) {
            case 'Created':
                return 'Created this ticket';
            case 'Assigned':
                return `Assigned to ${NewValue || 'a developer'}`;
            case 'Reassigned':
                return `Reassigned from ${OldValue || 'unassigned'} to ${NewValue}`;
            case 'StatusChanged':
                return `Changed status from ${OldValue} to ${NewValue}`;
            case 'PriorityChanged':
                return `Changed priority from ${OldValue} to ${NewValue}`;
            case 'Resolved':
                return Comments ? `Marked as resolved: ${Comments}` : 'Marked as resolved';
            case 'Closed':
                return 'Ticket closed';
            case 'Reopened':
                return Comments ? `Reopened: ${Comments}` : 'Ticket reopened';
            case 'Archived':
                return 'Ticket archived';
            case 'Unarchived':
                return 'Ticket unarchived';
            case 'AttachmentAdded':
                return `Added attachment: ${NewValue || 'file'}`;
            case 'SatisfactionRated':
                return `Rated satisfaction: ${NewValue}/5`;
            default:
                return Action;
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-500 dark:text-red-400">
                {error}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No history available
            </div>
        );
    }

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ticket History</h3>
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

                {/* Timeline entries */}
                <div className="space-y-4">
                    {history.map((entry, index) => {
                        const config = actionConfig[entry.action] || {
                            icon: '📝',
                            color: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700',
                            label: entry.action
                        };
                        const roleColor = roleColors[entry.changedByUserRole] || (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600');

                        return (
                            <div key={entry.id} className="relative flex gap-4 pl-10">
                                {/* Icon circle */}
                                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color} text-sm`}>
                                    {config.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                            {config.label}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(entry.changedAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {getDescription(entry)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>by</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{entry.changedByUserName}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${roleColor}`}>
                                            {entry.changedByUserRole}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default TicketHistory;
