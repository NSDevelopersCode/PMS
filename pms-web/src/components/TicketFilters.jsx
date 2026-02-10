function TicketFilters({ filters, onFilterChange, showPriority = true, showProject = false, projects = [] }) {
    const statuses = ['All', 'Open', 'InProgress', 'Resolved', 'Reopened', 'Closed'];
    const priorities = ['All', 'Low', 'Medium', 'High', 'Critical'];

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const hasActiveFilters = filters.search ||
        filters.status !== 'All' ||
        filters.priority !== 'All' ||
        (showProject && filters.projectId && filters.projectId !== 'All');

    const handleClear = () => {
        const clearedFilters = { search: '', status: 'All', priority: 'All' };
        if (showProject) {
            clearedFilters.projectId = 'All';
        }
        onFilterChange(clearedFilters);
    };

    return (
        <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
                <input
                    type="text"
                    placeholder="Search tickets..."
                    value={filters.search || ''}
                    onChange={(e) => handleChange('search', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
            </div>

            {/* Project Filter */}
            {showProject && projects.length > 0 && (
                <select
                    value={filters.projectId || 'All'}
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                    <option value="All">All Projects</option>
                    {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                </select>
            )}

            {/* Status Filter */}
            <select
                value={filters.status || 'All'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
                {statuses.map(status => (
                    <option key={status} value={status}>{status === 'All' ? 'All Status' : status}</option>
                ))}
            </select>

            {/* Priority Filter */}
            {showPriority && (
                <select
                    value={filters.priority || 'All'}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                    {priorities.map(priority => (
                        <option key={priority} value={priority}>{priority === 'All' ? 'All Priority' : priority}</option>
                    ))}
                </select>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={handleClear}
                    className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    Clear
                </button>
            )}
        </div>
    );
}

export default TicketFilters;
