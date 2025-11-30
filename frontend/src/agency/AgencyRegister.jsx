import React, { useState, useEffect } from 'react';
import { 
    Eye, EyeOff, Globe, ArrowRight, Loader2, Upload, 
    CheckCircle, ShieldCheck, Mail, User, Lock, Building2, Phone, Briefcase 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
// We no longer need ACCESS_TOKEN, REFRESH_TOKEN in the registration component
// import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants'; 

const AgencyRegister = () => {
    const navigate = useNavigate();
    const [isRegistered, setIsRegistered] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const [licenseFile, setLicenseFile] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        business_name: '',
        owner_name: '',
        phone: '',
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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setLicenseFile(e.target.files[0]);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (!licenseFile) {
            setError("Please upload your Business License");
            return;
        }

        setIsLoading(true);

        try {
            // --- 1. Register User Account ONLY (JSON POST) ---
            await api.post('api/register/', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                confirm_password: formData.confirmPassword,
                first_name: formData.owner_name.split(' ')[0],
                last_name: formData.owner_name.split(' ').slice(1).join(' ') || 'Owner'
            });

            // --- 2. Store Agency Data Locally (Pending completion later) ---
            // NOTE: The license file itself cannot be stored reliably in localStorage,
            // which is why this is marked as a design flaw for file uploads.
            // A production app would use a temporary file upload endpoint here.
            const pendingData = {
                business_name: formData.business_name,
                owner_name: formData.owner_name,
                phone: formData.phone,
                email: formData.email
            };
            localStorage.setItem('pending_agency_data', JSON.stringify(pendingData));

            // --- 3. Success and Redirect to Login for Verification ---
            setIsRegistered(true);

        } catch (err) {
            console.error("Registration Error:", err);
            
            let msg = "Registration failed. Please check your details.";
            if (err.response && err.response.data) {
                if (err.response.data.username) msg = `Username: ${err.response.data.username[0]}`;
                else if (err.response.data.email) msg = `Email: ${err.response.data.email[0]}`;
                else if (err.response.data.detail) msg = err.response.data.detail;
            }
            setError(msg);
            
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y * -1}px)` }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y}px)` }} />
            </div>

            {/* Main Card (max-w-6xl) */}
            <div className="w-full max-w-6xl bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
                
                {/* Left Panel (4/12 width) */}
                <div className="w-full md:w-4/12 bg-gradient-to-br from-indigo-900/80 to-slate-900/80 p-12 text-white relative flex flex-col justify-between border-r border-white/5">
                    <div>
                        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg mb-6">
                            <Globe size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Partner with <br/> <span className="text-cyan-400">LocalYnk</span></h1>
                        <p className="text-indigo-200 text-sm leading-relaxed">
                            Join our network of elite travel agencies. Manage guides, track bookings, and grow your business.
                        </p>
                    </div>
                    <div className="space-y-4 my-8">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle className="w-5 h-5 text-cyan-400" /> <span>Verified Badge</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle className="w-5 h-5 text-cyan-400" /> <span>Manage Unlimited Guides</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">© 2025 LocalLynk Partners</p>
                </div>

                {/* Right Panel (8/12 width) */}
                <div className="w-full md:w-8/12 p-8 md:p-12 bg-white/5 flex flex-col justify-center">
                    
                    {/* SUCCESS SCREEN */}
                    {isRegistered ? (
                        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <Mail className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Verify Your Email</h2>
                            <p className="text-slate-300 text-lg mb-8 max-w-md">
                                Registration successful! We've sent a verification link to <strong>{formData.email}</strong>. 
                                <br/><br/>
                                <span className="text-cyan-400 text-sm">Step 1: Check your inbox and click the link.</span>
                                <br/>
                                <span className="text-cyan-400 text-sm">Step 2: Log in to complete your agency profile.</span>
                            </p>
                            
                            <div className="space-y-4 w-full max-w-sm">
                                <Link 
                                    to="/agency-signin" 
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                >
                                    Go to Login <ArrowRight size={20} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        // REGISTRATION FORM
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2">Agency Registration</h2>
                                <p className="text-slate-400 text-sm">Create your account and profile to get started.</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                    <ShieldCheck size={16} /> {error}
                                </div>
                            )}

                            {/* Reverted to grid layout with gap-4 */}
                            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Account Inputs */}
                                <div className="md:col-span-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mt-2 mb-1">Account Credentials</div>
                                
                                {/* Username */}
                                <div className="space-y-1">
                                    <input type="text" name="username" required placeholder="Username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                </div>
                                
                                {/* Email */}
                                <div className="space-y-1">
                                    <input type="email" name="email" required placeholder="Business Email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                </div>
                                
                                {/* Password */}
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} name="password" required placeholder="Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-500 hover:text-white"><Eye size={18}/></button>
                                </div>
                                
                                {/* Confirm Password */}
                                <div className="relative">
                                    <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-slate-500 hover:text-white"><Eye size={18}/></button>
                                </div>

                                {/* Business Inputs - Saved to LocalStorage */}
                                <div className="md:col-span-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mt-4 mb-1">Business Profile</div>
                                
                                {/* Business Name */}
                                <div className="space-y-1">
                                    <input type="text" name="business_name" required placeholder="Registered Business Name" value={formData.business_name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                </div>
                                
                                {/* Owner Name */}
                                <div className="space-y-1">
                                    <input type="text" name="owner_name" required placeholder="Owner Full Name" value={formData.owner_name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                </div>
                                
                                {/* Phone Number (spans 2 columns) */}
                                <div className="md:col-span-2">
                                    <input type="tel" name="phone" required placeholder="Business Phone Number" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
                                </div>

                                {/* File Upload (spans 2 columns) */}
                                <div className="md:col-span-2">
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900/30 hover:bg-slate-800 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-2" />
                                            <p className="text-sm text-slate-500 group-hover:text-slate-300">
                                                {licenseFile ? licenseFile.name : "Upload Business License / Permit (PDF/IMG)"}
                                            </p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                                    </label>
                                </div>

                                {/* Submit Button (spans 2 columns) */}
                                <div className="md:col-span-2 mt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" /> : <>Complete Registration <ArrowRight size={20}/></>}
                                    </button>
                                </div>
                            </form>
                            <p className="text-center text-slate-500 text-sm mt-4">
                                Already a partner? <Link to="/agency-signin" className="text-cyan-400 hover:underline">Sign in here</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyRegister;