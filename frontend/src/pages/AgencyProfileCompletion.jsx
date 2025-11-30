// src/pages/AgencyProfileCompletion.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, Briefcase, ArrowRight } from 'lucide-react';
import api from '../api/api';

const AgencyProfileCompletion = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [licenseFile, setLicenseFile] = useState(null);
    const [pendingData, setPendingData] = useState(null);

    useEffect(() => {
        const data = localStorage.getItem('pending_agency_data');
        if (data) {
            setPendingData(JSON.parse(data));
        } else {
            navigate('/agency');
        }
    }, [navigate]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setLicenseFile(e.target.files[0]);
        }
    };

    const handleSubmitCompletion = async (e) => {
        e.preventDefault();
        setError(null);

        if (!licenseFile) {
            setError("Please re-upload your Business License/Permit to complete your registration.");
            return;
        }

        setIsLoading(true);

        try {
            const agencyFormData = new FormData();
            agencyFormData.append('business_name', pendingData.business_name);
            agencyFormData.append('owner_name', pendingData.owner_name);
            agencyFormData.append('email', pendingData.email); 
            agencyFormData.append('phone', pendingData.phone);
            agencyFormData.append('business_license', licenseFile); // The re-uploaded file

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
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!pendingData) {
        return (
             <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
        );
    }


    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <Briefcase className="w-12 h-12 text-cyan-400 mx-auto" />
                    <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
                    <p className="text-slate-400">
                        Welcome, **{pendingData.business_name}**. Your email is verified! Please re-upload your business license to finalize your application.
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
                )}
                
                <form onSubmit={handleSubmitCompletion} className="space-y-4">
                    <h3 className="text-white font-medium text-lg">Re-Upload Business License</h3>
                    
                    <div>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900/30 hover:bg-slate-700/50 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-2" />
                                <p className="text-sm text-slate-500 group-hover:text-slate-300">
                                    {licenseFile ? licenseFile.name : "Select Business License / Permit (PDF/IMG)"}
                                </p>
                            </div>
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" required />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !licenseFile}
                        className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Application for Review <ArrowRight size={20}/></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgencyProfileCompletion;