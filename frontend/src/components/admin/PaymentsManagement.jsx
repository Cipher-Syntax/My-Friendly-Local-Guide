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
    ChevronRight
} from 'lucide-react';

export default function PaymentsManagement() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [stats, setStats] = useState({
        totalCollected: 0,
        platformFees: 0,
        pendingPayouts: 0,
        settledPayouts: 0
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    const fetchBookings = async () => {
        try {
            const response = await api.get('/api/bookings/');
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

    const initiateSettlement = (bookingId) => {
        setSelectedBookingId(bookingId);
        setIsModalOpen(true);
    };

    const confirmSettlement = async () => {
        if (!selectedBookingId) return;

        setIsProcessing(true);
        try {
            await api.patch(`/api/bookings/${selectedBookingId}/`, {
                is_payout_settled: true
            });
            await fetchBookings();
            showToast("Payout marked as settled!", "success");
            closeModal();
        } catch (error) {
            console.error("Failed to update payout:", error);
            showToast("Failed to update status.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBookingId(null);
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
            const bookingIdStr = booking.id.toString();

            if (!providerName.includes(searchLower) &&
                !providerPhone.includes(searchLower) &&
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

    const handleExport = () => {
        if (processedBookings.length === 0) {
            showToast("No data to export.", "error");
            return;
        }

        const exportData = processedBookings.map(b => ({
            "Booking ID": b.id,
            "Provider Name": getProviderName(b),
            "Provider Type": getProviderType(b),
            "Provider GCash/Contact": getProviderPhone(b),
            "Total Booking Price": parseFloat(b.total_price || 0),
            "Down Payment": parseFloat(b.down_payment || 0),
            "Down Payment Date": b.downpayment_paid_at ? new Date(b.downpayment_paid_at).toLocaleString() : 'N/A',
            "Balance Settled Date (Face-to-Face)": b.balance_paid_at ? new Date(b.balance_paid_at).toLocaleString() : 'Pending',
            "Platform Fee (2%)": parseFloat(b.platform_fee || (parseFloat(b.total_price || 0) * 0.02)),
            "Net Guide Payout": parseFloat(b.guide_payout_amount || 0),
            "Payout Status": b.is_payout_settled ? 'Settled' : 'Pending',
            "Booking Created At": new Date(b.created_at).toLocaleDateString()
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        const colWidths = [
            { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 25 },
            { wch: 20 }, { wch: 15 }, { wch: 22 }, { wch: 32 },
            { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 }
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
                    <Icon className="w-6 h-6" />
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
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
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

                            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                                Are you sure you have manually transferred the funds to this guide's account?
                                Marking this as settled will update the guide's dashboard status to "Paid".
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
                                    disabled={isProcessing}
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
                                placeholder="Search ID, Provider, Phone..."
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
                                            {getProviderPhone(booking)}
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
                                        </td>

                                        <td className="p-4 text-right">
                                            {!booking.is_payout_settled && (
                                                <button
                                                    onClick={() => initiateSettlement(booking.id)}
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
        </div>
    );
}