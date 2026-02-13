import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Loader2, Building, Shield, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import api from '../../api/api';

const getStatusColor = (isApproved) => {
    return isApproved
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
};

export default function AgencyManagement() {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const fetchAgencies = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/agencies/');
            setAgencies(response.data);
        } catch (error) {
            console.error("Failed to fetch agencies:", error);
            showToast("Failed to fetch agencies.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    const filteredAgencies = useMemo(() =>
        agencies.filter(a =>
            a.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [agencies, searchTerm]
    );

    const openReviewModal = (agency) => {
        setReviewingItem(agency);
        setIsReviewModalOpen(true);
    };

    const handleApproval = async (status) => {
        if (!reviewingItem) return;
        try {
            const isApproved = status === 'approved';

            await api.patch(`api/agency/${reviewingItem.id}/approve/`, {
                is_approved: isApproved
            });

            setAgencies(prev => prev.map(a =>
                a.id === reviewingItem.id ? { ...a, is_approved: isApproved } : a
            ));

            setIsReviewModalOpen(false);
            showToast(`Agency ${isApproved ? 'approved' : 'rejected'} successfully.`, "success");
        } catch (error) {
            console.error("Failed to update agency status:", error);
            showToast("Failed to update status.", "error");
        }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPages = filteredAgencies.slice(startIndex, startIndex + itemsPerPage);

    const totalPages = Math.ceil(filteredAgencies.length / itemsPerPage);

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

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search agencies by name or owner..."
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
                    {filteredAgencies.length === 0 && (
                        <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-xl">
                            <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No agencies found.</p>
                            <p className="text-xs mt-1">Make sure you have seeded the database or registered an agency.</p>
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800/70 text-slate-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Business Name</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPages.map((agency) => (
                                    <tr key={agency.id} className="border-t border-slate-700/50 hover:bg-slate-800/50">
                                        <td className="px-4 py-3">{agency.business_name}</td>
                                        <td className="px-4 py-3">{agency.owner_name}</td>
                                        <td className="px-4 py-3">{agency.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(agency.is_approved)}`}>
                                                {agency.is_approved ? "Approved" : "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => openReviewModal(agency)}
                                                className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/20 rounded-lg text-xs"
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-center items-center gap-3 mt-4 py-5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg"
                            >
                                Previous
                            </button>

                            <span className="text-slate-400">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Application Modal */}
            {isReviewModalOpen && reviewingItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Review Agency</h3>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Business Info</p>
                                <p className="text-white font-medium text-lg">{reviewingItem.business_name}</p>
                                <p className="text-cyan-400 text-sm">{reviewingItem.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Owner</p>
                                    <p className="text-white">{reviewingItem.owner_name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Phone</p>
                                    <p className="text-white">{reviewingItem.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {reviewingItem.business_license ? (
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Business License</p>
                                    <a
                                        href={reviewingItem.business_license}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-2 text-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        View Document
                                    </a>
                                </div>
                            ) : (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> No Business License uploaded.
                                    </p>
                                </div>
                            )}
                        </div>

                        {
                            !reviewingItem.is_approved && (
                                <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 bg-slate-800/50 rounded-b-2xl">
                                    <button
                                        onClick={() => handleApproval('rejected')}
                                        className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApproval('approved')}
                                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-green-500/20"
                                    >
                                        Approve Agency
                                    </button>
                                </div>
                            )
                        }
                    </div>
                </div>
            )}
        </div>
    );
}