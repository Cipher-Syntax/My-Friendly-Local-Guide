import React, { useMemo } from 'react';
import { DollarSign, Clock, CheckCircle, Receipt } from 'lucide-react';

export default function AgencyEarnings({ bookings }) {
    const stats = useMemo(() => {
        let total = 0;
        let pending = 0;
        let settled = 0;
        const validBookings = [];

        bookings.forEach(booking => {
            // Debugging log: Uncomment this if you still see 0.00 to see what the backend is sending
            // console.log("Booking data:", booking.status, booking.down_payment, booking.total_price);

            // FIX: Added 'accepted' to the array since Agency bookings use 'Accepted' instead of 'Confirmed'
            if (['accepted', 'confirmed', 'completed'].includes(booking.status?.toLowerCase())) {
                const downPayment = parseFloat(booking.down_payment || 0);
                const totalBookingPrice = parseFloat(booking.total_price || 0);

                // Prioritize agency payout amount from backend, fallback to manual calculation
                let payoutAmount = parseFloat(booking.agency_payout_amount || booking.guide_payout_amount || 0);

                if (payoutAmount === 0 && downPayment > 0) {
                    const commission = totalBookingPrice * 0.02; // Assuming 2% platform fee
                    payoutAmount = downPayment - commission;
                }

                if (payoutAmount > 0) {
                    total += payoutAmount;
                    if (booking.is_payout_settled) {
                        settled += payoutAmount;
                    } else {
                        pending += payoutAmount;
                    }
                    validBookings.push({ ...booking, payoutAmount });
                }
            }
        });

        // Sort by date descending
        validBookings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        return { total, pending, settled, validBookings };
    }, [bookings]);

    return (
        <div className="space-y-6 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Earnings Card */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white/90 font-medium">Total Lifetime Earnings</h3>
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black mt-4">
                        ₱{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ₱{stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        ₱{stats.settled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Successfully Received</p>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Payouts from down payments collected by the app.</p>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {stats.validBookings.length > 0 ? (
                        stats.validBookings.map(booking => (
                            <div key={booking.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full flex-shrink-0 ${booking.is_payout_settled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                        {booking.is_payout_settled ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{booking.location}</p>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                            {booking.tourist_username || "Guest"} • {new Date(booking.created_at || booking.check_in).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">Booking ID: #{booking.id}</p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right ml-16 sm:ml-0">
                                    <p className="font-bold text-cyan-600 dark:text-cyan-400 text-lg">
                                        + ₱{booking.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <span className={`inline-block mt-1.5 px-3 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${booking.is_payout_settled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                        {booking.is_payout_settled ? "Settled" : "Processing"}
                                    </span>
                                </div>
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