import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Compass, Mountain, Waves, TreePine, Building2, User, Lock, ArrowRight, Loader2, Globe } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import api from '../api/api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants';

const Agencysignin = () => {
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
        { Icon: Globe, top: '10%', left: '10%', delay: '0s', size: 36, opacity: 0.15 },
        { Icon: Building2, top: '60%', left: '5%', delay: '2s', size: 28, opacity: 0.1 },
        { Icon: Compass, top: '30%', left: '85%', delay: '4s', size: 32, opacity: 0.15 },
        { Icon: Mountain, top: '80%', left: '80%', delay: '1s', size: 24, opacity: 0.1 },
    ];

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setIsLoading(true);
        setError(null);

        try {
            const res = await api.post('api/auth/agency/login/', {
                username: formData.username,
                password: formData.password
            });

            const access = res.data.access;
            const refresh = res.data.refresh;

            localStorage.setItem(ACCESS_TOKEN, access);
            localStorage.setItem(REFRESH_TOKEN, refresh);

            try {
                const decoded = jwtDecode(access);

                localStorage.setItem('agency_username', decoded.username || 'Agency Staff');
                localStorage.setItem('agency_email', decoded.email || formData.email);

            } catch (decodeError) {
                console.error("Could not decode token", decodeError);
                localStorage.setItem('agency_username', 'Agency Staff');
                localStorage.setItem('agency_email', formData.email);
            }

            console.log('Agency Login Successful');

            const pendingData = localStorage.getItem('pending_agency_data');

            if (pendingData) {

                navigate('/agency/complete-profile');
            } else {
                navigate('/agency');
            }

        } catch (err) {
            console.error("Agency Login Failed", err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Invalid credentials. Please verify your agency account.");
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30">

            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"
                    style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y * -1}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDelay: '2s', transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y}px)` }}
                />

                {floatingIcons.map(({ Icon, top, left, delay, size, opacity }, idx) => (
                    <div
                        key={idx}
                        className="absolute text-indigo-200"
                        style={{
                            top,
                            left,
                            opacity,
                            animation: `float 8s ease-in-out infinite`,
                            animationDelay: delay,
                            filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))'
                        }}
                    >
                        <Icon size={size} strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 hover:shadow-indigo-900/20 transition-all duration-500">

                <div className="w-full md:w-5/12 bg-gradient-to-br from-indigo-900/80 to-slate-900/80 p-12 text-white relative flex flex-col justify-between border-r border-white/5">

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <Building2 size={32} className="text-white" strokeWidth={2} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-cyan-400 font-medium tracking-widest text-sm uppercase flex items-center gap-2">
                                <Globe size={14} /> Partner Portal
                            </h3>
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                                Local<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Ynk</span>
                            </h1>
                        </div>
                    </div>

                    <div className="my-12 relative z-10">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-indigo-600 rounded-full"></div>
                        <p className="pl-6 text-slate-300 leading-relaxed text-lg font-light">
                            Grow your agency. Manage packages, track bookings, and deliver world-class experiences to your clients.
                        </p>
                    </div>

                    <div className="relative z-10 flex gap-4 text-xs font-medium tracking-wide text-slate-500">
                        <span>AGENCY PARTNER PROGRAM</span>
                        <span>•</span>
                        <span>SECURE LOGIN</span>
                    </div>

                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0,100 L100,0 L100,100 Z" fill="url(#grad1)" />
                            <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'rgb(99, 102, 241)', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: 'rgb(34, 211, 238)', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                <div className="w-full md:w-7/12 p-8 md:p-16 bg-white/5 flex flex-col justify-center">

                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Agency Sign In</h2>
                            <p className="text-slate-400">Enter your partner credentials to access your dashboard.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                                <div className="p-1 bg-red-500/20 rounded-full"><EyeOff size={14} /></div>
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input
                                        type="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                                        placeholder="agency_name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-12 py-4 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.rememberMe ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-800 group-hover:border-cyan-500/50'}`}>
                                        {formData.rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="hidden"
                                    />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                                    Issue with login?
                                </a>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Enter Agency Portal</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <Link to="/agency-register" className="pt-4 text-center">
                                <p className="text-slate-500 text-sm">
                                    New partner? <button className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Register your agency</button>
                                </p>
                            </Link>
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

export default Agencysignin;
