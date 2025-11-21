import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../../api/api'; // Ensure this is your configured axios instance

// Helper for status badge styling
const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
        case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
};

export default function TourGuidesManagement() {
    // State
    const [tourGuides, setTourGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState(null);
    
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [viewingCredentials, setViewingCredentials] = useState(null);
    
    const [viewingCredentialImage, setViewingCredentialImage] = useState(null);
    const [isViewCredentialImageModalOpen, setIsViewCredentialImageModalOpen] = useState(false);

// --- 1. FETCH DATA FROM BACKEND ---
    const fetchGuides = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/admin/guide-reviews/');
            
            console.log("API Response:", response.data);

            if (Array.isArray(response.data)) {
                setTourGuides(response.data);
            } else if (response.data && Array.isArray(response.data.results)) {
                // Handle Django Pagination
                setTourGuides(response.data.results);
            } else {
                // Fallback to empty array to prevent .filter crash
                console.error("Unexpected API response structure", response.data);
                setTourGuides([]);
            }
        } catch (error) {
            console.error("Failed to fetch guides:", error);
            setTourGuides([]); // Ensure it stays an array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuides();
    }, []);

    // Filter logic
    const filteredGuides = useMemo(() =>
        tourGuides.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [tourGuides, searchTerm]
    );

    // --- 2. ACTION HANDLERS ---

    const reviewApplication = (item) => {
        setReviewingItem(item);
        setIsReviewModalOpen(true);
    };

    const approveApplication = async () => {
        if (!reviewingItem) return;
        try {
            // Send PATCH request to update status
            await api.patch(`api/admin/guide-reviews/${reviewingItem.id}/`, {
                status: 'Approved'
            });
            
            // Optimistic update (update UI immediately)
            setTourGuides(prev => prev.map(g => 
                g.id === reviewingItem.id ? { ...g, status: 'Approved' } : g
            ));
            setIsReviewModalOpen(false);
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("Failed to approve application.");
        }
    };

    const declineApplication = async () => {
        if (!reviewingItem) return;
        try {
            await api.patch(`api/admin/guide-reviews/${reviewingItem.id}/`, {
                status: 'Rejected'
            });
            
            setTourGuides(prev => prev.map(g => 
                g.id === reviewingItem.id ? { ...g, status: 'Rejected' } : g
            ));
            setIsReviewModalOpen(false);
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Failed to reject application.");
        }
    };

    const viewGuideCredentials = (guide) => {
        setViewingCredentials(guide);
        setIsCredentialsModalOpen(true);
    };

    // --- 3. IMAGE HANDLING LOGIC ---
    const viewCredentialImage = (credentialType, guideName, credentialsObj) => {
        // Map the type string to the exact URL key sent by your Serializer
        let url = null;
        if (credentialType === 'certificate') url = credentialsObj.certificate_url;
        if (credentialType === 'residency') url = credentialsObj.residency_url;
        if (credentialType === 'validId') url = credentialsObj.validId_url;
        if (credentialType === 'nbiClearance') url = credentialsObj.nbiClearance_url;

        setViewingCredentialImage({ type: credentialType, guideName, url });
        setIsViewCredentialImageModalOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tour guides..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
            </div>

            {/* Loading / List Area */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredGuides.length === 0 && (
                        <p className="text-slate-400 text-center py-10">No guide applications found.</p>
                    )}

                    {filteredGuides.map(guide => (
                        <div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold text-lg">{guide.name}</h3>
                                    <p className="text-slate-400 text-sm">{guide.email}</p>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-slate-400 text-sm">
                                            <span className="text-cyan-400 font-medium">Specialty: </span> 
                                            {guide.specialty || 'Not specified'}
                                        </p>
                                        <p className="text-slate-400 text-sm">
                                            <span className="text-cyan-400 font-medium">Languages: </span> 
                                            {guide.languages && guide.languages.length > 0 ? guide.languages.join(', ') : 'None'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wider ${getStatusColor(guide.status)}`}>
                                    {guide.status}
                                </span>
                            </div>

                            {/* Only show action buttons if status is Pending */}
                            {guide.status.toLowerCase() === 'pending' && (
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => viewGuideCredentials(guide)}
                                        className="flex-1 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        View Credentials
                                    </button>
                                    <button
                                        onClick={() => reviewApplication(guide)}
                                        className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-cyan-500/20"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Review Application
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL 1: REVIEW CONFIRMATION --- */}
            {isReviewModalOpen && reviewingItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-700/50">
                            <h3 className="text-xl font-bold text-white">Review Application</h3>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Applicant</p>
                                <p className="text-white font-medium text-lg">{reviewingItem.name}</p>
                                <p className="text-cyan-400 text-sm">{reviewingItem.email}</p>
                            </div>
                            
                            <p className="text-slate-300 text-sm leading-relaxed">
                                By approving this application, the user will be granted <b>Local Guide</b> status and can begin accepting bookings.
                            </p>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-700/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={declineApplication}
                                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium"
                            >
                                Reject
                            </button>
                            <button
                                onClick={approveApplication}
                                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 rounded-lg transition-colors font-medium"
                            >
                                Approve Guide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: VIEW CREDENTIALS LIST --- */}
            {isCredentialsModalOpen && viewingCredentials && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">{viewingCredentials.name}</h3>
                                <p className="text-slate-400 text-sm">Verification Documents</p>
                            </div>
                            <button
                                onClick={() => setIsCredentialsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-3">
                            {/* We iterate over the known document types */}
                            {[
                                { key: 'certificate', label: 'Tour Guide Certificate' },
                                { key: 'residency', label: 'Proof of Residency' },
                                { key: 'validId', label: 'Valid Government ID' },
                                { key: 'nbiClearance', label: 'NBI Clearance' },
                            ].map((doc) => {
                                // Access flattened data from serializer
                                const isSubmitted = viewingCredentials.credentials[doc.key];
                                
                                return (
                                    <div key={doc.key} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${isSubmitted ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
                                                <ImageIcon className="w-5 h-5" />
                                            </div>
                                            <span className="text-white font-medium">{doc.label}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {isSubmitted ? (
                                                <>
                                                    <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                                                        <Check className="w-3 h-3" />
                                                        Submitted
                                                    </span>
                                                    <button 
                                                        onClick={() => viewCredentialImage(doc.key, viewingCredentials.name, viewingCredentials.credentials)}
                                                        className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium flex items-center gap-1.5">
                                                    <X className="w-3 h-3" />
                                                    Missing
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 3: VIEW ACTUAL IMAGE --- */}
            {isViewCredentialImageModalOpen && viewingCredentialImage && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => setIsViewCredentialImageModalOpen(false)}
                                className="p-2 bg-black/50 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900 flex items-center justify-center">
                            {viewingCredentialImage.url ? (
                                <img 
                                    src={viewingCredentialImage.url} 
                                    alt="Credential Document" 
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                />
                            ) : (
                                <div className="h-96 flex flex-col items-center justify-center text-slate-500">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                    <p>Image file could not be loaded.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 text-center">
                            <h4 className="text-white font-medium text-lg capitalize">
                                {viewingCredentialImage.type.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <p className="text-slate-400 text-sm">Submitted by {viewingCredentialImage.guideName}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}