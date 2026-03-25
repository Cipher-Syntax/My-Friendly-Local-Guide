import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Image as ImageIcon, Loader2, FileText, Shield, Ban, ExternalLink, CheckCircle, AlertCircle, XCircle, Filter } from 'lucide-react';
import api from '../../api/api';
import { formatPHPhoneLocal } from '../../utils/phoneNumber';

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'approved': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
        case 'rejected': return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
        default: return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
    }
};

export default function TourGuidesManagement() {
    const [tourGuides, setTourGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [viewingCredentialImage, setViewingCredentialImage] = useState(null);
    const [isViewCredentialImageModalOpen, setIsViewCredentialImageModalOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

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

    const filteredGuides = useMemo(() => {
        const filtered = tourGuides.filter(g => {
            const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.email?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (statusFilter !== 'All') {
                matchesStatus = g.status?.toLowerCase() === statusFilter.toLowerCase();
            }

            return matchesSearch && matchesStatus;
        });

        return filtered.sort((a, b) => {
            const statusA = a.status?.toLowerCase();
            const statusB = b.status?.toLowerCase();

            if (statusA === 'pending' && statusB !== 'pending') return -1;
            if (statusA !== 'pending' && statusB === 'pending') return 1;
            return 0;
        });
    }, [tourGuides, searchTerm, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

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
                <div key={doc.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSubmitted ? 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-600'}`}>
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{doc.label}</span>
                    </div>

                    {isSubmitted ? (
                        <button
                            onClick={() => viewCredentialImage(doc.key, selectedGuide.name, selectedGuide.credentials)}
                            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" /> View
                        </button>
                    ) : (
                        <span className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full border border-red-200 dark:border-red-500/20 font-bold uppercase tracking-wider">
                            Missing
                        </span>
                    )}
                </div>
            );
        });
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPages = filteredGuides.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredGuides.length / itemsPerPage);

    return (
        <div className="space-y-4 relative">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-900 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tour guides by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                    </div>
                    <div className="relative min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-5 w-5 text-slate-400" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors appearance-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
                    {filteredGuides.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-10 font-medium">No guide applications found.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                    <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-200 font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Applicant Name</th>
                                            <th className="px-6 py-4">Contact Email</th>
                                            <th className="px-6 py-4">Phone Number</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {paginatedPages.map((guide) => (
                                            <tr
                                                key={guide.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                    {guide.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {guide.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {guide.phone_number ? formatPHPhoneLocal(guide.phone_number) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider inline-block ${getStatusColor(guide.status)}`}>
                                                        {guide.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => openDetailsModal(guide)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 rounded-lg transition-all text-xs font-semibold"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 0 && (
                                <div className="flex justify-center items-center gap-3 border-t border-slate-200 dark:border-slate-700/50 py-4 bg-slate-50 dark:bg-slate-900/30">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Previous
                                    </button>

                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Application Details Modal */}
            {isDetailsModalOpen && selectedGuide && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">

                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-start bg-slate-50 dark:bg-transparent rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Application Details</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review documents and manage status</p>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                disabled={!!processingAction} // Disable close during processing
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/30 mb-6 flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Applicant</p>
                                    <p className="text-slate-900 dark:text-white font-bold text-lg">{selectedGuide.name}</p>
                                    <p className="text-cyan-600 dark:text-cyan-400 text-sm font-medium">{selectedGuide.email}</p>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1">
                                        {selectedGuide.phone_number ? formatPHPhoneLocal(selectedGuide.phone_number) : 'N/A'}
                                    </p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg border ${getStatusColor(selectedGuide.status)}`}>
                                    <span className="text-sm font-black uppercase">{selectedGuide.status}</span>
                                </div>
                            </div>

                            <h4 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                Submitted Documents
                            </h4>
                            <div className="space-y-3">
                                {renderDocuments()}
                            </div>
                        </div>

                        <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                disabled={!!processingAction}
                                className={`px-5 py-2.5 text-slate-600 dark:text-slate-400 rounded-lg transition-colors font-bold ${processingAction ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                Close
                            </button>
                            {selectedGuide.status?.toLowerCase() === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleApprovalAction('Rejected')}
                                        disabled={!!processingAction}
                                        className={`px-5 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg transition-colors font-bold flex items-center gap-2 ${processingAction
                                            ? 'opacity-50 cursor-not-allowed text-red-500/50 dark:text-red-400/50'
                                            : 'hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400'
                                            }`}
                                    >
                                        {processingAction === 'Rejected' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Rejecting...
                                            </>
                                        ) : (
                                            <>
                                                <Ban className="w-5 h-5" />
                                                Reject
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleApprovalAction('Approved')}
                                        disabled={!!processingAction}
                                        className={`px-5 py-2.5 bg-green-500 shadow-lg shadow-green-500/20 rounded-lg transition-colors font-bold flex items-center gap-2 text-white ${processingAction
                                            ? 'opacity-70 cursor-not-allowed'
                                            : 'hover:bg-green-600'
                                            }`}
                                    >
                                        {processingAction === 'Approved' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
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
                <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-opacity">
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            {viewingCredentialImage.url && (
                                <a
                                    href={viewingCredentialImage.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-black/50 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm transition-all shadow-lg"
                                    title="Open original"
                                >
                                    <ExternalLink className="w-6 h-6" />
                                </a>
                            )}
                            <button
                                onClick={() => setIsViewCredentialImageModalOpen(false)}
                                className="p-2 bg-black/50 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm transition-all shadow-lg"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900 flex items-center justify-center relative">
                            {viewingCredentialImage.url ? (
                                <img
                                    src={viewingCredentialImage.url}
                                    alt="Credential Document"
                                    className="w-full h-auto max-h-[80vh] object-contain bg-slate-100 dark:bg-transparent"
                                    onError={(e) => {
                                        console.error("Image failed to load:", viewingCredentialImage.url);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="h-96 flex flex-col items-center justify-center text-slate-500">
                                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                    <p className="font-medium">Image file could not be loaded.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center bg-slate-800/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-700/50 shadow-lg">
                            <h4 className="text-white font-bold text-lg capitalize">
                                {viewingCredentialImage.type.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <p className="text-slate-300 text-sm font-medium">Submitted by {viewingCredentialImage.guideName}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}