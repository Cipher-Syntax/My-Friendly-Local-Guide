import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Compass, Mountain, Waves, TreePine, Shield, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import api from '../api/api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants';

const Adminsignin = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth) * 20,
                y: (e.clientY / window.innerHeight) * 20,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const floatingIcons = [
        { Icon: Mountain, top: '15%', left: '15%', delay: '0s', size: 32, opacity: 0.2 },
        { Icon: Waves, top: '65%', left: '10%', delay: '2s', size: 28, opacity: 0.15 },
        { Icon: TreePine, top: '40%', left: '85%', delay: '4s', size: 30, opacity: 0.2 },
        { Icon: Shield, top: '80%', left: '80%', delay: '1s', size: 24, opacity: 0.15 },
        { Icon: Compass, top: '20%', left: '80%', delay: '3s', size: 40, opacity: 0.1 }
    ];

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await api.post('api/auth/admin/login/', {
                username: formData.username,
                password: formData.password
            });

            const access = res.data.access;
            const refresh = res.data.refresh;

            localStorage.setItem(ACCESS_TOKEN, access);
            localStorage.setItem(REFRESH_TOKEN, refresh);

            try {
                const decoded = jwtDecode(access);
                localStorage.setItem('admin_username', decoded.username || 'Admin');
                localStorage.setItem('admin_email', decoded.email || formData.email);
            } catch (decodeError) {
                console.error("Could not decode token", decodeError);
                localStorage.setItem('admin_username', 'Admin');
                localStorage.setItem('admin_email', formData.email);
            }

            console.log('Admin logged in successfully');
            navigate('/admin');

        } catch (err) {
            console.error("Login error:", err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Invalid credentials. Access denied.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (error) setError(null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-teal-500/30 transition-colors duration-300">

            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse"
                    style={{ transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y * -1}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 dark:bg-teal-600/10 rounded-full blur-[120px] animate-pulse"
                    style={{ animationDelay: '2s', transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
                />

                {floatingIcons.map(({ Icon, top, left, delay, size, opacity }, idx) => (
                    <div
                        key={idx}
                        className="absolute text-teal-600/40 dark:text-teal-200"
                        style={{
                            top,
                            left,
                            opacity: opacity * 2, // slightly more visible in light mode
                            animation: `float 8s ease-in-out infinite`,
                            animationDelay: delay,
                            filter: 'drop-shadow(0 0 10px rgba(45, 212, 191, 0.3))'
                        }}
                    >
                        <Icon size={size} strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            <div className="w-full max-w-5xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 hover:shadow-teal-500/10 dark:hover:shadow-teal-900/20 transition-all duration-500">

                <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-100/90 to-slate-200/90 dark:from-slate-900/80 dark:to-slate-800/80 p-12 text-slate-900 dark:text-white relative flex flex-col justify-between border-r border-slate-200 dark:border-white/5 transition-colors duration-300">

                    <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            <Compass size={32} className="text-white" strokeWidth={2} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-teal-600 dark:text-teal-400 font-bold tracking-widest text-sm uppercase">Admin Portal</h3>
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Loca<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-400">Lynk</span>
                            </h1>
                        </div>
                    </div>

                    <div className="my-12 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-transparent rounded-full"></div>
                        <p className="pl-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium dark:font-light">
                            Curate extraordinary journeys. Manage destinations, guides, and experiences from one central command center.
                        </p>
                    </div>

                    <div className="text-slate-500 dark:text-slate-500 text-xs font-bold tracking-wide">
                        &copy; {new Date().getFullYear()} LOCALYNK PLATFORM. SECURE CONNECTION.
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 md:p-16 bg-white/50 dark:bg-white/5 flex flex-col justify-center transition-colors duration-300">

                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your credentials to continue.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                                <Shield className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 font-medium"
                                        placeholder="admin_User"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 font-medium"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.rememberMe ? 'bg-teal-500 border-teal-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 group-hover:border-teal-500/50'}`}>
                                        {formData.rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="hidden"
                                    />
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">Keep me signed in</span>
                                </label>
                                {/* <a href="#" className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold transition-colors">
                                    Forgot Password?
                                </a> */}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 dark:hover:from-teal-400 dark:hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 dark:shadow-teal-500/20 hover:shadow-teal-500/50 dark:hover:shadow-teal-500/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Access Dashboard</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
            `}</style>
        </div>
    );
};

export default Adminsignin;