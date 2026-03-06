import React, { useMemo } from 'react';
import { DollarSign, Wallet, TrendingUp, Clock, CheckCircle, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AgencyEarnings({ bookings = [] }) {
    // Example logic to calculate earnings from bookings
    // Adjust according to your actual backend fields (e.g., total_price, agency_fee)
    const financialStats = useMemo(() => {
        const completed = bookings.filter(b => b.status === 'Completed');
        const pending = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending');

        const totalEarned = completed.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0);
        const pendingAmount = pending.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0);

        return {
            totalEarned,
            pendingAmount,
            completedCount: completed.length,
            pendingCount: pending.length
        };
    }, [bookings]);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const exportData = bookings.map(b => ({
            'Booking ID': b.id,
            'Tour Date': b.check_in ? new Date(b.check_in).toLocaleDateString() : 'N/A',
            'Status': b.status,
            'Amount': b.total_price || 0,
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
        XLSX.writeFile(wb, `agency-earnings-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 transition-colors duration-300 p-6 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Earnings & Payments</h2>
                    <p className="text-slate-500 dark:text-slate-400">Track your agency revenue and payout history</p>
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
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Lifetime Earnings</span>
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{financialStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        From {financialStats.completedCount} completed tours
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Payouts</span>
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{financialStats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Expected from {financialStats.pendingCount} upcoming tours
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Average per Booking</span>
                        <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        ₱{financialStats.completedCount > 0 
                            ? (financialStats.totalEarned / financialStats.completedCount).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                            : '0.00'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Based on completed history
                    </div>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tour Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {bookings.length > 0 ? (
                                bookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Declined')
                                .sort((a, b) => new Date(b.created_at || b.check_in || 0) - new Date(a.created_at || a.check_in || 0))
                                .map((booking) => (
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
                                            {booking.status === 'Completed' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Payout Settled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                                    <Clock className="w-3.5 h-3.5" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                                            ₱{(parseFloat(booking.total_price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                        No transactions available yet.
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