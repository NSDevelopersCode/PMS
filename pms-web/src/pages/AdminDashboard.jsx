import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTickets, getTicketStats, assignTicket, archiveTicket, unarchiveTicket } from '../services/ticketService';
import { getDevelopers } from '../services/userService';
import { getProjects, createProject } from '../services/projectService';
import NotificationBell from '../components/NotificationBell';
import TicketFilters from '../components/TicketFilters';
import Pagination from '../components/Pagination';

function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [developers, setDevelopers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Assignment modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedDeveloper, setSelectedDeveloper] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState('');

    // Project modal state
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);

    // Filter and pagination state
    const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All' });
    const [currentPage, setCurrentPage] = useState(1);
    const [showArchived, setShowArchived] = useState(false);
    const [archiveConfirm, setArchiveConfirm] = useState(null); // ticket to archive (for confirmation)
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
            const [ticketData, devData, projectData] = await Promise.all([
                getTickets(showArchived),
                getDevelopers().catch(() => []), // May fail if no devs exist
                getProjects()
            ]);
            setTickets(ticketData);
            setStats(getTicketStats(ticketData));
            setDevelopers(devData);
            setProjects(projectData);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle archive toggle change
    const handleToggleArchived = () => {
        setShowArchived(!showArchived);
        setCurrentPage(1);
    };

    // Show archive confirmation
    const handleArchive = (ticket) => {
        setArchiveConfirm(ticket);
    };

    // Confirm and execute archive
    const confirmArchive = async () => {
        if (!archiveConfirm) return;
        try {
            await archiveTicket(archiveConfirm.id);
            setArchiveConfirm(null);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to archive ticket');
            setArchiveConfirm(null);
        }
    };

    // Unarchive a ticket
    const handleUnarchive = async (ticketId) => {
        try {
            await unarchiveTicket(ticketId);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to unarchive ticket');
        }
    };

    useEffect(() => {
        fetchData();
    }, [showArchived]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const openAssignModal = (ticket) => {
        setSelectedTicket(ticket);
        setSelectedDeveloper(ticket.assignedDeveloperId?.toString() || '');
        setAssignError('');
        setShowAssignModal(true);
    };

    const handleAssign = async () => {
        if (!selectedDeveloper || !selectedTicket) return;

        setAssigning(true);
        setAssignError('');
        try {
            await assignTicket(selectedTicket.id, parseInt(selectedDeveloper));
            setShowAssignModal(false);
            setSelectedTicket(null);
            setLoading(true);
            await fetchData();
        } catch (err) {
            setAssignError(err.response?.data?.message || 'Failed to assign ticket');
        } finally {
            setAssigning(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;

        setCreatingProject(true);
        try {
            await createProject(newProjectName.trim(), newProjectDesc.trim());
            setShowProjectModal(false);
            setNewProjectName('');
            setNewProjectDesc('');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create project');
        } finally {
            setCreatingProject(false);
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">PMS</h1>
                        <span className="text-gray-500 hidden sm:inline">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="/admin/users"
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                        >
                            Manage Users
                        </a>
                        <NotificationBell basePath="/admin" />
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium">{user?.name}</span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                Admin
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

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard title="Total Tickets" value={stats.total} color="indigo" />
                    <StatCard title="Open" value={stats.open} color="blue" />
                    <StatCard title="In Progress" value={stats.inProgress} color="yellow" />
                    <StatCard title="Resolved" value={stats.resolved} color="green" />
                    <div
                        onClick={() => setShowProjectModal(true)}
                        className="bg-purple-50 border border-purple-200 text-purple-600 rounded-xl p-6 cursor-pointer hover:bg-purple-100 transition-colors"
                    >
                        <p className="text-sm font-medium opacity-80">Projects</p>
                        <p className="text-3xl font-bold mt-1">{projects.length}</p>
                        <p className="text-xs mt-1 text-purple-500">+ Add New</p>
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {showArchived ? 'Archived Tickets' : 'All Tickets'}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showArchived}
                                            onChange={handleToggleArchived}
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                        />
                                        Show Archived
                                    </label>
                                    <span className="text-sm text-gray-500">
                                        Showing {paginatedTickets.length} of {filteredTickets.length} tickets
                                    </span>
                                </div>
                            </div>
                            <TicketFilters filters={filters} onFilterChange={handleFilterChange} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {projects.length === 0 ? (
                                <div>
                                    <p className="mb-4">No tickets yet. First, create a project so users can create tickets.</p>
                                    <button
                                        onClick={() => setShowProjectModal(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg"
                                    >
                                        Create First Project
                                    </button>
                                </div>
                            ) : (
                                'No tickets found'
                            )}
                        </div>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedTickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">#{ticket.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{ticket.title}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{ticket.projectName || '—'}</td>
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
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {ticket.assignedDeveloperName || <span className="text-orange-500">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {ticket.status !== 'Closed' && !ticket.isArchived && (
                                                        <button
                                                            onClick={() => openAssignModal(ticket)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                                                        >
                                                            {ticket.assignedDeveloperId ? 'Reassign' : 'Assign'}
                                                        </button>
                                                    )}
                                                    {ticket.status === 'Closed' && !ticket.isArchived && (
                                                        <button
                                                            onClick={() => handleArchive(ticket)}
                                                            className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                    {ticket.isArchived && (
                                                        <button
                                                            onClick={() => handleUnarchive(ticket.id)}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                                                        >
                                                            Unarchive
                                                        </button>
                                                    )}
                                                </div>
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

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {selectedTicket?.assignedDeveloperId ? 'Reassign Ticket' : 'Assign Ticket'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            <strong>Ticket:</strong> #{selectedTicket?.id} - {selectedTicket?.title}
                        </p>

                        {developers.length === 0 ? (
                            <p className="text-orange-600 mb-4">No developers available. Please register a developer account first.</p>
                        ) : (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Developer
                                </label>
                                <select
                                    value={selectedDeveloper}
                                    onChange={(e) => setSelectedDeveloper(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                >
                                    <option value="">-- Select Developer --</option>
                                    {developers.map((dev) => (
                                        <option key={dev.id} value={dev.id}>
                                            {dev.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {assignError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                                {assignError}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleAssign}
                                disabled={!selectedDeveloper || assigning || developers.length === 0}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                {assigning ? 'Assigning...' : 'Assign'}
                            </button>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {showProjectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Project Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g., Web Application"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    rows={3}
                                    placeholder="Optional description..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Show existing projects */}
                        {projects.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">Existing Projects:</p>
                                <div className="flex flex-wrap gap-2">
                                    {projects.map(p => (
                                        <span key={p.id} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName.trim() || creatingProject}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                {creatingProject ? 'Creating...' : 'Create Project'}
                            </button>
                            <button
                                onClick={() => setShowProjectModal(false)}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Confirmation Modal */}
            {archiveConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Ticket?</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to archive ticket <strong>#{archiveConfirm.id}</strong> - "{archiveConfirm.title}"?
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Archived tickets are hidden from default views and become read-only. You can unarchive them later.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setArchiveConfirm(null)}
                                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmArchive}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, color }) {
    const colorClasses = {
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
        green: 'bg-green-50 border-green-200 text-green-600',
    };

    return (
        <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
    );
}

export default AdminDashboard;
