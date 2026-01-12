import { Link } from 'react-router-dom';

function Unauthorized() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 text-center max-w-md w-full">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">
                    You don't have permission to access this page.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}

export default Unauthorized;
