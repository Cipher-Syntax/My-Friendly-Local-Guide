import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Compass, Mountain, Waves, TreePine, Building2, User, Lock, ArrowRight, Loader2, Globe, CheckCircle, RefreshCcw } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import api from '../api/api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants';

const Agencysignin = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rememberMe: false
    });

    useEffect(() => {
        const status = searchParams.get('status');
        const message = searchParams.get('message');

        if (status === 'success' && message) {
            setSuccessMsg(message.replace(/\+/g, ' '));
            setSearchParams(new URLSearchParams());
        } else if (status === 'error' && message) {
            setError(message.replace(/\+/g, ' '));
            setSearchParams(new URLSearchParams());
        }
    }, [searchParams, setSearchParams]);

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

    const isDeactivatedError = typeof error === 'string' && (
        error.toLowerCase().includes('inactive') ||
        error.toLowerCase().includes('deactivated') ||
        error.toLowerCase().includes('reactivate')
    );

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

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
            }

            const profileRes = await api.get('api/profile/');
            const userProfile = profileRes.data;

            if (userProfile.agency_profile) {
                localStorage.removeItem('pending_agency_data');
                navigate('/agency');
            } else {
                // FIX: Removed the strict check! We don't care if local storage is empty anymore.
                // If they have an account but no agency profile, ALWAYS send them here to finish uploading.
                navigate('/agency/complete-profile');
            }

        } catch (err) {
            console.error("Agency Login Failed", err);

            let errMsg = "Invalid credentials. Please verify your agency account.";
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data.detail === 'string') errMsg = data.detail;
                else if (Array.isArray(data.detail)) errMsg = data.detail[0];
                else if (Array.isArray(data.non_field_errors)) errMsg = data.non_field_errors[0];
                else if (typeof data === 'string') errMsg = data;
            }
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivate = async (e) => {
        if (e) e.preventDefault();

        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const res = await api.post('api/auth/reactivate/', {
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
            }

            setSuccessMsg("Account reactivated successfully! Logging you in...");

            setTimeout(() => {
                navigate('/agency');
            }, 1000);

        } catch (err) {
            console.error("Reactivation Failed", err);

            let errMsg = "Invalid credentials. Could not reactivate account.";
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data.detail === 'string') errMsg = data.detail;
                else if (Array.isArray(data.detail)) errMsg = data.detail[0];
                else if (Array.isArray(data.non_field_errors)) errMsg = data.non_field_errors[0];
                else if (typeof data === 'string') errMsg = data;
            }
            setError(errMsg);
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
            if (isDeactivatedError) {
                handleReactivate();
            } else {
                handleSubmit();
            }
        }
    };

    let mainButtonAction = handleSubmit;
    let mainButtonText = "Enter Agency Portal";
    let mainButtonGradient = "from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 dark:hover:from-cyan-500 dark:hover:to-indigo-500";
    let ButtonIcon = ArrowRight;

    if (isDeactivatedError) {
        mainButtonAction = handleReactivate;
        mainButtonText = "Reactivate Account";
        mainButtonGradient = "from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 dark:hover:from-orange-400 dark:hover:to-rose-500";
        ButtonIcon = RefreshCcw;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30 transition-colors duration-300">

            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"
                    style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y * -1}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/20 dark:bg-cyan-600/10 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDelay: '2s', transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y}px)` }}
                />

                {floatingIcons.map(({ Icon, top, left, delay, size, opacity }, idx) => (
                    <div
                        key={idx}
                        className="absolute text-indigo-600/30 dark:text-indigo-200"
                        style={{
                            top,
                            left,
                            opacity: opacity * 2,
                            animation: `float 8s ease-in-out infinite`,
                            animationDelay: delay,
                            filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))'
                        }}
                    >
                        <Icon size={size} strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            <div className="w-full max-w-5xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20 transition-all duration-500">

                <div className="w-full md:w-5/12 bg-gradient-to-br from-indigo-50/90 to-slate-100/90 dark:from-indigo-900/80 dark:to-slate-900/80 p-12 text-slate-900 dark:text-white relative flex flex-col justify-between border-r border-slate-200 dark:border-white/5 transition-colors duration-300">

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 dark:from-cyan-400 dark:to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <Building2 size={32} className="text-white" strokeWidth={2} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-cyan-600 dark:text-cyan-400 font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                                <Globe size={14} /> Partner Portal
                            </h3>
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Local<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400">Ynk</span>
                            </h1>
                        </div>
                    </div>

                    <div className="my-12 relative z-10">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-indigo-600 rounded-full"></div>
                        <p className="pl-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium dark:font-light">
                            Grow your agency. Manage packages, track bookings, and deliver world-class experiences to your clients.
                        </p>
                    </div>

                    <div className="relative z-10 flex gap-4 text-xs font-bold tracking-wide text-slate-500 dark:text-slate-500">
                        <span>AGENCY PARTNER PROGRAM</span>
                        <span>•</span>
                        <span>SECURE LOGIN</span>
                    </div>

                    <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
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

                <div className="w-full md:w-7/12 p-8 md:p-16 bg-white/50 dark:bg-white/5 flex flex-col justify-center transition-colors duration-300">

                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Agency Sign In</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Enter your partner credentials to access your dashboard.</p>
                        </div>

                        {successMsg && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
                                <div className="p-1 bg-green-100 dark:bg-green-500/20 rounded-full"><CheckCircle size={14} /></div>
                                <p className="text-sm font-bold">{successMsg}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                                <div className="p-1 bg-red-100 dark:bg-red-500/20 rounded-full"><EyeOff size={14} /></div>
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 font-medium"
                                        placeholder="agency_name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 font-medium"
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
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.rememberMe ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 group-hover:border-cyan-500/50'}`}>
                                        {formData.rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="hidden"
                                    />
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">Remember me</span>
                                </label>

                                <Link to="/forgot-password" className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>

                            <button
                                type="button"
                                onClick={mainButtonAction}
                                disabled={isLoading}
                                className={`w-full bg-gradient-to-r ${mainButtonGradient} text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 hover:shadow-cyan-500/50 dark:hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Please wait...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{mainButtonText}</span>
                                        <ButtonIcon className={`w-5 h-5 transition-transform ${isDeactivatedError ? 'group-hover:rotate-180 transition-all duration-500' : 'group-hover:translate-x-1'}`} />
                                    </>
                                )}
                            </button>

                            <div className="pt-4 text-center">
                                <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                                    New partner? <Link to="/agency-register" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold transition-colors">Register your agency</Link>
                                </p>
                            </div>
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