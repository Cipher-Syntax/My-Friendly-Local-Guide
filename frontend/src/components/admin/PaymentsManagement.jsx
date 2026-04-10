import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import * as XLSX from 'xlsx';
import {
    Banknote,
    TrendingUp,
    CheckCircle,
    Clock,
    Download,
    AlertCircle,
    XCircle,
    AlertTriangle,
    Search,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
} from 'lucide-react';

const PAYOUT_CHANNEL_OPTIONS = [
    { value: 'GCash', label: 'GCash' },
    { value: 'Bank', label: 'Bank Transfer' },
    { value: 'Maya', label: 'Maya' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Other', label: 'Other' },
];

export default function PaymentsManagement() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [refundRequests, setRefundRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [refundFilter, setRefundFilter] = useState('all');
    const [refundSearchTerm, setRefundSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [refundCurrentPage, setRefundCurrentPage] = useState(1);
    const [refundItemsPerPage] = useState(5);
    const [refundProcessingId, setRefundProcessingId] = useState(null);
    const [refundAmountDrafts, setRefundAmountDrafts] = useState({});
    const [refundNoteDrafts, setRefundNoteDrafts] = useState({});

    const [stats, setStats] = useState({
        totalCollected: 0,
        platformFees: 0,
        pendingPayouts: 0,
        settledPayouts: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [settlementDraft, setSettlementDraft] = useState({
        payout_channel: 'GCash',
        payout_reference_id: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    // Move fetchBookings outside so it can be reused
    const fetchBookings = React.useCallback(async () => {
        try {
            const response = await api.get('/api/bookings/', {
                params: {
                    financial_only: true,
                    sort: 'latest',
                },
            });
            const relevantBookings = response.data.results || response.data;
            const filteredRelevant = relevantBookings.filter(b =>
                ['Confirmed', 'Completed'].includes(b.status)
            );

            setBookings(filteredRelevant);
            calculateStats(filteredRelevant);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            showToast("Failed to fetch bookings.", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRefundRequests = React.useCallback(async () => {
        try {
            const response = await api.get('/api/payments/refunds/admin/');
            const incoming = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : [];
            setRefundRequests(incoming);
        } catch (error) {
            console.error('Failed to fetch refund requests:', error);
            showToast('Failed to fetch refund requests.', 'error');
        }
    }, []);

    useEffect(() => {
        fetchBookings();
        fetchRefundRequests();
    }, [fetchBookings, fetchRefundRequests]);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    useEffect(() => {
        setRefundCurrentPage(1);
    }, [refundSearchTerm, refundFilter]);

    const processRefundRequest = async (refund, action) => {
        if (!refund?.id) return;

        const draftAmountRaw = refundAmountDrafts[refund.id];
        const fallbackAmount = refund.approved_amount || refund.requested_amount || 0;
        const approvedAmount = action === 'approve' || action === 'complete'
            ? Number(draftAmountRaw || fallbackAmount)
            : undefined;

        if ((action === 'approve' || action === 'complete') && (!approvedAmount || approvedAmount <= 0)) {
            showToast('Approved amount must be greater than zero.', 'error');
            return;
        }

        const payload = {
            action,
            admin_notes: refundNoteDrafts[refund.id] || '',
        };
        if (approvedAmount) {
            payload.approved_amount = approvedAmount.toFixed(2);
        }

        setRefundProcessingId(refund.id);
        try {
            await api.post(`/api/payments/refunds/${refund.id}/process/`, payload);
            showToast(`Refund #${refund.id} updated: ${action}.`, 'success');
            await Promise.all([fetchRefundRequests(), fetchBookings()]);
        } catch (error) {
            console.error('Failed to process refund request:', error);
            showToast('Failed to process refund request.', 'error');
        } finally {
            setRefundProcessingId(null);
        }
    };

    

    const calculateStats = (data) => {
        const platformFees = data
            .filter(b => b.is_payout_settled)
            .reduce((acc, curr) => acc + parseFloat(curr.platform_fee || (parseFloat(curr.total_price || 0) * 0.02)), 0);

        const totalCollected = data.reduce((acc, curr) => acc + parseFloat(curr.down_payment || 0), 0);

        const pending = data
            .filter(b => !b.is_payout_settled)
            .reduce((acc, curr) => acc + parseFloat(curr.guide_payout_amount || 0), 0);

        const settled = data
            .filter(b => b.is_payout_settled)
            .reduce((acc, curr) => acc + parseFloat(curr.guide_payout_amount || 0), 0);

        setStats({
            totalCollected,
            platformFees,
            pendingPayouts: pending,
            settledPayouts: settled
        });
    };

    const initiateSettlement = (booking) => {
        const preferredChannel = String(booking?.payout_channel || 'GCash');
        const validChannel = PAYOUT_CHANNEL_OPTIONS.some((opt) => opt.value === preferredChannel)
            ? preferredChannel
            : 'GCash';

        setSelectedBookingId(booking?.id || null);
        setSelectedBooking(booking || null);
        setSettlementDraft({
            payout_channel: validChannel,
            payout_reference_id: String(booking?.payout_reference_id || ''),
        });
        setIsModalOpen(true);
    };

    const confirmSettlement = async () => {
        if (!selectedBookingId) return;

        setIsProcessing(true);
        try {
            await api.post(`/api/bookings/${selectedBookingId}/settle_payout/`, {
                payout_channel: settlementDraft.payout_channel,
                payout_reference_id: String(settlementDraft.payout_reference_id || '').trim(),
            });
            await fetchBookings();
            showToast('Payout marked as settled with settlement details.', 'success');
            closeModal();
        } catch (error) {
            console.error("Failed to update payout:", error);
            const backendMessage = error?.response?.data?.error || 'Failed to update payout status.';
            showToast(backendMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBookingId(null);
        setSelectedBooking(null);
        setSettlementDraft({
            payout_channel: 'GCash',
            payout_reference_id: '',
        });
    };

    const getProviderName = (b) => {
        if (b.guide_detail) return `${b.guide_detail.first_name} ${b.guide_detail.last_name}`;
        if (b.agency_detail) return b.agency_detail.username || b.agency_detail.agency_name;
        if (b.accommodation_detail) return b.accommodation_detail.host_full_name || b.accommodation_detail.host_username;
        return "Unknown Provider";
    };

    const getProviderType = (b) => {
        if (b.guide_detail) return 'Tour Guide';
        if (b.agency_detail) return 'Agency';
        if (b.accommodation_detail) return 'Host';
        return 'N/A';
    };

    const getProviderPhone = (b) => {
        if (b.guide_detail) return b.guide_detail.phone_number || "Not Setup";
        if (b.agency_detail) return b.agency_detail.agency_phone || b.agency_detail.phone_number || "Not Setup";
        if (b.accommodation_detail) return b.accommodation_detail.phone_number || "Not Setup";
        return "N/A";
    };

    const getProviderPayoutAccount = (b) => b?.provider_payout_account || null;

    const getProviderPayoutSummary = (b) => {
        const payoutAccount = getProviderPayoutAccount(b);
        if (!payoutAccount) return 'Not setup';

        const accountParts = [
            payoutAccount.account_type,
            payoutAccount.account_number,
            payoutAccount.account_name,
        ].filter(Boolean);

        return accountParts.length ? accountParts.join(' • ') : 'Setup incomplete';
    };

    const getSettledByLabel = (booking) => {
        const detail = booking?.payout_processed_by_detail;
        if (!detail) return booking?.payout_processed_by ? `User #${booking.payout_processed_by}` : 'N/A';
        return detail.full_name || detail.username || `User #${detail.id}`;
    };

    const getRefundTouristName = (refund) => {
        const firstName = String(refund?.requested_by_first_name || '').trim();
        const lastName = String(refund?.requested_by_last_name || '').trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

        if (fullName) return fullName;

        const displayName = String(refund?.requested_by_display_name || '').trim();
        if (displayName) return displayName;

        const username = String(refund?.requested_by_username || '').trim();
        return username || 'Unknown';
    };

    const getRefundTouristPayoutSummary = (refund) => {
        const payout = refund?.requested_by_payout_account;
        if (!payout) return 'Not setup';

        const accountParts = [
            payout.account_type,
            payout.account_number,
            payout.account_name,
        ].filter(Boolean);

        return accountParts.length ? accountParts.join(' • ') : 'Setup incomplete';
    };

    // Filter and Search Logic
    const processedBookings = bookings.filter(booking => {
        // 1. Status Filter
        if (filter === 'settled' && !booking.is_payout_settled) return false;
        if (filter === 'pending' && booking.is_payout_settled) return false;

        // 2. Search Filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const providerName = getProviderName(booking).toLowerCase();
            const providerPhone = getProviderPhone(booking).toLowerCase();
            const payoutSummary = getProviderPayoutSummary(booking).toLowerCase();
            const bookingIdStr = booking.id.toString();

            if (!providerName.includes(searchLower) &&
                !providerPhone.includes(searchLower) &&
                !payoutSummary.includes(searchLower) &&
                !bookingIdStr.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(processedBookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBookings = processedBookings.slice(startIndex, startIndex + itemsPerPage);

    const filteredRefundRequests = refundRequests.filter((refund) => {
        const statusMatch = refundFilter === 'all' ? true : String(refund.status || '').toLowerCase() === refundFilter;

        if (!statusMatch) return false;

        if (!refundSearchTerm) return true;
        const term = refundSearchTerm.toLowerCase();
        const requestedBy = String(getRefundTouristName(refund) || '').toLowerCase();
        const requestedByUsername = String(refund.requested_by_username || '').toLowerCase();
        const requestedPhone = String(refund.requested_by_phone || '').toLowerCase();
        const payoutSummary = String(getRefundTouristPayoutSummary(refund) || '').toLowerCase();
        const reason = String(refund.reason || '').toLowerCase();
        const bookingId = String(refund.booking_id || '');
        const refundId = String(refund.id || '');
        return (
            requestedBy.includes(term) ||
            requestedByUsername.includes(term) ||
            requestedPhone.includes(term) ||
            payoutSummary.includes(term) ||
            reason.includes(term) ||
            bookingId.includes(term) ||
            refundId.includes(term)
        );
    });

    const refundTotalPages = Math.ceil(filteredRefundRequests.length / refundItemsPerPage);
    const refundStartIndex = (refundCurrentPage - 1) * refundItemsPerPage;
    const paginatedRefundRequests = filteredRefundRequests.slice(refundStartIndex, refundStartIndex + refundItemsPerPage);

    const refundStatusBadge = (statusValue) => {
        const normalized = String(statusValue || '').toLowerCase();
        if (normalized === 'requested') return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
        if (normalized === 'under_review') return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20';
        if (normalized === 'approved') return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
        if (normalized === 'rejected') return 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20';
        if (normalized === 'completed') return 'bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20';
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600';
    };

    const handleExport = () => {
        if (processedBookings.length === 0) {
            showToast("No data to export.", "error");
            return;
        }

        const exportData = processedBookings.map((b) => {
            const payoutAccount = getProviderPayoutAccount(b) || {};

            return {
                "Booking ID": b.id,
                "Provider Name": getProviderName(b),
                "Provider Type": getProviderType(b),
                "Provider GCash/Contact": getProviderPhone(b),
                "Payout Account Type": payoutAccount.account_type || 'Not setup',
                "Payout Account Name": payoutAccount.account_name || 'N/A',
                "Payout Account Number": payoutAccount.account_number || 'N/A',
                "Payout Account Notes": payoutAccount.notes || 'N/A',
                "Total Booking Price": parseFloat(b.total_price || 0),
                "Down Payment": parseFloat(b.down_payment || 0),
                "Down Payment Date": b.downpayment_paid_at ? new Date(b.downpayment_paid_at).toLocaleString() : 'N/A',
                "Balance Settled Date (Face-to-Face)": b.balance_paid_at ? new Date(b.balance_paid_at).toLocaleString() : 'Pending',
                "Platform Fee (2%)": parseFloat(b.platform_fee || (parseFloat(b.total_price || 0) * 0.02)),
                "Net Guide Payout": parseFloat(b.guide_payout_amount || 0),
                "Payout Status": b.is_payout_settled ? 'Settled' : 'Pending',
                "Settlement Channel": b.payout_channel || 'N/A',
                "Settlement Reference": b.payout_reference_id || 'N/A',
                "Settlement Date": b.payout_settled_at ? new Date(b.payout_settled_at).toLocaleString() : 'N/A',
                "Settled By": getSettledByLabel(b),
                "Booking Created At": new Date(b.created_at).toLocaleDateString(),
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        const colWidths = [
            { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
            { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 20 },
            { wch: 20 }, { wch: 15 }, { wch: 22 }, { wch: 32 },
            { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
            { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 18 }
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Payouts Report");

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = filter === 'all'
            ? `payouts-report-all-${dateStr}.xlsx`
            : `payouts-report-${filter}-${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const StatsCard = ({ title, value, icon: Icon, color, subValue, clickable, onClick }) => (
        <div
            onClick={onClick}
            className={`bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-700/50 ${clickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all shadow-sm hover:shadow-cyan-500/10' : 'shadow-sm'
                }`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
                    {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
                    {Icon && <Icon className="w-6 h-6" />}
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="text-slate-900 dark:text-white p-10">Loading financial data...</div>;

    return (
        <div className="space-y-6 relative transition-colors duration-300">
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-900 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Payout Settlement</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Action cannot be undone.</p>
                                </div>
                            </div>

                            <div className="mb-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4">
                                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Settlement Target</p>
                                <p className="mt-2 text-sm text-slate-900 dark:text-white font-medium">
                                    Booking #{selectedBookingId} • {selectedBooking ? getProviderName(selectedBooking) : 'Unknown Provider'}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                    Contact: {selectedBooking ? getProviderPhone(selectedBooking) : 'N/A'}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                    Payout Account: {selectedBooking ? getProviderPayoutSummary(selectedBooking) : 'Not setup'}
                                </p>
                            </div>

                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                        Settlement Channel
                                    </label>
                                    <select
                                        value={settlementDraft.payout_channel}
                                        onChange={(e) => setSettlementDraft((prev) => ({ ...prev, payout_channel: e.target.value }))}
                                        disabled={isProcessing}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        {PAYOUT_CHANNEL_OPTIONS.map((channel) => (
                                            <option key={channel.value} value={channel.value}>{channel.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                        Reference ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={settlementDraft.payout_reference_id}
                                        onChange={(e) => setSettlementDraft((prev) => ({ ...prev, payout_reference_id: e.target.value }))}
                                        placeholder="e.g., GCash/BPI transfer reference"
                                        disabled={isProcessing}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed text-sm">
                                Confirm only after you have completed the transfer. This logs channel, reference, timestamp, and processor for payout auditing.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={closeModal}
                                    disabled={isProcessing}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSettlement}
                                    disabled={isProcessing || !settlementDraft.payout_channel}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-lg shadow-cyan-500/20 font-medium text-sm flex items-center gap-2 transition-all"
                                >
                                    {isProcessing ? 'Processing...' : 'Yes, Mark as Settled'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments & Ledger</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage platform commissions, guide transfers, and review transaction ledgers.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Download className="w-4 h-4" />
                    Export Ledger
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Platform Earnings (2%)"
                    value={stats.platformFees.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    subValue="From settled payouts"
                    icon={TrendingUp}
                    color="emerald"
                />
                <StatsCard
                    title="Pending Payouts"
                    value={stats.pendingPayouts.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    subValue="Needs transfer to guides"
                    icon={Clock}
                    color="orange"
                />
                <StatsCard
                    title="Settled Payouts"
                    value={stats.settledPayouts.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    subValue="Already transferred"
                    icon={CheckCircle}
                    color="blue"
                />
                <StatsCard
                    title="Total Collected"
                    value={stats.totalCollected.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    subValue="Click to view all bookings"
                    icon={Banknote}
                    color="purple"
                    clickable={true}
                    onClick={() => navigate('/admin/bookings')}
                />
            </div>

            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payout Requests</h2>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                            {processedBookings.length}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search ID, Provider, Phone, Account..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending Transfer</option>
                            <option value="settled">Settled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4">Booking ID</th>
                                <th className="p-4">Provider / Guide</th>
                                <th className="p-4">Provider Contact</th>
                                <th className="p-4 text-right border-l border-slate-200 dark:border-slate-700">Total Price</th>
                                <th className="p-4 text-right">Down Payment (Paid)</th>
                                <th className="p-4 text-right">App Fee (2%)</th>
                                <th className="p-4 text-right bg-slate-50 dark:bg-slate-800">Net Payout</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {paginatedBookings.map((booking) => {
                                const totalPrice = parseFloat(booking.total_price || 0);
                                const downPayment = parseFloat(booking.down_payment || 0);
                                const appFee = parseFloat(booking.platform_fee || (totalPrice * 0.02));
                                const netPayout = parseFloat(booking.guide_payout_amount || (downPayment - appFee));

                                const originalBalance = totalPrice - downPayment;
                                const is100PercentPaid = originalBalance <= 0;

                                return (
                                    <tr key={booking.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="p-4 text-slate-900 dark:text-white font-medium">#{booking.id}</td>

                                        <td className="p-4">
                                            <div className="text-slate-900 dark:text-white font-medium">
                                                {getProviderName(booking)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {getProviderType(booking)}
                                            </div>
                                        </td>

                                        <td className="p-4 text-slate-600 dark:text-slate-300">
                                            <div className="font-medium">{getProviderPhone(booking)}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                Payout: {getProviderPayoutSummary(booking)}
                                            </div>
                                        </td>

                                        <td className="p-4 text-right border-l border-slate-100 dark:border-slate-800">
                                            <div className="text-slate-500 dark:text-slate-400 font-medium">
                                                {totalPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                            </div>
                                            <div className={`text-[10px] mt-1 font-medium ${booking.balance_paid_at ? 'text-emerald-500' : 'text-orange-400'}`}>
                                                {is100PercentPaid ? "100% Paid Online" : (
                                                    booking.balance_paid_at
                                                        ? `Bal Rec'd: ${formatDate(booking.balance_paid_at)}`
                                                        : 'Bal Pending'
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="text-slate-600 dark:text-slate-300 font-medium">
                                                {downPayment.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                {formatDate(booking.downpayment_paid_at) || 'Paid Online'}
                                            </div>
                                        </td>

                                        <td className="p-4 text-right text-rose-500 dark:text-rose-400 font-medium">
                                            - {appFee.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                        </td>

                                        <td className="p-4 text-right font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                                            {netPayout.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.is_payout_settled
                                                ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                                : 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                                                }`}>
                                                {booking.is_payout_settled ? 'Settled' : 'Pending'}
                                            </span>

                                            {booking.is_payout_settled && (
                                                <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 text-left space-y-0.5">
                                                    {booking.payout_channel && <div>Channel: {booking.payout_channel}</div>}
                                                    {booking.payout_reference_id && <div>Ref: {booking.payout_reference_id}</div>}
                                                    {booking.payout_settled_at && <div>At: {formatDateTime(booking.payout_settled_at)}</div>}
                                                    <div>By: {getSettledByLabel(booking)}</div>
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 text-right">
                                            {!booking.is_payout_settled && (
                                                <button
                                                    onClick={() => initiateSettlement(booking)}
                                                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1 ml-auto shadow-md shadow-cyan-500/10"
                                                >
                                                    Mark Settled
                                                </button>
                                            )}
                                            {booking.is_payout_settled && (
                                                <span className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Paid
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {paginatedBookings.length === 0 && (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No bookings found matching your search or filter criteria.
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(startIndex + itemsPerPage, processedBookings.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{processedBookings.length}</span> results
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Refund Requests</h2>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                            {filteredRefundRequests.length}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search refund, booking, tourist, account..."
                                value={refundSearchTerm}
                                onChange={(e) => setRefundSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <select
                            value={refundFilter}
                            onChange={(e) => setRefundFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="all">All Status</option>
                            <option value="requested">Requested</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>

                        <button
                            onClick={fetchRefundRequests}
                            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/40 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4">Refund ID</th>
                                <th className="p-4">Booking</th>
                                <th className="p-4">Tourist</th>
                                <th className="p-4">Tourist Contact</th>
                                <th className="p-4">Requested / Approved</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 min-w-[280px]">Notes / Amount</th>
                                <th className="p-4 min-w-[240px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {paginatedRefundRequests.map((refund) => {
                                const statusValue = String(refund.status || '').toLowerCase();
                                const isCompleted = statusValue === 'completed';
                                const requestedAmount = Number(refund.requested_amount || 0);
                                const approvedAmount = Number(refund.approved_amount || 0);
                                const isBusy = refundProcessingId === refund.id;
                                const canReview = statusValue === 'requested';
                                const canApproveReject = statusValue === 'requested' || statusValue === 'under_review';
                                const canComplete = statusValue === 'approved';

                                const amountDraft = refundAmountDrafts[refund.id] ?? (refund.approved_amount || refund.requested_amount || '');
                                const notesDraft = refundNoteDrafts[refund.id] ?? (refund.admin_notes || '');

                                return (
                                    <tr key={refund.id} className="text-sm align-top hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="p-4 text-slate-900 dark:text-white font-medium">#{refund.id}</td>
                                        <td className="p-4 text-slate-700 dark:text-slate-200">#{refund.booking_id || 'N/A'}</td>
                                        <td className="p-4 text-slate-700 dark:text-slate-200">{getRefundTouristName(refund)}</td>
                                        <td className="p-4 text-slate-700 dark:text-slate-200">
                                            <div className="font-medium">{refund.requested_by_phone || 'Not provided'}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                Refund To: {getRefundTouristPayoutSummary(refund)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-700 dark:text-slate-200">
                                            <div>Req: {requestedAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                App: {approvedAmount > 0
                                                    ? approvedAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
                                                    : 'Pending'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${refundStatusBadge(statusValue)}`}>
                                                {statusValue.replace('_', ' ')}
                                            </span>

                                            {(refund.processed_by_username || refund.process_date || refund.completed_date || refund.gateway_refund_id) && (
                                                <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                                    {refund.processed_by_username && <div>By: {refund.processed_by_username}</div>}
                                                    {refund.process_date && <div>Processed: {formatDateTime(refund.process_date)}</div>}
                                                    {refund.completed_date && <div>Completed: {formatDateTime(refund.completed_date)}</div>}
                                                    {refund.gateway_refund_id && <div>Gateway Ref: {refund.gateway_refund_id}</div>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                placeholder="Admin notes"
                                                value={notesDraft}
                                                onChange={(e) => setRefundNoteDrafts(prev => ({ ...prev, [refund.id]: e.target.value }))}
                                                disabled={isCompleted}
                                                className={`mb-2 px-3 py-2 w-full border rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none ${isCompleted
                                                    ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80'
                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-cyan-500'
                                                    }`}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Approved amount"
                                                value={amountDraft}
                                                onChange={(e) => setRefundAmountDrafts(prev => ({ ...prev, [refund.id]: e.target.value }))}
                                                disabled={isCompleted}
                                                className={`px-3 py-2 w-full border rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none ${isCompleted
                                                    ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80'
                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:border-cyan-500'
                                                    }`}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {canReview && (
                                                    <button
                                                        disabled={isBusy}
                                                        onClick={() => processRefundRequest(refund, 'under_review')}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                                                    >
                                                        Under Review
                                                    </button>
                                                )}
                                                {canApproveReject && (
                                                    <button
                                                        disabled={isBusy}
                                                        onClick={() => processRefundRequest(refund, 'approve')}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                {canApproveReject && (
                                                    <button
                                                        disabled={isBusy}
                                                        onClick={() => processRefundRequest(refund, 'reject')}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                                {canComplete && (
                                                    <button
                                                        disabled={isBusy}
                                                        onClick={() => processRefundRequest(refund, 'complete')}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50"
                                                    >
                                                        Mark Completed
                                                    </button>
                                                )}
                                                {isCompleted && (
                                                    <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                                        Refunded
                                                    </span>
                                                )}
                                                {isBusy && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Processing...</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredRefundRequests.length === 0 && (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No refund requests found for the selected filters.
                        </div>
                    )}
                </div>

                {refundTotalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{refundStartIndex + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(refundStartIndex + refundItemsPerPage, filteredRefundRequests.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredRefundRequests.length}</span> results
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRefundCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={refundCurrentPage === 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Page {refundCurrentPage} of {refundTotalPages}
                            </div>
                            <button
                                onClick={() => setRefundCurrentPage(prev => Math.min(prev + 1, refundTotalPages))}
                                disabled={refundCurrentPage === refundTotalPages}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}