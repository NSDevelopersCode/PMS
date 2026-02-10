import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getTickets } from '../services/ticketService';
import { getProjects } from '../services/projectService';
import TicketFilters from '../components/TicketFilters';
import Pagination from '../components/Pagination';

function EndUserDashboard() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Welcome, {user?.name}!</h2>
                        <p className="text-indigo-100">
                            You have <strong>{tickets.length}</strong> ticket{tickets.length !== 1 ? 's' : ''} in the system
                        </p>
                    </div>
                    <Link
                        to="/user/create-ticket"
                        className="bg-white text-indigo-600 font-semibold py-2.5 px-5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                        + Create Ticket
                    </Link>
                </div>

                {/* Tickets List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Tickets</h2>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {paginatedTickets.length} of {filteredTickets.length} tickets
                                </span>
                            </div>
                            <TicketFilters filters={filters} onFilterChange={handleFilterChange} showProject={true} projects={projects} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading tickets...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 dark:text-red-400">{error}</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't created any tickets yet</p>
                            <Link
                                to="/user/create-ticket"
                                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Create Your First Ticket
                            </Link>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No tickets match your filters</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-slate-700">
                            {paginatedTickets.map((ticket) => (
                                <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <a href={`/user/tickets/${ticket.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">
                                                {ticket.title}
                                            </a>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {ticket.projectName} • Created {new Date(ticket.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    {ticket.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{ticket.description}</p>
                                    )}
                                </div>
                            ))}
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

export default EndUserDashboard;
