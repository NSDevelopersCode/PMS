function TicketFilters({ filters, onFilterChange, showPriority = true }) {
    const statuses = ['All', 'Open', 'InProgress', 'Resolved', 'Reopened', 'Closed'];
    const priorities = ['All', 'Low', 'Medium', 'High', 'Critical'];

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Status Filter */}
            <select
                value={filters.status || 'All'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                >
                    {priorities.map(priority => (
                        <option key={priority} value={priority}>{priority === 'All' ? 'All Priority' : priority}</option>
                    ))}
                </select>
            )}

            {/* Clear Filters */}
            {(filters.search || filters.status !== 'All' || filters.priority !== 'All') && (
                <button
                    onClick={() => onFilterChange({ search: '', status: 'All', priority: 'All' })}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Clear
                </button>
            )}
        </div>
    );
}

export default TicketFilters;
