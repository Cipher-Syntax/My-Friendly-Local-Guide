import React, { useMemo } from 'react';
import { DollarSign, Wallet, TrendingUp, Clock, CheckCircle, Download, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AgencyEarnings({ bookings = [] }) {

    const financialStats = useMemo(() => {
        // Now tracking Accepted, Confirmed, and Completed bookings
        const activeBookings = bookings.filter(b =>
            b.status === 'Accepted' ||
            b.status === 'Confirmed' ||
            b.status === 'Completed'
        );

        // Settled = Admin has checked the is_payout_settled box
        const settled = activeBookings.filter(b => b.is_payout_settled === true);
        // Pending = Admin has NOT checked the box yet (includes Accepted and Confirmed)
        const pending = activeBookings.filter(b => b.is_payout_settled === false);

        // Calculate strictly using the down_payment
        const totalEarned = settled.reduce((sum, b) => sum + (parseFloat(b.down_payment) || 0), 0);
        const pendingAmount = pending.reduce((sum, b) => sum + (parseFloat(b.down_payment) || 0), 0);

        return {
            totalEarned,
            pendingAmount,
            settledCount: settled.length,
            pendingCount: pending.length
        };
    }, [bookings]);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const activeBookings = bookings.filter(b =>
            b.status === 'Accepted' || b.status === 'Confirmed' || b.status === 'Completed'
        );

        const exportData = activeBookings.map(b => ({
            'Booking ID': b.id,
            'Tour Date': b.check_in ? new Date(b.check_in).toLocaleDateString() : 'N/A',
            'Trip Status': b.status,
            'Payout Status': b.is_payout_settled ? 'Settled' : 'Pending',
            'Downpayment Amount': b.down_payment || 0,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
        XLSX.writeFile(wb, `agency-earnings-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const validBookings = bookings
        .filter(b => b.status === 'Accepted' || b.status === 'Confirmed' || b.status === 'Completed')
        .sort((a, b) => new Date(b.created_at || b.check_in || 0) - new Date(a.created_at || a.check_in || 0));

    return (
        <div className="space-y-6 transition-colors duration-300 p-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Earnings & Payments</h2>
                    <p className="text-slate-500 dark:text-slate-400">Track your downpayment revenues and payout history</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Export Financials
                </button>
            </div>

            {/* Financial Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Settled Earnings</span>
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{financialStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        From {financialStats.settledCount} settled payouts
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending & Expected</span>
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{financialStats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Expected from {financialStats.pendingCount} active bookings
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Average Downpayment</span>
                        <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{(financialStats.settledCount + financialStats.pendingCount) > 0
                            ? ((financialStats.totalEarned + financialStats.pendingAmount) / (financialStats.settledCount + financialStats.pendingCount)).toLocaleString(undefined, { minimumFractionDigits: 2 })
                            : '0.00'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Based on active history
                    </div>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payout History</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tour Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payout Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Downpayment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {validBookings.length > 0 ? (
                                validBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                {booking.destination_detail?.name || booking.accommodation_detail?.title || `Booking #${booking.id}`}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Ref: {booking.id.toString().slice(-6).toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Status Logic */}
                                            {booking.is_payout_settled ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Settled
                                                </span>
                                            ) : booking.status === 'Accepted' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Awaiting Tourist Payment
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                                    <Clock className="w-3.5 h-3.5" /> Pending Admin Payout
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                                            {/* Exclusively uses the Downpayment Amount */}
                                            ₱{(parseFloat(booking.down_payment) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                        No active bookings or payouts available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}