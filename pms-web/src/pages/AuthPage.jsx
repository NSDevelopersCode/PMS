import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Helper to get dashboard route based on role
const getDashboardRoute = (role) => {
    switch (role) {
        case 'Admin': return '/admin';
        case 'Developer': return '/developer';
        case 'EndUser': return '/user';
        default: return '/';
    }
};

function AuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Sign In state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Sign Up state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Common state
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();
    const { login, register, isAuthenticated, user } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(getDashboardRoute(user.role));
        }
    }, [isAuthenticated, user, navigate]);

    const handleToggle = () => {
        setIsAnimating(true);
        setError('');
        setTimeout(() => {
            setIsSignUp(!isSignUp);
            setIsAnimating(false);
        }, 150);
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(loginEmail, loginPassword);
            if (result.success) {
                const route = getDashboardRoute(result.user?.role);
                navigate(route);
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const result = await register(name, email, password);
            if (result.success) {
                navigate('/user');
            } else {
                setError(result.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
                {/* Floating orbs */}
                <div className="floating-orb absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl"></div>
                <div className="floating-orb-delayed absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="floating-orb absolute top-1/2 left-1/3 w-48 h-48 bg-indigo-500/25 rounded-full blur-2xl"></div>
            </div>

            {/* Main container */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glass card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Header */}
                    <div className="text-center pt-10 pb-6 px-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-1">PMS</h1>
                        <p className="text-white/60 text-sm">Project Management System</p>
                    </div>

                    {/* Toggle */}
                    <div className="px-8 pb-6">
                        <div className="relative flex bg-white/10 rounded-xl p-1">
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg shadow-lg transition-all duration-300 ease-out ${isSignUp ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                            ></div>
                            <button
                                type="button"
                                onClick={() => isSignUp && handleToggle()}
                                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${!isSignUp ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => !isSignUp && handleToggle()}
                                className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${isSignUp ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mx-8 mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                            <p className="text-red-200 text-sm text-center">{error}</p>
                        </div>
                    )}

                    {/* Forms container */}
                    <div className={`px-8 pb-10 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        {!isSignUp ? (
                            /* Sign In Form */
                            <form onSubmit={handleSignIn} className="space-y-5">
                                <div className="space-y-4">
                                    {/* Email field */}
                                    <div className="group">
                                        <label className="block text-white/70 text-sm font-medium mb-2">Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                            </div>
                                            <input
                                                type="email"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                required
                                                placeholder="Enter your email"
                                                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                            />
                                        </div>
                                    </div>

                                    {/* Password field */}
                                    <div className="group">
                                        <label className="block text-white/70 text-sm font-medium mb-2">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                required
                                                placeholder="Enter your password"
                                                className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                                            >
                                                {showPassword ? (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/50 disabled:to-indigo-600/50 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </span>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* Sign Up Form */
                            <form onSubmit={handleSignUp} className="space-y-4">
                                {/* Name field */}
                                <div className="group">
                                    <label className="block text-white/70 text-sm font-medium mb-2">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            placeholder="Enter your full name"
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Email field */}
                                <div className="group">
                                    <label className="block text-white/70 text-sm font-medium mb-2">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="Enter your email"
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Password field */}
                                <div className="group">
                                    <label className="block text-white/70 text-sm font-medium mb-2">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="At least 6 characters"
                                            className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password field */}
                                <div className="group">
                                    <label className="block text-white/70 text-sm font-medium mb-2">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="w-5 h-5 text-white/40 group-focus-within:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            placeholder="Confirm your password"
                                            className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/50 disabled:to-indigo-600/50 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating account...
                                        </span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-8">
                    © 2026 PMS. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
