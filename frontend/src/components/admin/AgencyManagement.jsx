import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, Check, X, Loader2, Building, Shield, CheckCircle, AlertCircle, XCircle, Filter } from 'lucide-react';
import api from '../../api/api';
import { formatPHPhoneLocal } from '../../utils/phoneNumber';

const getStatusColor = (status) => {
    if (status === 'Approved') return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
    if (status === 'Rejected') return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
    return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
};

export default function AgencyManagement() {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // New Loading state for buttons

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



    useEffect(() => {
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
        fetchAgencies();
    }, []);

    const filteredAgencies = useMemo(() => {
        return agencies.filter(a => {
            const matchesSearch = a.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.email?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (statusFilter !== 'All') {
                matchesStatus = a.status === statusFilter;
            }

            return matchesSearch && matchesStatus;
        });
    }, [agencies, searchTerm, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const openReviewModal = (agency) => {
        setReviewingItem(agency);
        setIsReviewModalOpen(true);
    };

    const handleApproval = async (newStatus) => {
        if (!reviewingItem) return;
        setIsProcessing(true); // Disable buttons

        try {
            await api.patch(`api/agency/${reviewingItem.id}/approve/`, {
                status: newStatus
            });

            setAgencies(prev => prev.map(a =>
                a.id === reviewingItem.id ? { ...a, status: newStatus } : a
            ));

            setIsReviewModalOpen(false);
            showToast(`Agency ${newStatus.toLowerCase()} successfully.`, "success");
        } catch (error) {
            console.error("Failed to update agency status:", error);
            showToast("Failed to update status.", "error");
        } finally {
            setIsProcessing(false); // Turn buttons back on
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

            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search agencies by name or owner..."
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
                <div className="space-y-3">
                    {filteredAgencies.length === 0 && (
                        <div className="text-center py-10 text-slate-500 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                            <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No agencies found.</p>
                            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                        </div>
                    )}

                    {filteredAgencies.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Business Name</th>
                                        <th className="px-4 py-3 font-semibold">Owner</th>
                                        <th className="px-4 py-3 font-semibold">Phone Number</th>
                                        <th className="px-4 py-3 font-semibold">Email</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPages.map((agency) => (
                                        <tr key={agency.id} className="border-t border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{agency.business_name}</td>
                                            <td className="px-4 py-3">{agency.owner_name}</td>
                                            <td className="px-4 py-3">{agency.phone}</td>
                                            <td className="px-4 py-3">{agency.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(agency.status || 'Pending')}`}>
                                                    {agency.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => openReviewModal(agency)}
                                                    className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

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
                        </div>
                    )}
                </div>
            )}

            {/* Review Application Modal */}
            {isReviewModalOpen && reviewingItem && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-transparent rounded-t-2xl">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Review Agency</h3>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/30">
                                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Business Info</p>
                                <p className="text-slate-900 dark:text-white font-semibold text-lg">{reviewingItem.business_name}</p>
                                <p className="text-cyan-600 dark:text-cyan-400 text-sm font-medium mt-0.5">{reviewingItem.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/30">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Owner</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{reviewingItem.owner_name}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/30">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Phone</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{reviewingItem.phone ? formatPHPhoneLocal(reviewingItem.phone) : 'N/A'}</p>
                                </div>
                            </div>

                            {reviewingItem.business_license ? (
                                <div className="pt-2">
                                    <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Business License</p>
                                    <a
                                        href={reviewingItem.business_license}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-2.5 text-center bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl transition-colors text-sm font-semibold border border-slate-200 dark:border-transparent"
                                    >
                                        View Document
                                    </a>
                                </div>
                            ) : (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl mt-2">
                                    <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2 font-medium">
                                        <Shield className="w-4 h-4" /> No Business License uploaded.
                                    </p>
                                </div>
                            )}
                        </div>

                        {
                            (reviewingItem.status === 'Pending' || !reviewingItem.status) && (
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                                    <button
                                        disabled={isProcessing}
                                        onClick={() => handleApproval('Rejected')}
                                        className="px-5 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? 'Processing...' : 'Reject'}
                                    </button>
                                    <button
                                        disabled={isProcessing}
                                        onClick={() => handleApproval('Approved')}
                                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {isProcessing ? 'Processing...' : 'Approve Agency'}
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