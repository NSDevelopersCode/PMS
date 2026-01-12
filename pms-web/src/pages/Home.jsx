import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Helper to get dashboard route based on role
const getDashboardRoute = (role) => {
  switch (role) {
    case 'Admin': return '/admin';
    case 'Developer': return '/developer';
    case 'EndUser': return '/user';
    default: return '/';
  }
};

function Home() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 text-center shadow-2xl border border-white/20 max-w-md w-full">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">PMS</h1>
        <p className="text-xl text-white/80 mb-8">Project Management System</p>
        <div className="flex flex-col gap-3">
          {isAuthenticated ? (
            <Link
              to={getDashboardRoute(user?.role)}
              className="bg-white text-indigo-600 font-semibold py-3 px-6 rounded-lg hover:bg-white/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-white text-indigo-600 font-semibold py-3 px-6 rounded-lg hover:bg-white/90 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-transparent text-white font-semibold py-3 px-6 rounded-lg border-2 border-white/50 hover:bg-white/10 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
