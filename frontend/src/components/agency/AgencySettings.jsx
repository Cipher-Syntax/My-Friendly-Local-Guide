import React, { useState, useEffect } from 'react';
import { Save, Phone, Percent, Building, User, Mail, Info, CheckCircle, AlertCircle as AlertIcon, Power, Eye, EyeOff, X, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../../api/api';
import { formatPHPhoneLocal, normalizePHPhone } from '../../utils/phoneNumber';

export default function AgencySettings({ profileData = {}, onUpdateSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', type: '' });

    // Editable Fields
    const [businessName, setBusinessName] = useState(profileData.business_name || '');
    const [ownerName, setOwnerName] = useState(profileData.owner_name || '');
    const [phone, setPhone] = useState(formatPHPhoneLocal(profileData.phone || ''));
    const [downPayment, setDownPayment] = useState(profileData.down_payment_percentage || 30);
    const [isOnline, setIsOnline] = useState(profileData.is_guide_visible !== false);

    // Logo Upload States
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(profileData.logo || null);

    const email = profileData.email || 'Loading...';

    useEffect(() => {
        if (profileData) {
            setBusinessName(profileData.business_name || '');
            setOwnerName(profileData.owner_name || '');
            setPhone(formatPHPhoneLocal(profileData.phone || ''));
            setDownPayment(profileData.down_payment_percentage || 30);
            setLogoPreview(profileData.logo || null);
            if (profileData.is_guide_visible !== undefined) {
                setIsOnline(profileData.is_guide_visible);
            }
        }
    }, [profileData]);

    const showFeedback = (msg, type) => {
        setFeedback({ show: true, message: msg, type: type });
        setTimeout(() => setFeedback({ show: false, message: '', type: '' }), 4000);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveSettings = async () => {
        setIsLoading(true);
        try {
            const normalizedPhone = normalizePHPhone(phone);
            if (!normalizedPhone) {
                showFeedback("Please enter a valid PH mobile number.", "error");
                setIsLoading(false);
                return;
            }

            // Use FormData to handle file uploads
            const formData = new FormData();
            formData.append('business_name', businessName);
            formData.append('owner_name', ownerName);
            formData.append('phone', normalizedPhone);
            formData.append('down_payment_percentage', downPayment);

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            await api.patch('api/agency/profile/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            await api.patch('api/profile/', {
                is_guide_visible: isOnline
            });

            showFeedback("Settings updated successfully!", "success");

            if (onUpdateSuccess) onUpdateSuccess();
        } catch (error) {
            console.error("Failed to update settings:", error);
            showFeedback("Failed to save settings. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDeactivate = async () => {
        setShowDeactivateModal(false);
        setIsDeactivating(true);
        try {
            await api.post('api/auth/deactivate/');
            showFeedback("Account deactivated. Logging out...", "success");

            setTimeout(() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/agency-signin';
            }, 1500);
        } catch (error) {
            console.error("Failed to deactivate:", error);
            showFeedback("Failed to deactivate account.", "error");
            setIsDeactivating(false);
        }
    };

    return (
        <div className="max-w-5xl space-y-6 relative pb-10">
            {feedback.show && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'
                    }`}>
                    {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertIcon className="w-5 h-5" />}
                    <p className="font-bold text-sm">{feedback.message}</p>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agency Settings</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage your business profile, visibility, and financial configurations.</p>
            </div>

            {/* Visibility Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isOnline ? <Eye className="w-5 h-5 text-emerald-500" /> : <EyeOff className="w-5 h-5 text-slate-400" />}
                        Agency Visibility
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {isOnline
                            ? "Your agency is ONLINE and visible to tourists for booking."
                            : "Your agency is OFFLINE. You are hidden from the tourist app."}
                    </p>
                </div>

                <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Business Profile Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-500" />
                    Business Profile
                </h3>

                {/* Logo Upload */}
                <div className="mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                        Agency Logo
                    </label>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Agency Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                                    <Upload className="w-4 h-4" />
                                    Upload Logo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                </label>
                                {logoPreview && (
                                    <button
                                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                                        className="text-sm text-rose-500 hover:text-rose-600 font-medium"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Recommended size: 500x500px. Max size: 5MB.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Business Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="Enter business name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Owner Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="Enter owner name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Public Contact Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(formatPHPhoneLocal(e.target.value))}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="+63 912 345 6789"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">Displayed to tourists for direct contact.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Registered Email <span className="text-xs font-normal text-slate-400">(Read-only)</span>
                        </label>
                        <div className="relative opacity-70">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                readOnly
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 cursor-not-allowed outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Contact admin support to change your account email.
                        </p>
                    </div>
                </div>
            </div>

            {/* Financial Configuration Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-500" />
                    Financial Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Required Downpayment (%)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Percent className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="number"
                                min="0" max="100"
                                value={downPayment}
                                onChange={(e) => setDownPayment(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">Automatically applied to tourist checkouts for your agency.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isLoading ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </div>

            {/* Danger Zone (Deactivate) */}
            <div className="mt-8 border border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                    <Power className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-rose-600 dark:text-rose-300 mb-4 text-sm">
                    Deactivating your account will instantly hide your agency from the app and log you out. You can reactivate by logging back in within 30 days.
                </p>
                <button
                    onClick={() => setShowDeactivateModal(true)}
                    disabled={isDeactivating}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-50 shadow-sm shadow-rose-600/20"
                >
                    {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
                </button>
            </div>

            {showDeactivateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">

                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Deactivation</h3>
                            <button onClick={() => setShowDeactivateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4 mx-auto">
                                <Power className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 text-center mb-6 leading-relaxed">
                                Are you absolutely sure you want to deactivate your agency? You will be logged out and your agency will be hidden from all tourists. <br /><br />
                                <span className="font-bold">You will have 30 days to log back in to restore your account.</span>
                            </p>

                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => setShowDeactivateModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDeactivate}
                                    className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-rose-600/20"
                                >
                                    Yes, Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}