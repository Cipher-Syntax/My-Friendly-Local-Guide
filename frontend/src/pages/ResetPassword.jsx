import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, Compass, Mountain, CheckCircle, AlertCircle, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
        { Icon: ShieldCheck, top: '15%', left: '15%', delay: '0s', size: 32, opacity: 0.2 },
        { Icon: Lock, top: '65%', left: '10%', delay: '2s', size: 28, opacity: 0.15 },
        { Icon: Compass, top: '40%', left: '85%', delay: '4s', size: 30, opacity: 0.2 },
        { Icon: ShieldCheck, top: '80%', left: '80%', delay: '1s', size: 24, opacity: 0.15 },
        { Icon: Mountain, top: '20%', left: '80%', delay: '3s', size: 40, opacity: 0.1 }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!uid || !token) {
            setError("Invalid link. UID or Token is missing.");
            return;
        }

        setLoading(true);

        try {
            await api.post('/api/password-reset/confirm/', {
                uid: uid,
                token: token,
                password: newPassword,
                confirm_password: confirmPassword
            });
            setMessage("Password has been reset successfully. You can now login.");
            setTimeout(() => {
                navigate('/portal');
            }, 3000);
        } catch (err) {
            console.error("Reset Error:", err.response?.data);

            let errorMsg = 'Failed to reset password. The link might be expired or invalid.';
            if (err.response?.data) {
                if (typeof err.response.data === 'object' && !err.response.data.detail) {
                    const firstKey = Object.keys(err.response.data)[0];
                    errorMsg = `${firstKey.replace('_', ' ')}: ${err.response.data[firstKey][0]}`;
                } else if (err.response.data.detail) {
                    errorMsg = err.response.data.detail;
                }
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!uid || !token) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Invalid Reset Link</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">The password reset link is missing required parameters or has expired. Please request a new one.</p>
                    <Link to="/forgot-password" className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                        <ArrowLeft size={20} />
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-teal-500/30 transition-colors duration-300">

            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse"
                    style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y * -1}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/20 dark:bg-teal-600/10 rounded-full blur-[120px] animate-pulse"
                    style={{ animationDelay: '2s', transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y}px)` }}
                />

                {floatingIcons.map(({ Icon, top, left, delay, size, opacity }, idx) => (
                    <div
                        key={idx}
                        className="absolute text-teal-600/40 dark:text-teal-200"
                        style={{
                            top,
                            left,
                            opacity: opacity * 2,
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

                {/* Left Side - Branding */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-100/90 to-slate-200/90 dark:from-slate-900/80 dark:to-slate-800/80 p-12 text-slate-900 dark:text-white relative flex flex-col justify-between border-r border-slate-200 dark:border-white/5 transition-colors duration-300">
                    <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <ShieldCheck size={32} className="text-white" strokeWidth={2} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-teal-600 dark:text-teal-400 font-bold tracking-widest text-sm uppercase">Secure Update</h3>
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Loca<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-400">Lynk</span>
                            </h1>
                        </div>
                    </div>

                    <div className="my-12 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-transparent rounded-full"></div>
                        <p className="pl-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium dark:font-light">
                            Almost there! Create a new, strong password to secure your account and resume your journey.
                        </p>
                    </div>

                    <div className="text-slate-500 dark:text-slate-500 text-xs font-bold tracking-wide">
                        &copy; {new Date().getFullYear()} LOCALYNK PLATFORM. SECURE CONNECTION.
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-7/12 p-8 md:p-16 bg-white/50 dark:bg-white/5 flex flex-col justify-center transition-colors duration-300">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Set New Password</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter and confirm your new password below.</p>
                        </div>

                        {message && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-bold">{message}</p>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">New Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 font-medium"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 font-medium"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || message}
                                className={`w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 dark:hover:from-teal-400 dark:hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 dark:shadow-teal-500/20 hover:shadow-teal-500/50 dark:hover:shadow-teal-500/40 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-8 ${(loading || message) ? 'opacity-70 cursor-not-allowed' : 'group'}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Securing Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Reset Password</span>
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

export default ResetPassword;