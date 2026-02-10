import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getTickets, updateTicketStatus } from '../services/ticketService';
import { getProjects } from '../services/projectService';
import TicketFilters from '../components/TicketFilters';
import Pagination from '../components/Pagination';

function DeveloperDashboard() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resolvingId, setResolvingId] = useState(null);

    // Filter and pagination state
    const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All', projectId: 'All' });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Filter tickets
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = !filters.search ||
                ticket.title.toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
            const matchesPriority = filters.priority === 'All' || ticket.priority === filters.priority;
            const matchesProject = filters.projectId === 'All' || ticket.projectId === parseInt(filters.projectId);
            return matchesSearch && matchesStatus && matchesPriority && matchesProject;
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
            const [ticketData, projectData] = await Promise.all([
                getTickets(),
                getProjects()
            ]);
            setTickets(ticketData);
            setProjects(projectData);
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
            Open: isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700',
            InProgress: isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
            Resolved: isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700',
            Reopened: isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700',
            Closed: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700',
        };
        return styles[status] || (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700');
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            Low: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
            Medium: isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600',
            High: isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-600',
            Critical: isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600',
        };
        return styles[priority] || (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600');
    };

    const inProgressTickets = tickets.filter(t => t.status === 'InProgress');
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 text-red-500 dark:text-red-400">×</button>
                    </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={`rounded-xl border p-6 ${isDark ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                        <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>In Progress</p>
                        <p className={`text-3xl font-bold mt-1 ${isDark ? 'text-yellow-200' : 'text-yellow-600'}`}>{inProgressTickets.length}</p>
                    </div>
                    <div className={`rounded-xl border p-6 ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'}`}>
                        <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>Resolved</p>
                        <p className={`text-3xl font-bold mt-1 ${isDark ? 'text-green-200' : 'text-green-600'}`}>{resolvedTickets.length}</p>
                    </div>
                </div>

                {/* Tickets List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Assigned Tickets</h2>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {paginatedTickets.length} of {filteredTickets.length} tickets
                                </span>
                            </div>
                            <TicketFilters filters={filters} onFilterChange={handleFilterChange} showProject={true} projects={projects} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tickets assigned to you</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tickets match your filters</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {paginatedTickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">#{ticket.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <a href={`/developer/tickets/${ticket.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">
                                                    {ticket.title}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
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
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                                                    >
                                                        {resolvingId === ticket.id ? 'Resolving...' : 'Resolve'}
                                                    </button>
                                                )}
                                                {ticket.status === 'Resolved' && (
                                                    <span className="text-green-600 dark:text-green-400 text-sm">✓ Done</span>
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
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
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
