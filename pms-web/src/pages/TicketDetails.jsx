import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTicketById, getTicketMessages, sendTicketMessage, updateTicketStatus, closeTicket } from '../services/ticketService';

function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    const isEndUser = user?.role === 'EndUser';
    const isDeveloper = user?.role === 'Developer';
    const isAdmin = user?.role === 'Admin';
    const backPath = isEndUser ? '/user' : isDeveloper ? '/developer' : '/admin';

    const fetchData = async () => {
        try {
            const [ticketData, messagesData] = await Promise.all([
                getTicketById(id),
                getTicketMessages(id)
            ]);
            setTicket(ticketData);
            setMessages(messagesData);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load ticket');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await sendTicketMessage(id, newMessage.trim());
            setNewMessage('');
            const updatedMessages = await getTicketMessages(id);
            setMessages(updatedMessages);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async () => {
        setActionLoading(true);
        try {
            await updateTicketStatus(id, 'Resolved', 'Marked as resolved');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resolve ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        setActionLoading(true);
        try {
            await closeTicket(id, 'Ticket closed');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to close ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Open: 'bg-blue-100 text-blue-700',
            InProgress: 'bg-yellow-100 text-yellow-700',
            Resolved: 'bg-green-100 text-green-700',
            Closed: 'bg-gray-100 text-gray-700',
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            Low: 'bg-gray-100 text-gray-600',
            Medium: 'bg-blue-100 text-blue-600',
            High: 'bg-orange-100 text-orange-600',
            Critical: 'bg-red-100 text-red-600',
        };
        return styles[priority] || 'bg-gray-100 text-gray-600';
    };

    const isClosed = ticket?.status === 'Closed';
    const canResolve = isDeveloper && ticket?.status === 'InProgress';
    const canClose = (isEndUser || isAdmin) && ticket?.status === 'Resolved';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading ticket...</div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || 'Ticket not found'}</p>
                    <Link to={backPath} className="text-indigo-600 hover:text-indigo-800">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link to={backPath} className="text-gray-500 hover:text-gray-700">← Back</Link>
                        <h1 className="text-lg font-bold text-gray-900">Ticket #{ticket.id}</h1>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                        {ticket.status}
                    </span>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                        <button onClick={() => setError('')} className="ml-2">×</button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ticket Info */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{ticket.title}</h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Project</span>
                                    <span className="text-gray-900 font-medium">{ticket.projectName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Type</span>
                                    <span className="text-gray-900">{ticket.type === 'Bug' ? '🐛 Bug' : '✨ Feature'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Priority</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created By</span>
                                    <span className="text-gray-900">{ticket.createdByUserName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Assigned To</span>
                                    <span className="text-gray-900">{ticket.assignedDeveloperName || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created</span>
                                    <span className="text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {ticket.description && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-sm text-gray-600">{ticket.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {(canResolve || canClose) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                {canResolve && (
                                    <button
                                        onClick={handleResolve}
                                        disabled={actionLoading}
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        {actionLoading ? 'Resolving...' : '✓ Mark as Resolved'}
                                    </button>
                                )}
                                {canClose && (
                                    <button
                                        onClick={handleClose}
                                        disabled={actionLoading}
                                        className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        {actionLoading ? 'Closing...' : 'Close Ticket'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chat Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[500px]">
                            <div className="px-5 py-3 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900">Conversation</h3>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isOwnMessage = msg.senderId === user?.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : ''}`}>
                                                    <div className={`px-4 py-2 rounded-2xl ${isOwnMessage
                                                            ? 'bg-indigo-600 text-white rounded-br-md'
                                                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                                        }`}>
                                                        <p className="text-sm">{msg.message}</p>
                                                    </div>
                                                    <div className={`flex items-center gap-2 mt-1 text-xs ${isOwnMessage ? 'justify-end' : ''}`}>
                                                        <span className="text-gray-500">{msg.senderName}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${msg.senderRole === 'Developer' ? 'bg-blue-50 text-blue-600' :
                                                                msg.senderRole === 'Admin' ? 'bg-red-50 text-red-600' :
                                                                    'bg-green-50 text-green-600'
                                                            }`}>
                                                            {msg.senderRole}
                                                        </span>
                                                        <span className="text-gray-400">
                                                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            {isClosed ? (
                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-center text-gray-500 text-sm">
                                    This ticket is closed. Chat is read-only.
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="px-4 py-3 border-t border-gray-200 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors"
                                    >
                                        {sending ? '...' : 'Send'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default TicketDetails;
