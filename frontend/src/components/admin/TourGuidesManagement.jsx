import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Image as ImageIcon, Loader2, FileText, Shield, Ban, ExternalLink } from 'lucide-react';
import api from '../../api/api'; 

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
};

export default function TourGuidesManagement() {
    const [tourGuides, setTourGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [viewingCredentialImage, setViewingCredentialImage] = useState(null);
    const [isViewCredentialImageModalOpen, setIsViewCredentialImageModalOpen] = useState(false);

    const fetchGuides = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/admin/guide-reviews/');
            if (Array.isArray(response.data)) {
                setTourGuides(response.data);
            } else if (response.data && Array.isArray(response.data.results)) {
                setTourGuides(response.data.results);
            } else {
                setTourGuides([]);
            }
        } catch (error) {
            console.error("Failed to fetch guides:", error);
            setTourGuides([]); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuides();
    }, []);

    const filteredGuides = useMemo(() =>
        tourGuides.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [tourGuides, searchTerm]
    );

    const openDetailsModal = (guide) => {
        setSelectedGuide(guide);
        setIsDetailsModalOpen(true);
    };

    const handleApprovalAction = async (status) => {
        if (!selectedGuide) return;
        try {
            await api.patch(`api/admin/guide-reviews/${selectedGuide.id}/`, {
                status: status 
            });
            setTourGuides(prev => prev.map(g => 
                g.id === selectedGuide.id ? { ...g, status: status } : g
            ));
            setIsDetailsModalOpen(false);
        } catch (error) {
            console.error(`Failed to set status to ${status}:`, error);
            alert(`Failed to update application status.`);
        }
    };

    const viewCredentialImage = (credentialKey, guideName, credentialsObj) => {
        let url = null;
        
        if (credentialsObj) {
            url = credentialsObj[`${credentialKey}_url`];
        }

        if (url && url.startsWith('http:')) {
            url = url.replace('http:', 'https:');
        }

        console.log("Opening Secure URL:", url);

        setViewingCredentialImage({ type: credentialKey, guideName, url });
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
                        <div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 transition-all hover:bg-slate-800/70">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold text-lg flex items-center gap-3">
                                        {guide.name}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(guide.status)}`}>
                                            {guide.status}
                                        </span>
                                    </h3>
                                    <p className="text-slate-400 text-sm">{guide.email}</p>
                                </div>
                                <button
                                    onClick={() => openDetailsModal(guide)}
                                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg transition-all flex items-center gap-2 font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isDetailsModalOpen && selectedGuide && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
                        
                        <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">Application Details</h3>
                                <p className="text-slate-400 text-sm mt-1">Review documents and manage status</p>
                            </div>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 mb-6 flex justify-between items-center">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Applicant</p>
                                    <p className="text-white font-medium text-lg">{selectedGuide.name}</p>
                                    <p className="text-cyan-400 text-sm">{selectedGuide.email}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg border ${getStatusColor(selectedGuide.status)}`}>
                                    <span className="text-sm font-bold uppercase">{selectedGuide.status}</span>
                                </div>
                            </div>

                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-400" />
                                Submitted Documents
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { key: 'certificate', label: 'Tour Guide Certificate' },
                                    { key: 'residency', label: 'Proof of Residency' },
                                    { key: 'validId', label: 'Valid Government ID' },
                                    { key: 'nbiClearance', label: 'NBI Clearance' },
                                ].map((doc) => {
                                    const credentials = selectedGuide.credentials;
                                    const isSubmitted = credentials && credentials[doc.key];
                                    
                                    return (
                                        <div key={doc.key} className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSubmitted ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                                <span className="text-slate-200">{doc.label}</span>
                                            </div>
                                            
                                            {isSubmitted ? (
                                                <button 
                                                    onClick={() => viewCredentialImage(doc.key, selectedGuide.name, selectedGuide.credentials)}
                                                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <Eye className="w-3 h-3" /> View
                                                </button>
                                            ) : (
                                                <span className="text-red-400 text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                                    Missing
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors font-medium"
                            >
                                Close
                            </button>
                            {selectedGuide.status?.toLowerCase() === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleApprovalAction('Rejected')}
                                        className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprovalAction('Approved')}
                                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve Guide
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isViewCredentialImageModalOpen && viewingCredentialImage && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                             {viewingCredentialImage.url && (
                                <a 
                                    href={viewingCredentialImage.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-black/50 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm transition-all"
                                    title="Open original"
                                >
                                    <ExternalLink className="w-6 h-6" />
                                </a>
                            )}
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
                                    onError={(e) => {
                                        console.error("Image failed to load:", viewingCredentialImage.url);
                                        e.target.style.display = 'none'; 
                                    }}
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