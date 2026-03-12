import React, { useState, useEffect } from 'react';
import { Save, Phone, Percent, Building, User, Mail, Info, CheckCircle, AlertCircle as AlertIcon } from 'lucide-react';
import api from '../../api/api';

export default function AgencySettings({ profileData = {}, onUpdateSuccess }) {
    const [isLoading, setIsLoading] = useState(false);

    // --- NEW: Feedback State for Custom Notifications ---
    const [feedback, setFeedback] = useState({ show: false, message: '', type: '' });

    // Editable Fields
    const [businessName, setBusinessName] = useState(profileData.business_name || '');
    const [ownerName, setOwnerName] = useState(profileData.owner_name || '');
    const [phone, setPhone] = useState(profileData.phone || '');
    const [downPayment, setDownPayment] = useState(profileData.down_payment_percentage || 30);

    // Read-only field
    const email = profileData.email || 'Loading...';

    useEffect(() => {
        if (profileData) {
            setBusinessName(profileData.business_name || '');
            setOwnerName(profileData.owner_name || '');
            setPhone(profileData.phone || '');
            setDownPayment(profileData.down_payment_percentage || 30);
        }
    }, [profileData]);

    // Helper to trigger custom feedback
    const showFeedback = (msg, type) => {
        setFeedback({ show: true, message: msg, type: type });
        setTimeout(() => setFeedback({ show: false, message: '', type: '' }), 4000);
    };

    const handleSaveSettings = async () => {
        setIsLoading(true);
        try {
            await api.patch('api/agency/profile/', {
                business_name: businessName,
                owner_name: ownerName,
                phone: phone,
                down_payment_percentage: downPayment
            });

            // --- UPDATED: Replaced alert with custom feedback ---
            showFeedback("Settings updated successfully!", "success");

            if (onUpdateSuccess) onUpdateSuccess();
        } catch (error) {
            console.error("Failed to update settings:", error);
            // --- UPDATED: Replaced alert with custom feedback ---
            showFeedback("Failed to save settings. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl space-y-6 relative">
            {/* --- NEW: In-UI Toast Notification --- */}
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
                <p className="text-slate-500 dark:text-slate-400">Manage your business profile and financial configurations.</p>
            </div>

            {/* Business Profile Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-500" />
                    Business Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                    {/* Business Name */}
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

                    {/* Owner Name */}
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

                    {/* Phone Number */}
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
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="+63 912 345 6789"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">Displayed to tourists for direct contact.</p>
                    </div>

                    {/* Registered Email (Read-Only) */}
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
                    {/* Downpayment Percentage */}
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
        </div>
    );
}