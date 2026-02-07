// Rename this file to: src/components/admin/Feedback.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, User, Shield, Ban, CheckCircle, Calendar, Flag, Trash2, AlertCircle, XCircle } from 'lucide-react';
import api from '../../api/api';

export default function Feedback() { // Renamed Component
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [warningMessage, setWarningMessage] = useState('');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDanger: false,
        actionLabel: 'Confirm'
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/review/');
            setReports(response.data);
        } catch (error) {
            console.error("Failed to fetch feedback:", error);
            showToast("Failed to load feedback.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const initiateToggleUserStatus = (report) => {
        const currentStatus = report.reported_user_is_active;
        const action = currentStatus ? "restrict" : "activate";

        setConfirmModal({
            isOpen: true,
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            message: `Are you sure you want to ${action} the user "${report.reported_username}"?`,
            isDanger: currentStatus,
            actionLabel: currentStatus ? "Restrict User" : "Activate User",
            onConfirm: () => executeToggleStatus(report)
        });
    };

    const executeToggleStatus = async (report) => {
        const userId = report.reported_user;
        const currentStatus = report.reported_user_is_active;

        try {
            await api.patch(`api/admin/users/${userId}/`, {
                is_active: !currentStatus
            });

            setReports(prev => prev.map(r => {
                if (r.reported_user === userId) {
                    return { ...r, reported_user_is_active: !currentStatus };
                }
                return r;
            }));

            showToast(`User ${currentStatus ? 'restricted' : 'activated'} successfully.`);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error("Toggle failed:", error);
            showToast("Failed to update user status.", "error");
        }
    };

    const initiateDeleteUser = (report) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete User",
            message: `CRITICAL WARNING: This will permanently DELETE user "${report.reported_username}" and all their data. This action cannot be undone.`,
            isDanger: true,
            actionLabel: "Delete Permanently",
            onConfirm: () => executeDeleteUser(report)
        });
    };

    const executeDeleteUser = async (report) => {
        const userId = report.reported_user;
        try {
            await api.delete(`api/admin/users/${userId}/`);
            setReports(prev => prev.filter(r => r.reported_user !== userId));
            showToast(`User ${report.reported_username} deleted successfully.`);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error("Delete failed:", error);
            showToast("Failed to delete user.", "error");
        }
    };

    const openWarningModal = (report) => {
        setSelectedReport(report);
        setWarningMessage(`We have received a report regarding your activity: "${report.reason}". Please review our community guidelines.`);
        setIsWarningModalOpen(true);
    };

    const handleSendWarning = async () => {
        if (!selectedReport) return;
        try {
            await api.post(`api/review/${selectedReport.id}/warn/`, {
                message: warningMessage
            });
            showToast("Warning sent successfully.");
            setIsWarningModalOpen(false);
        } catch (error) {
            console.error("Failed to send warning:", error);
            showToast("Failed to send warning.", "error");
        }
    };

    const filteredReports = useMemo(() => {
        return reports.filter(report =>
            report.reported_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reporter_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reason.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [reports, searchTerm]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Guide': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'Agency': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Feedback & Reports</h2>
                    <p className="text-slate-400">Manage user reports and community safety.</p>
                </div>
            </div>

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
                        placeholder="Search feedback by username or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {filteredReports.length === 0 && !loading && (
                    <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/30">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No active reports. The community is safe!</p>
                    </div>
                )}

                {filteredReports.map(report => (
                    <div key={report.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 transition-all hover:border-red-500/30">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                            <Flag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                {report.reported_username}
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getTypeColor(report.reported_user_type)}`}>
                                                    {report.reported_user_type}
                                                </span>
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    Reported by: {report.reporter_username}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(report.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${report.reported_user_is_active
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {report.reported_user_is_active
                                            ? <><CheckCircle className="w-3 h-3" /> Active</>
                                            : <><Ban className="w-3 h-3" /> Restricted</>
                                        }
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Reason for Report</p>
                                    <p className="text-slate-200 leading-relaxed">{report.reason}</p>
                                </div>
                            </div>

                            <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                                <button
                                    onClick={() => openWarningModal(report)}
                                    className="flex-1 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    Warn User
                                </button>
                                <button
                                    onClick={() => initiateToggleUserStatus(report)}
                                    className={`flex-1 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border ${report.reported_user_is_active
                                            ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30'
                                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30'
                                        }`}
                                >
                                    {report.reported_user_is_active ? (
                                        <>
                                            <Ban className="w-4 h-4" />
                                            Restrict
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Activate
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => initiateDeleteUser(report)}
                                    className="flex-1 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Warning Modal */}
            {isWarningModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Send Warning
                            </h3>
                            <button onClick={() => setIsWarningModalOpen(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-400 mb-2 text-sm">
                                Sending warning to <strong>{selectedReport?.reported_username}</strong>
                            </p>
                            <textarea
                                rows="4"
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50"
                                value={warningMessage}
                                onChange={(e) => setWarningMessage(e.target.value)}
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setIsWarningModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button
                                onClick={handleSendWarning}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                            >
                                Send Warning
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-red-400' : 'text-amber-400'}`} />
                                {confirmModal.title}
                            </h3>
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300">{confirmModal.message}</p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 font-medium rounded-lg transition-colors ${confirmModal.isDanger
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                    }`}
                            >
                                {confirmModal.actionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}