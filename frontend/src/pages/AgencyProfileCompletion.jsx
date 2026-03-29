import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, Briefcase, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../api/api';
import { normalizePHPhone, formatPHPhoneLocal } from '../utils/phoneNumber';

const AgencyProfileCompletion = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [licenseFile, setLicenseFile] = useState(null);

    // Normal registration data
    const [pendingData, setPendingData] = useState(null);

    // Fallback data if they swapped devices
    const [isDataLost, setIsDataLost] = useState(false);
    const [manualData, setManualData] = useState({
        business_name: '',
        owner_name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        const data = localStorage.getItem('pending_agency_data');
        if (data) {
            setPendingData(JSON.parse(data));
        } else {
            // FIX: Don't kick them out! Just activate the manual entry fields.
            setIsDataLost(true);
            const email = localStorage.getItem('agency_email') || '';
            setManualData(prev => ({ ...prev, email }));
        }
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setLicenseFile(e.target.files[0]);
        }
    };

    const handleManualChange = (e) => {
        const { name, value } = e.target;
        setManualData(prev => ({
            ...prev,
            [name]: name === 'phone' ? formatPHPhoneLocal(value) : value
        }));
    };

    const handleSubmitCompletion = async (e) => {
        e.preventDefault();
        setError(null);

        if (!licenseFile) {
            setError("Please upload your Business License/Permit to complete your registration.");
            return;
        }

        setIsLoading(true);

        try {
            // Decide whether to use the saved data or the manually typed data
            const dataToSubmit = isDataLost ? manualData : pendingData;

            if (!dataToSubmit.business_name || !dataToSubmit.owner_name) {
                setError("Please fill in all the required business details.");
                setIsLoading(false);
                return;
            }

            const normalizedPhone = normalizePHPhone(dataToSubmit.phone);
            if (!normalizedPhone) {
                setError("Please provide a valid PH mobile number before submitting.");
                setIsLoading(false);
                return;
            }

            const agencyFormData = new FormData();
            agencyFormData.append('business_name', dataToSubmit.business_name);
            agencyFormData.append('owner_name', dataToSubmit.owner_name);
            agencyFormData.append('email', dataToSubmit.email);
            agencyFormData.append('phone', normalizedPhone);
            agencyFormData.append('business_license', licenseFile);

            // This is the call that actually sends the email to the Admin!
            await api.post(
                'api/agency/register/',
                agencyFormData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            localStorage.removeItem('pending_agency_data');
            navigate('/agency');

        } catch (err) {
            console.error("Profile Creation Error:", err);
            let msg = "Failed to create agency profile. It may already exist or the license upload failed.";
            if (err.response && err.response.data && err.response.data.detail) {
                msg = err.response.data.detail;
            } else if (err.response?.data?.business_name) {
                msg = "Business name error: " + err.response.data.business_name[0];
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <Briefcase className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>

                    {!isDataLost ? (
                        <p className="text-slate-400 text-sm">
                            Welcome back! Your email is verified. Please upload your business license to finalize your application.
                        </p>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-200/90 text-sm leading-relaxed">
                                Because you verified your email on a different device or browser, we need you to quickly re-enter your business details below before uploading your license.
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmitCompletion} className="space-y-5">

                    {/* Only show these fields if the local storage data was lost */}
                    {isDataLost && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Business Name</label>
                                <input type="text" name="business_name" value={manualData.business_name} onChange={handleManualChange} placeholder="e.g. Island Tours" required className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Owner Full Name</label>
                                <input type="text" name="owner_name" value={manualData.owner_name} onChange={handleManualChange} placeholder="e.g. Juan Dela Cruz" required className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Phone Number</label>
                                <input type="tel" name="phone" value={manualData.phone} onChange={handleManualChange} placeholder="09XX XXX XXXX" required className="w-full px-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all" />
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Upload Business License</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 mb-3 transition-colors" />
                                <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors px-4 text-center">
                                    {licenseFile ? <span className="text-cyan-400">{licenseFile.name}</span> : "Select PDF or Image file"}
                                </p>
                            </div>
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" required />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !licenseFile}
                        className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Application <ArrowRight size={20} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgencyProfileCompletion;