import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTickets, updateTicketStatus } from '../services/ticketService';
import NotificationBell from '../components/NotificationBell';
import TicketFilters from '../components/TicketFilters';
import Pagination from '../components/Pagination';

function DeveloperDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resolvingId, setResolvingId] = useState(null);

    // Filter and pagination state
    const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All' });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Filter tickets
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = !filters.search ||
                ticket.title.toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
            const matchesPriority = filters.priority === 'All' || ticket.priority === filters.priority;
            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [tickets, filters]);

    // Paginated tickets
    const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTickets, currentPage]);

    // Reset page when filters change
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const fetchData = async () => {
        try {
            const data = await getTickets();
            setTickets(data);
        } catch (err) {
            setError('Failed to load tickets');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleResolve = async (ticketId) => {
        setResolvingId(ticketId);
        setError('');
        try {
            await updateTicketStatus(ticketId, 'Resolved', 'Marked as resolved by developer');
            // Reload data
            setLoading(true);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resolve ticket');
        } finally {
            setResolvingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Open: 'bg-blue-100 text-blue-700',
            InProgress: 'bg-yellow-100 text-yellow-700',
            Resolved: 'bg-green-100 text-green-700',
            Reopened: 'bg-orange-100 text-orange-700',
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

    const inProgressTickets = tickets.filter(t => t.status === 'InProgress');
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">PMS</h1>
                        <span className="text-gray-500 hidden sm:inline">Developer Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell basePath="/developer" />
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium">{user?.name}</span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                Developer
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 text-red-500">×</button>
                    </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <p className="text-sm font-medium text-yellow-700">In Progress</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">{inProgressTickets.length}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <p className="text-sm font-medium text-green-700">Resolved</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">{resolvedTickets.length}</p>
                    </div>
                </div>

                {/* Tickets List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900">My Assigned Tickets</h2>
                                <span className="text-sm text-gray-500">
                                    Showing {paginatedTickets.length} of {filteredTickets.length} tickets
                                </span>
                            </div>
                            <TicketFilters filters={filters} onFilterChange={handleFilterChange} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No tickets assigned to you</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No tickets match your filters</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedTickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">#{ticket.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <a href={`/developer/tickets/${ticket.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                                                    {ticket.title}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {ticket.projectName || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {ticket.status === 'InProgress' && (
                                                    <button
                                                        onClick={() => handleResolve(ticket.id)}
                                                        disabled={resolvingId === ticket.id}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                                                    >
                                                        {resolvingId === ticket.id ? 'Resolving...' : 'Resolve'}
                                                    </button>
                                                )}
                                                {ticket.status === 'Resolved' && (
                                                    <span className="text-green-600 text-sm">✓ Done</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && filteredTickets.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default DeveloperDashboard;
