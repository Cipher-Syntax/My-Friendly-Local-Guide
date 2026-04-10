import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Globe, ArrowRight, Loader2, Upload, CheckCircle, ShieldCheck, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { formatPHPhoneLocal, normalizePHPhone } from '../utils/phoneNumber';
import { NAME_REGEX, NAME_ERROR_MESSAGE, EMAIL_REGEX, EMAIL_ERROR_MESSAGE, PHONE_ERROR_MESSAGE } from '../utils/validation';

const ACCEPTED_LICENSE_FILE_REGEX = /^[A-Za-z0-9][A-Za-z0-9 ._-]*\.(pdf|png|jpe?g|webp|gif|bmp|heic|heif)$/i;

const AgencyRegister = () => {
    const [isRegistered, setIsRegistered] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
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
        const { name, value } = e.target;
        const nextValue = name === 'phone' ? formatPHPhoneLocal(value) : value;
        setFormData({ ...formData, [name]: nextValue });
        if (error) setError(null);
    };

    const hasAcceptedLicenseFileType = (file) => {
        const hasAcceptedExtension = /\.(pdf|png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(file.name || '');
        const hasAcceptedMimeType = file.type === 'application/pdf' || file.type.startsWith('image/');
        return hasAcceptedExtension && hasAcceptedMimeType;
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!hasAcceptedLicenseFileType(file)) {
            setLicenseFile(null);
            setError('Upload only PDF or image files for your business permit.');
            e.target.value = '';
            return;
        }

        if (!ACCEPTED_LICENSE_FILE_REGEX.test(file.name)) {
            setLicenseFile(null);
            setError('Use a formal file name: letters, numbers, spaces, dot, hyphen, and underscore only.');
            e.target.value = '';
            return;
        }

        setLicenseFile(file);
        if (error) setError(null);
    };

    const validateStep = (step) => {
        if (step === 1) {
            if (!formData.username.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
                setError('Please complete all account credential fields.');
                return false;
            }

            if (!EMAIL_REGEX.test(String(formData.email || '').trim())) {
                setError(EMAIL_ERROR_MESSAGE);
                return false;
            }

            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.');
                return false;
            }
        }

        if (step === 2) {
            if (!formData.business_name.trim() || !formData.owner_name.trim() || !formData.phone.trim()) {
                setError('Please complete all business profile fields.');
                return false;
            }

            if (!NAME_REGEX.test(String(formData.owner_name || '').trim())) {
                setError(NAME_ERROR_MESSAGE);
                return false;
            }

            const normalizedPhone = normalizePHPhone(formData.phone);
            if (!normalizedPhone) {
                setError(PHONE_ERROR_MESSAGE);
                return false;
            }
        }

        if (step === 3) {
            if (!licenseFile) {
                setError('Please upload your Business License / Permit.');
                return false;
            }

            if (!hasAcceptedLicenseFileType(licenseFile)) {
                setError('Upload only PDF or image files for your business permit.');
                return false;
            }

            if (!ACCEPTED_LICENSE_FILE_REGEX.test(licenseFile.name)) {
                setError('Use a formal file name: letters, numbers, spaces, dot, hyphen, and underscore only.');
                return false;
            }
        }

        return true;
    };

    const nextStep = () => {
        if (!validateStep(currentStep)) return;
        setError(null);
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const previousStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        if (error) setError(null);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        if (!validateStep(1)) {
            setCurrentStep(1);
            return;
        }

        if (!validateStep(2)) {
            setCurrentStep(2);
            return;
        }

        if (!validateStep(3)) {
            setCurrentStep(3);
            return;
        }

        const normalizedPhone = normalizePHPhone(formData.phone);
        if (!normalizedPhone) {
            setError(PHONE_ERROR_MESSAGE);
            return;
        }

        setIsLoading(true);

        try {
            const ownerParts = formData.owner_name.trim().split(/\s+/).filter(Boolean);
            await api.post('api/register/', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                confirm_password: formData.confirmPassword,
                first_name: ownerParts[0] || 'Owner',
                last_name: ownerParts.slice(1).join(' ') || 'Owner'
            });

            const pendingData = {
                business_name: formData.business_name,
                owner_name: formData.owner_name,
                phone: normalizedPhone,
                email: formData.email
            };
            localStorage.setItem('pending_agency_data', JSON.stringify(pendingData));
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

    const renderStepIndicators = () => {
        const stepLabels = ['Account Credentials', 'Business Profile', 'Business License'];

        return (
            <div className="mb-6">
                <div className="flex items-center justify-center">
                    {[1, 2, 3].map((step, idx) => (
                        <React.Fragment key={step}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${currentStep >= step ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                                {step}
                            </div>
                            {idx < 2 && <div className={`w-10 md:w-14 h-1 transition-colors ${currentStep > step ? 'bg-sky-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                        </React.Fragment>
                    ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wide text-center">
                    {stepLabels.map((label, index) => (
                        <span key={label} className={currentStep >= index + 1 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}>
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen zam-shell bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-orange-500/30 transition-colors duration-300">
            <div className="absolute inset-0 zam-vinta-overlay opacity-25 pointer-events-none" />
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-sky-500/20 dark:bg-sky-600/20 rounded-full blur-[120px] animate-pulse" style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y * -1}px)` }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/20 dark:bg-orange-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y}px)` }} />
            </div>

            <div className="w-full max-w-5xl md:min-h-[650px] bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 transition-colors duration-300">

                <div className="w-full md:w-5/12 p-12 text-slate-900 dark:text-white relative flex flex-col justify-between border-r border-slate-200 dark:border-white/5 transition-colors duration-300" style={{ background: 'linear-gradient(140deg, rgba(13,59,102,0.1), rgba(249,115,22,0.14))' }}>
                    <div className="absolute inset-0 zam-vinta-overlay opacity-15 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-6" style={{ background: 'linear-gradient(120deg, var(--zam-sea), var(--zam-coral))' }}>
                            <Globe size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl zam-title mb-2 text-slate-900 dark:text-white">Partner with <br /> <span className="text-sky-700 dark:text-cyan-300">LocaLynk</span></h1>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                            Join the agency partner network to manage tours, guides, and bookings in one place.
                        </p>
                    </div>
                    <div className="space-y-4 my-8 relative z-10">
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            <CheckCircle className="w-5 h-5 text-sky-600 dark:text-sky-300" /> <span>Verified Partner Badge</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            <CheckCircle className="w-5 h-5 text-sky-600 dark:text-sky-300" /> <span>Manage Guides and Packages</span>
                        </div>
                    </div>
                    <p className="relative z-10 text-xs text-slate-500 dark:text-slate-400 font-bold">© {new Date().getFullYear()} LocaLynk Partners</p>
                </div>

                <div className="w-full md:w-7/12 p-8 md:p-16 bg-white/50 dark:bg-white/5 flex flex-col justify-center transition-colors duration-300">

                    {isRegistered ? (
                        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <Mail className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Verify Your Email</h2>
                            <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-md font-medium">
                                Registration successful! We've sent a verification link to <strong className="text-slate-900 dark:text-white">{formData.email}</strong>.
                                <br /><br />
                                <span className="text-sky-600 dark:text-sky-300 text-sm font-bold">Step 1: Check your inbox and click the link.</span>
                                <br />
                                <span className="text-sky-600 dark:text-sky-300 text-sm font-bold">Step 2: Log in to complete your agency profile.</span>
                            </p>

                            <div className="space-y-4 w-full max-w-sm">
                                <Link
                                    to="/agency-signin"
                                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20"
                                >
                                    Go to Login <ArrowRight size={20} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="mb-8">
                                <h2 className="text-2xl zam-title text-slate-900 dark:text-white mb-2">Agency Registration</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Step {currentStep} of 3: Complete each section to continue.</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2 font-bold">
                                    <ShieldCheck size={16} /> {error}
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-6">
                                {renderStepIndicators()}

                                {currentStep === 1 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="md:col-span-2 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Account Credentials</div>

                                        <div className="space-y-1">
                                            <input type="text" name="username" required placeholder="Username" value={formData.username} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                        </div>

                                        <div className="space-y-1">
                                            <input type="email" name="email" required placeholder="Business Email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                        </div>

                                        <div className="relative">
                                            <input type={showPassword ? 'text' : 'password'} name="password" required placeholder="Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" required placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="md:col-span-2 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Business Profile</div>

                                        <div className="space-y-1">
                                            <input type="text" name="business_name" required placeholder="Registered Business Name" value={formData.business_name} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                        </div>

                                        <div className="space-y-1">
                                            <input type="text" name="owner_name" required placeholder="Owner Full Name" value={formData.owner_name} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                        </div>

                                        <div className="md:col-span-2">
                                            <input type="tel" name="phone" required placeholder="Business Phone Number" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 focus:outline-none font-medium transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Business License / Permit</div>

                                        <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                            <div className="flex flex-col items-center justify-center px-5 text-center">
                                                <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-300 mb-3 transition-colors" />
                                                <p className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                                    {licenseFile ? licenseFile.name : 'Upload your Business Permit or License'}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    Accepted files: PDF, JPG, JPEG, PNG, WEBP, GIF, BMP, HEIC
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                                    Formal file names only (letters, numbers, spaces, dot, hyphen, underscore)
                                                </p>
                                            </div>
                                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                                        </label>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={previousStep}
                                        disabled={currentStep === 1 || isLoading}
                                        className="px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Back
                                    </button>

                                    {currentStep < 3 ? (
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            disabled={isLoading}
                                            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            Next Step <ArrowRight size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-orange-500 hover:from-sky-700 hover:to-orange-600 dark:hover:from-sky-500 dark:hover:to-orange-400 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : <>Complete Registration <ArrowRight size={18} /></>}
                                        </button>
                                    )}
                                </div>
                            </form>

                            <p className="text-center text-slate-600 dark:text-slate-500 text-sm mt-4 font-medium">
                                Already a partner? <Link to="/agency-signin" className="text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:underline transition-colors">Sign in here</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyRegister;