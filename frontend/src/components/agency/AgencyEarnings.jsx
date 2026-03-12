import React, { useMemo } from 'react';
import { Banknote, Clock, CheckCircle, Receipt, ArrowRight } from 'lucide-react';

export default function AgencyEarnings({ bookings }) {
    const stats = useMemo(() => {
        let total = 0;
        let pending = 0;
        let settled = 0;
        const validBookings = [];

        bookings.forEach(booking => {
            if (['accepted', 'confirmed', 'completed'].includes(booking.status?.toLowerCase())) {
                const downPayment = parseFloat(booking.down_payment || 0);
                const totalBookingPrice = parseFloat(booking.total_price || 0);
                const commission = parseFloat(booking.platform_fee || (totalBookingPrice * 0.02));

                let payoutAmount = parseFloat(booking.agency_payout_amount || booking.guide_payout_amount || 0);

                if (payoutAmount === 0 && downPayment > 0) {
                    payoutAmount = downPayment - commission;
                }

                if (payoutAmount > 0) {
                    total += payoutAmount;
                    if (booking.is_payout_settled) {
                        settled += payoutAmount;
                    } else {
                        pending += payoutAmount;
                    }
                    validBookings.push({
                        ...booking,
                        payoutAmount,
                        totalBookingPrice,
                        downPayment,
                        commission,
                        balance: totalBookingPrice - downPayment
                    });
                }
            }
        });

        // Sort by date descending
        validBookings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        return { total, pending, settled, validBookings };
    }, [bookings]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Pending';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Earnings Card */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white/90 font-medium">Total Lifetime Earnings</h3>
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Banknote className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black mt-4">
                        {stats.total.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </p>
                </div>

                {/* Pending Payout Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-slate-500 dark:text-slate-400 font-medium">Pending Payout</h3>
                        <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-4">
                        {stats.pending.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">From App Admin</p>
                </div>

                {/* Settled Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-slate-500 dark:text-slate-400 font-medium">Settled / Paid</h3>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-4">
                        {stats.settled.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Successfully Received</p>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction Ledger</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Chronological record of down payments and balances.</p>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {stats.validBookings.length > 0 ? (
                        stats.validBookings.map(booking => (
                            <div key={booking.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full flex-shrink-0 ${booking.is_payout_settled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                            {booking.is_payout_settled ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {booking.destination_detail?.name || booking.location || "Custom Tour"}
                                            </p>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                                {booking.tourist_username || "Guest"} • Booking ID: #{booking.id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right ml-16 sm:ml-0 flex flex-col items-start sm:items-end">
                                        <p className="font-bold text-cyan-600 dark:text-cyan-400 text-lg">
                                            + {booking.payoutAmount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                        </p>
                                        <span className={`inline-block mt-1.5 px-3 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${booking.is_payout_settled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                            {booking.is_payout_settled ? "Settled" : "Processing"}
                                        </span>
                                    </div>
                                </div>

                                {/* --- REVISION 12: CHRONOLOGICAL TIMELINE LEDGER --- */}
                                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/50 ml-16 sm:ml-0">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Payment Ledger Timeline</h4>

                                    <div className="flex flex-col gap-4">
                                        {/* Step 1: Downpayment */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-24 shrink-0 text-xs font-medium text-slate-500 pt-0.5">
                                                {formatDate(booking.downpayment_paid_at)}
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-cyan-500/20 z-10" />
                                                <div className="w-px h-full bg-slate-200 dark:bg-slate-700 absolute top-2.5 bottom-[-16px]" />
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Online Downpayment</p>
                                                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                                                            <ArrowRight className="w-3 h-3" /> Less App Fee: {booking.commission.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {booking.downPayment.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 2: Balance */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-24 shrink-0 text-xs font-medium text-slate-500 pt-0.5">
                                                {formatDate(booking.balance_paid_at)}
                                            </div>
                                            <div className="relative flex flex-col items-center">
                                                <div className={`w-2.5 h-2.5 rounded-full z-10 ring-4 ${booking.balance_paid_at ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-slate-300 ring-slate-200 dark:bg-slate-600 dark:ring-slate-700/50'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className={`flex justify-between items-center p-3 rounded-lg border ${booking.balance_paid_at ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-transparent border-dashed border-slate-200 dark:border-slate-700'}`}>
                                                    <div>
                                                        <p className={`text-sm font-semibold ${booking.balance_paid_at ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {booking.balance_paid_at ? 'Face-to-Face Balance Received' : 'Remaining Balance (Pending)'}
                                                        </p>
                                                    </div>
                                                    <p className={`text-sm font-bold ${booking.balance_paid_at ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                                        {booking.balance.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* --- END REVISION 12 --- */}

                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center">
                            <Receipt className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No transactions yet.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Earnings will appear here once bookings are confirmed.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}