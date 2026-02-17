import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Image as ImageIcon, Loader2, FileText, Shield, Ban, ExternalLink, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
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

    // Track which action is currently processing ('Approved', 'Rejected', or null)
    const [processingAction, setProcessingAction] = useState(null);

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

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
            showToast("Failed to fetch guides.", "error");
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

        // Start processing state
        setProcessingAction(status);

        try {
            await api.patch(`api/admin/guide-reviews/${selectedGuide.id}/`, {
                status: status
            });
            setTourGuides(prev => prev.map(g =>
                g.id === selectedGuide.id ? { ...g, status: status } : g
            ));
            setIsDetailsModalOpen(false);
            showToast(`Application status updated to ${status}.`, "success");
        } catch (error) {
            console.error(`Failed to set status to ${status}:`, error);
            showToast(`Failed to update application status.`, "error");
        } finally {
            // Stop processing state regardless of success/failure
            setProcessingAction(null);
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

    // Render logic for documents list
    const renderDocuments = () => {
        const documents = [
            { key: 'certificate', label: 'Tour Guide Certificate' },
            { key: 'residency', label: 'Proof of Residency' },
            { key: 'validId', label: 'Valid Government ID' },
            { key: 'nbiClearance', label: 'NBI Clearance' },
        ];

        return documents.map((doc) => {
            const credentials = selectedGuide.credentials;
            // Check if credentials object exists and if the specific key is present/truthy
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
        });
    }


    return (
        <div className="space-y-4 relative">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-slate-800 border-green-500/50 text-green-400'
                    : 'bg-slate-800 border-red-500/50 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

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
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                    {filteredGuides.length === 0 ? (
                        <p className="text-slate-400 text-center py-10">No guide applications found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="text-xs uppercase bg-slate-900/50 text-slate-200 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Applicant Name</th>
                                        <th className="px-6 py-4">Contact Email</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredGuides.map((guide) => (
                                        <tr
                                            key={guide.id}
                                            className="hover:bg-slate-700/30 transition-colors duration-150"
                                        >
                                            <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                                {guide.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {guide.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider inline-block ${getStatusColor(guide.status)}`}>
                                                    {guide.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => openDetailsModal(guide)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg transition-all text-xs font-medium"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                                disabled={!!processingAction} // Disable close during processing
                            >
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
                                {renderDocuments()}
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                disabled={!!processingAction}
                                className={`px-5 py-2.5 text-slate-400 rounded-lg transition-colors font-medium ${processingAction ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Close
                            </button>
                            {selectedGuide.status?.toLowerCase() === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleApprovalAction('Rejected')}
                                        disabled={!!processingAction}
                                        className={`px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors font-medium flex items-center gap-2 ${processingAction
                                                ? 'opacity-50 cursor-not-allowed text-red-400/50'
                                                : 'hover:bg-red-500/20 text-red-400'
                                            }`}
                                    >
                                        {processingAction === 'Rejected' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Rejecting...
                                            </>
                                        ) : (
                                            <>
                                                <Ban className="w-4 h-4" />
                                                Reject
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleApprovalAction('Approved')}
                                        disabled={!!processingAction}
                                        className={`px-5 py-2.5 bg-green-500 shadow-lg shadow-green-500/20 rounded-lg transition-colors font-medium flex items-center gap-2 ${processingAction
                                                ? 'opacity-70 cursor-not-allowed'
                                                : 'hover:bg-green-600'
                                            } text-white`}
                                    >
                                        {processingAction === 'Approved' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Approve Guide
                                            </>
                                        )}
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