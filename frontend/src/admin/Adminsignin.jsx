import React, { useState } from 'react';
import { Eye, EyeOff, Compass, Mountain, Waves, TreePine, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode"; // <--- Import this
import api from '../api/api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants';

const Adminsignin = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const [error, setError] = useState(null); 

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const floatingIcons = [
        { Icon: Mountain, top: '15%', left: '8%', delay: '0s', size: 28 },
        { Icon: Waves, top: '65%', left: '10%', delay: '2s', size: 24 },
        { Icon: TreePine, top: '45%', left: '5%', delay: '4s', size: 26 },
        { Icon: Shield, top: '80%', left: '8%', delay: '1s', size: 22 }
    ];

    const handleSubmit = async (e) => {
        // 1. Prevent default browser refresh
        if (e) e.preventDefault();

        setIsLoading(true);
        setError(null);

        try {
            // 2. Call the Admin Endpoint
            const res = await api.post('api/auth/admin/login/', {
                username: formData.email, 
                password: formData.password
            });

            // 3. Success: Save tokens
            const access = res.data.access;
            const refresh = res.data.refresh;

            localStorage.setItem(ACCESS_TOKEN, access);
            localStorage.setItem(REFRESH_TOKEN, refresh);
            
            // 4. NEW: Decode and Save User Details immediately
            try {
                const decoded = jwtDecode(access);
                
                // Save these explicitly so Sidebar can read them easily
                // Note: This relies on your Backend Serializer sending 'username' and 'email'
                localStorage.setItem('admin_username', decoded.username || 'Admin');
                localStorage.setItem('admin_email', decoded.email || formData.email);
                
                // console.log("User details saved:", decoded.username, decoded.email);
            } catch (decodeError) {
                console.error("Could not decode token to save user info", decodeError);
                // Fallback if decoding fails
                localStorage.setItem('admin_username', 'Admin');
                localStorage.setItem('admin_email', formData.email);
            }
            
            console.log('Admin logged in successfully');
            navigate('/admin'); 

        } catch (err) {
            console.error("Login error:", err);
            // 5. Error Handling
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Invalid credentials or server error.");
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
        // Clear error when user starts typing again
        if (error) setError(null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex">
                {/* Left Panel - Branding */}
                <div className="w-5/12 bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 p-16 text-white relative overflow-hidden flex flex-col justify-between">
                    {/* Wave Pattern Background */}
                    <div className="absolute inset-0 opacity-10">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0,50 Q25,40 50,50 T100,50 L100,100 L0,100 Z" fill="white" opacity="0.1"/>
                            <path d="M0,60 Q25,50 50,60 T100,60 L100,100 L0,100 Z" fill="white" opacity="0.1"/>
                            <path d="M0,70 Q25,60 50,70 T100,70 L100,100 L0,100 Z" fill="white" opacity="0.1"/>
                        </svg>
                    </div>

                    {/* Floating Icons */}
                    {floatingIcons.map(({ Icon, top, left, delay, size }, idx) => (
                        <div
                            key={idx}
                            className="absolute text-white/15"
                            style={{
                                top,
                                left,
                                animation: `float 6s ease-in-out infinite`,
                                animationDelay: delay
                            }}
                        >
                            <Icon size={size} strokeWidth={1.5} />
                        </div>
                    ))}

                    <div className="relative z-10">
                        <div className="mb-8">
                            <div className="w-24 h-24 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                                <Compass size={48} className="text-white" strokeWidth={2} />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Welcome to</h1>
                        <h2 className="text-5xl font-bold mb-5">LocaLynk</h2>
                        <p className="text-blue-100 text-base font-medium">ADMIN PORTAL</p>
                    </div>

                    <div className="relative z-10">
                        <p className="text-base leading-relaxed text-white/95 mb-8">
                            Access your admin dashboard to manage destinations, guide profiles, and user experiences. Monitor platform analytics and curate extraordinary travel journeys.
                        </p>
                        <div className="flex gap-3 text-sm">
                            <button className="text-white/80 hover:text-white transition-colors font-medium">
                                ADMIN LOGIN
                            </button>
                            <span className="text-white/40">|</span>
                            <button className="text-white/60 hover:text-white/80 transition-colors">
                                NEED HELP?
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes float {
                            0%, 100% { transform: translateY(0px) rotate(0deg); }
                            50% { transform: translateY(-20px) rotate(5deg); }
                        }
                    `}</style>
                </div>

                {/* Right Panel - Login Form */}
                <div className="flex-1 p-16 flex items-center">
                    <div className="w-full max-w-lg mx-auto">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-gray-800 mb-3">
                                Admin Sign In
                            </h2>
                            <p className="text-gray-500 text-base">
                                Enter your credentials to access the admin panel
                            </p>
                        </div>

                        {/* ERROR MESSAGE DISPLAY */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r">
                                <p className="font-bold text-sm">Access Denied</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-3">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter admin email"
                                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white outline-none transition-all text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-base font-medium text-gray-700 mb-3">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Enter password"
                                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white outline-none transition-all pr-12 text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label className="ml-3 text-base text-gray-600">
                                    Remember me
                                </label>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={`w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-4.5 rounded-xl font-semibold text-lg transition-all transform shadow-lg 
                                ${isLoading 
                                    ? 'opacity-70 cursor-not-allowed' 
                                    : 'hover:from-blue-700 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl'
                                }`}
                            >
                                {isLoading ? 'Verifying...' : 'Sign In'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Adminsignin;