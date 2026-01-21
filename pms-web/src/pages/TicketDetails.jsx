import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTicketById, getTicketMessages, sendTicketMessage, updateTicketStatus, closeTicket, reopenTicket, downloadAttachment } from '../services/ticketService';

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log', '.json'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_OTHER_SIZE = 2 * 1024 * 1024; // 2MB

function TicketDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenComment, setReopenComment] = useState('');
    // Close modal with optional rating
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [rating, setRating] = useState(0);  // 0 = not rated, 1-5 = rating
    const [ratingComment, setRatingComment] = useState('');

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
        if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

        setSending(true);
        try {
            await sendTicketMessage(id, newMessage.trim() || null, selectedFiles);
            setNewMessage('');
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
            const updatedMessages = await getTicketMessages(id);
            setMessages(updatedMessages);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setError(`File type ${ext} is not allowed`);
                continue;
            }
            const isImage = file.type.startsWith('image/');
            const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_OTHER_SIZE;
            if (file.size > maxSize) {
                setError(`File ${file.name} exceeds ${isImage ? '5MB' : '2MB'} limit`);
                continue;
            }
            validFiles.push(file);
        }
        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDownload = async (attachment) => {
        try {
            const { url, filename } = await downloadAttachment(attachment.id);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.originalFileName || filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to download file');
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
            const closeData = {
                comments: 'Ticket accepted and closed'
            };
            // Only include rating if user provided one
            if (rating > 0) {
                closeData.satisfactionScore = rating;
                closeData.satisfactionComment = ratingComment.trim();
            }
            await closeTicket(id, closeData);
            setShowCloseModal(false);
            setRating(0);
            setRatingComment('');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to close ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReopen = async () => {
        if (!reopenComment.trim()) {
            setError('Please provide a reason for requesting changes');
            return;
        }
        setActionLoading(true);
        try {
            await reopenTicket(id, reopenComment.trim());
            setShowReopenModal(false);
            setReopenComment('');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reopen ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartProgress = async () => {
        setActionLoading(true);
        try {
            await updateTicketStatus(id, 'InProgress', 'Started working on reopened ticket');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Open: 'bg-blue-100 text-blue-700',
            InProgress: 'bg-yellow-100 text-yellow-700',
            Resolved: 'bg-green-100 text-green-700',
            Reopened: 'bg-purple-100 text-purple-700',
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
    const isResolved = ticket?.status === 'Resolved';
    const isReopened = ticket?.status === 'Reopened';
    const isInProgress = ticket?.status === 'InProgress';
    const isArchived = ticket?.isArchived === true;

    // Developer can resolve when InProgress, or start progress on Reopened tickets (not archived)
    const canResolve = isDeveloper && isInProgress && !isArchived;
    const canStartProgress = isDeveloper && isReopened && !isArchived;

    // EndUser can Accept & Close OR Request Changes when Resolved (not archived)
    const canAcceptClose = isEndUser && isResolved && !isArchived;
    const canRequestChanges = isEndUser && isResolved && !isArchived;

    // Admin can close resolved tickets (not archived)
    const canAdminClose = isAdmin && isResolved && !isArchived;

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

                {/* Archived Banner */}
                {isArchived && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        <span>This ticket is archived and read-only. No actions can be performed.</span>
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
                        {!isClosed && (canResolve || canStartProgress || canAcceptClose || canRequestChanges || canAdminClose) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                                {/* Developer: Start Progress on Reopened ticket */}
                                {canStartProgress && (
                                    <button
                                        onClick={handleStartProgress}
                                        disabled={actionLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        {actionLoading ? 'Updating...' : '▶ Start Progress'}
                                    </button>
                                )}
                                {/* Developer: Resolve when InProgress */}
                                {canResolve && (
                                    <button
                                        onClick={handleResolve}
                                        disabled={actionLoading}
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        {actionLoading ? 'Resolving...' : '✓ Mark as Resolved'}
                                    </button>
                                )}
                                {/* EndUser: Accept & Close */}
                                {canAcceptClose && (
                                    <button
                                        onClick={() => setShowCloseModal(true)}
                                        disabled={actionLoading}
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        {actionLoading ? 'Closing...' : '✓ Accept & Close'}
                                    </button>
                                )}
                                {/* EndUser: Request Changes */}
                                {canRequestChanges && (
                                    <button
                                        onClick={() => setShowReopenModal(true)}
                                        disabled={actionLoading}
                                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                                    >
                                        ↺ Request Changes
                                    </button>
                                )}
                                {/* Admin: Close resolved ticket */}
                                {canAdminClose && (
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
                                                        {msg.message && <p className="text-sm">{msg.message}</p>}
                                                        {/* Attachments */}
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className={`mt-2 space-y-2 ${!msg.message ? 'pt-0' : ''}`}>
                                                                {msg.attachments.map(att => {
                                                                    const isImage = att.contentType?.startsWith('image/');
                                                                    return (
                                                                        <div key={att.id} className="flex items-center gap-2">
                                                                            {isImage ? (
                                                                                <button
                                                                                    onClick={() => handleDownload(att)}
                                                                                    className={`block rounded-lg overflow-hidden border ${isOwnMessage ? 'border-indigo-400' : 'border-gray-300'} hover:opacity-80 transition-opacity`}
                                                                                >
                                                                                    <div className="flex items-center gap-2 p-2">
                                                                                        <span className="text-lg">🖼️</span>
                                                                                        <span className={`text-xs ${isOwnMessage ? 'text-indigo-100' : 'text-gray-600'}`}>
                                                                                            {att.originalFileName}
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleDownload(att)}
                                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isOwnMessage
                                                                                            ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                                                                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                                                        }`}
                                                                                >
                                                                                    <span>📎</span>
                                                                                    <span className="max-w-[150px] truncate">{att.originalFileName}</span>
                                                                                    <span className="opacity-70">({(att.fileSize / 1024).toFixed(1)}KB)</span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
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
                            {(isClosed || isArchived) ? (
                                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-center text-gray-500 text-sm">
                                    {isArchived ? 'This ticket is archived.' : 'This ticket is closed.'} Chat is read-only.
                                </div>
                            ) : (
                                <div className="border-t border-gray-200">
                                    {/* Selected Files Preview */}
                                    {selectedFiles.length > 0 && (
                                        <div className="px-4 py-2 bg-gray-50 flex flex-wrap gap-2">
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs">
                                                    <span>{file.type.startsWith('image/') ? '🖼️' : '📎'}</span>
                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(index)}
                                                        className="text-gray-400 hover:text-red-500 ml-1"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <form onSubmit={handleSendMessage} className="px-4 py-3 flex gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            multiple
                                            accept=".png,.jpg,.jpeg,.pdf,.txt,.log,.json"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                                            title="Attach file"
                                        >
                                            📎
                                        </button>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                                        />
                                        <button
                                            type="submit"
                                            disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors"
                                        >
                                            {sending ? '...' : 'Send'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Reopen Modal */}
            {showReopenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Request Changes</h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            Please describe why you are requesting changes. This will reopen the ticket for the developer.
                        </p>

                        <textarea
                            value={reopenComment}
                            onChange={(e) => setReopenComment(e.target.value)}
                            placeholder="Explain what needs valid fix or changes..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-6 h-32 resize-none"
                            autoFocus
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowReopenModal(false);
                                    setReopenComment('');
                                }}
                                disabled={actionLoading}
                                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReopen}
                                disabled={!reopenComment.trim() || actionLoading}
                                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors"
                            >
                                {actionLoading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Modal with Optional Rating */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Accept & Close Ticket</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            The ticket will be marked as closed. You can optionally rate your experience.
                        </p>

                        {/* Star Rating */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                How satisfied are you? <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(rating === star ? 0 : star)}
                                        className={`text-3xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {rating === 1 && 'Poor'}
                                    {rating === 2 && 'Fair'}
                                    {rating === 3 && 'Good'}
                                    {rating === 4 && 'Very Good'}
                                    {rating === 5 && 'Excellent'}
                                </p>
                            )}
                        </div>

                        {/* Comment */}
                        {rating > 0 && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Any feedback? <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    placeholder="Share your thoughts about this resolution..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-24 resize-none"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowCloseModal(false);
                                    setRating(0);
                                    setRatingComment('');
                                }}
                                disabled={actionLoading}
                                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClose}
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
                            >
                                {actionLoading ? 'Closing...' : 'Close Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TicketDetails;
