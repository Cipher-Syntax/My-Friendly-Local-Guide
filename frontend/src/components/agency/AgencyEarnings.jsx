import React, { useMemo, useState } from 'react';
import { PhilippinePeso, Clock, CheckCircle, Receipt, ArrowRight, Download } from 'lucide-react';
import { exportStyledWorkbook } from '../../utils/excelExport';

const DEFAULT_FILTERS = {
    searchTerm: '',
    statusFilter: 'all',
    dateRangeFilter: 'all',
    sortBy: 'latest',
    minAmount: '',
    maxAmount: '',
};

const toNumber = (value) => {
    const parsed = parseFloat(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};


export default function AgencyEarnings({ bookings }) {
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

    const updateDraftFilter = (key, value) => {
        setDraftFilters((prev) => ({ ...prev, [key]: value }));
    };

    const hasPendingFilterChanges = useMemo(() => {
        const normalize = (value) => String(value || '').trim();
        return (
            normalize(draftFilters.searchTerm) !== normalize(appliedFilters.searchTerm)
            || draftFilters.statusFilter !== appliedFilters.statusFilter
            || draftFilters.dateRangeFilter !== appliedFilters.dateRangeFilter
            || draftFilters.sortBy !== appliedFilters.sortBy
            || normalize(draftFilters.minAmount) !== normalize(appliedFilters.minAmount)
            || normalize(draftFilters.maxAmount) !== normalize(appliedFilters.maxAmount)
        );
    }, [appliedFilters, draftFilters]);

    const financialBookings = useMemo(() => {
        const validBookings = [];

        bookings.forEach((booking) => {
            if (['accepted', 'confirmed', 'completed'].includes(String(booking.status || '').toLowerCase())) {
                const downPayment = toNumber(booking.down_payment);
                const totalBookingPrice = toNumber(booking.total_price);
                const commission = toNumber(booking.platform_fee || (totalBookingPrice * 0.02));

                let payoutAmount = toNumber(booking.agency_payout_amount || booking.guide_payout_amount || 0);

                if (payoutAmount === 0 && downPayment > 0) {
                    payoutAmount = downPayment - commission;
                }

                if (payoutAmount > 0) {
                    const touristDisplayName = [
                        String(booking?.tourist_detail?.first_name || '').trim(),
                        String(booking?.tourist_detail?.last_name || '').trim(),
                    ].filter(Boolean).join(' ') || 'Guest';

                    const createdAtTs = booking?.created_at ? new Date(booking.created_at).getTime() : 0;

                    validBookings.push({
                        ...booking,
                        touristDisplayName,
                        payoutAmount,
                        totalBookingPrice,
                        downPayment,
                        commission,
                        balance: totalBookingPrice - downPayment,
                        destinationLabel: booking.destination_detail?.name || booking.location || 'Custom Tour',
                        createdAtTs: Number.isFinite(createdAtTs) ? createdAtTs : 0,
                    });
                }
            }
        });

        return validBookings;
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        let rows = [...financialBookings];

        const query = String(appliedFilters.searchTerm || '').trim().toLowerCase();
        if (query) {
            rows = rows.filter((booking) => (
                String(booking.touristDisplayName || '').toLowerCase().includes(query)
                || String(booking.destinationLabel || '').toLowerCase().includes(query)
                || String(booking.id || '').includes(query)
            ));
        }

        if (appliedFilters.statusFilter === 'pending') {
            rows = rows.filter((booking) => !booking.is_payout_settled);
        } else if (appliedFilters.statusFilter === 'settled') {
            rows = rows.filter((booking) => !!booking.is_payout_settled);
        }

        if (appliedFilters.dateRangeFilter !== 'all') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const threshold = new Date(now);

            if (appliedFilters.dateRangeFilter === '7d') threshold.setDate(now.getDate() - 7);
            if (appliedFilters.dateRangeFilter === '30d') threshold.setDate(now.getDate() - 30);
            if (appliedFilters.dateRangeFilter === '90d') threshold.setDate(now.getDate() - 90);

            const thresholdTs = threshold.getTime();
            rows = rows.filter((booking) => booking.createdAtTs >= thresholdTs);
        }

        const minAmount = toNumber(String(appliedFilters.minAmount || '').trim());
        const maxAmount = toNumber(String(appliedFilters.maxAmount || '').trim());

        if (String(appliedFilters.minAmount || '').trim()) {
            rows = rows.filter((booking) => booking.payoutAmount >= minAmount);
        }
        if (String(appliedFilters.maxAmount || '').trim()) {
            rows = rows.filter((booking) => booking.payoutAmount <= maxAmount);
        }

        if (appliedFilters.sortBy === 'oldest') {
            rows.sort((a, b) => a.createdAtTs - b.createdAtTs);
        } else if (appliedFilters.sortBy === 'amount_desc') {
            rows.sort((a, b) => b.payoutAmount - a.payoutAmount);
        } else if (appliedFilters.sortBy === 'amount_asc') {
            rows.sort((a, b) => a.payoutAmount - b.payoutAmount);
        } else {
            rows.sort((a, b) => b.createdAtTs - a.createdAtTs);
        }

        return rows;
    }, [appliedFilters, financialBookings]);

    const stats = useMemo(() => {
        let total = 0;
        let pending = 0;
        let settled = 0;

        filteredBookings.forEach((booking) => {
            total += booking.payoutAmount;
            if (booking.is_payout_settled) {
                settled += booking.payoutAmount;
            } else {
                pending += booking.payoutAmount;
            }
        });

        return { total, pending, settled };
    }, [filteredBookings]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Pending';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const applyFilters = () => {
        setAppliedFilters({
            searchTerm: String(draftFilters.searchTerm || '').trim(),
            statusFilter: draftFilters.statusFilter,
            dateRangeFilter: draftFilters.dateRangeFilter,
            sortBy: draftFilters.sortBy,
            minAmount: String(draftFilters.minAmount || '').trim(),
            maxAmount: String(draftFilters.maxAmount || '').trim(),
        });
    };

    const resetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
    };

    const handleExportEarningsReport = () => {
        if (filteredBookings.length === 0) return;

        const dateStr = new Date().toISOString().slice(0, 10);
        exportStyledWorkbook({
            fileName: `agency-earnings-payouts-${dateStr}.xlsx`,
            reportTitle: 'Agency Earnings and Payout Export',
            metadata: [
                { label: 'Search Term', value: appliedFilters.searchTerm || 'None' },
                { label: 'Payout Status Filter', value: appliedFilters.statusFilter },
                { label: 'Date Range Filter', value: appliedFilters.dateRangeFilter },
                { label: 'Sort Mode', value: appliedFilters.sortBy },
                { label: 'Record Count', value: filteredBookings.length },
                { label: 'Total Earnings (Filtered)', value: stats.total },
                { label: 'Pending Payout (Filtered)', value: stats.pending },
                { label: 'Settled Payout (Filtered)', value: stats.settled },
            ],
            sheets: [
                {
                    name: 'Earnings Ledger',
                    tableTitle: 'Agency Earnings Transactions',
                    rows: filteredBookings.map((booking) => ({
                        booking_id: booking?.id || '',
                        tourist: booking?.touristDisplayName || '',
                        destination: booking?.destinationLabel || '',
                        booking_status: String(booking?.status || '').replace('_', ' '),
                        payout_status: booking?.is_payout_settled ? 'Settled' : 'Pending',
                        payout_amount: toNumber(booking?.payoutAmount),
                        total_booking_price: toNumber(booking?.totalBookingPrice),
                        downpayment: toNumber(booking?.downPayment),
                        commission: toNumber(booking?.commission),
                        remaining_balance: toNumber(booking?.balance),
                        created_at: booking?.created_at || '',
                        payout_channel: booking?.payout_channel || '',
                        payout_reference: booking?.payout_reference_id || '',
                        payout_settled_at: booking?.payout_settled_at || '',
                    })),
                    columns: [
                        { key: 'booking_id', header: 'Booking ID' },
                        { key: 'tourist', header: 'Tourist' },
                        { key: 'destination', header: 'Destination' },
                        { key: 'booking_status', header: 'Booking Status' },
                        { key: 'payout_status', header: 'Payout Status' },
                        { key: 'payout_amount', header: 'Payout Amount (PHP)' },
                        { key: 'total_booking_price', header: 'Total Booking Price (PHP)' },
                        { key: 'downpayment', header: 'Down Payment (PHP)' },
                        { key: 'commission', header: 'Commission (PHP)' },
                        { key: 'remaining_balance', header: 'Remaining Balance (PHP)' },
                        { key: 'created_at', header: 'Created At' },
                        { key: 'payout_channel', header: 'Payout Channel' },
                        { key: 'payout_reference', header: 'Payout Reference' },
                        { key: 'payout_settled_at', header: 'Payout Settled At' },
                    ],
                },
            ],
        });
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
           
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Earnings Card */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white/90 font-medium">Total Lifetime Earnings</h3>
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <PhilippinePeso className="w-5 h-5" />
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

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Filters</h3>
                    <div className="flex items-center gap-2">
                        {hasPendingFilterChanges && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                Changes not applied
                            </span>
                        )}
                        <button
                            onClick={handleExportEarningsReport}
                            disabled={filteredBookings.length === 0}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Excel
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <input
                        type="text"
                        value={draftFilters.searchTerm}
                        onChange={(e) => updateDraftFilter('searchTerm', e.target.value)}
                        placeholder="Search tourist, destination, or booking ID"
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400"
                    />

                    <select
                        value={draftFilters.statusFilter}
                        onChange={(e) => updateDraftFilter('statusFilter', e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="all">All payout statuses</option>
                        <option value="pending">Pending payouts</option>
                        <option value="settled">Settled payouts</option>
                    </select>

                    <select
                        value={draftFilters.dateRangeFilter}
                        onChange={(e) => updateDraftFilter('dateRangeFilter', e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="all">All time</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>

                    <select
                        value={draftFilters.sortBy}
                        onChange={(e) => updateDraftFilter('sortBy', e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="latest">Sort: Latest</option>
                        <option value="oldest">Sort: Oldest</option>
                        <option value="amount_desc">Sort: Highest amount</option>
                        <option value="amount_asc">Sort: Lowest amount</option>
                    </select>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draftFilters.minAmount}
                        onChange={(e) => updateDraftFilter('minAmount', e.target.value)}
                        placeholder="Min payout amount"
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400"
                    />

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draftFilters.maxAmount}
                        onChange={(e) => updateDraftFilter('maxAmount', e.target.value)}
                        placeholder="Max payout amount"
                        className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        onClick={applyFilters}
                        disabled={!hasPendingFilterChanges}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${hasPendingFilterChanges ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-300 text-white cursor-not-allowed'}`}
                    >
                        {hasPendingFilterChanges ? 'Apply Filters' : 'Applied'}
                    </button>

                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
                    >
                        Reset Filters
                    </button>

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-auto">
                        Showing {filteredBookings.length} of {financialBookings.length} transactions
                    </p>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction Ledger</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Chronological record of down payments and balances.</p>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map(booking => (
                            <div key={booking.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full flex-shrink-0 ${booking.is_payout_settled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                                            {booking.is_payout_settled ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {booking.destinationLabel}
                                            </p>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                                {booking.touristDisplayName} • Booking ID: #{booking.id}
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

                                {booking.is_payout_settled && (booking.payout_channel || booking.payout_reference_id || booking.payout_settled_at) && (
                                    <div className="mt-3 ml-16 sm:ml-0 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {booking.payout_channel && <span>Channel: {booking.payout_channel}</span>}
                                            {booking.payout_reference_id && <span>Reference: {booking.payout_reference_id}</span>}
                                            {booking.payout_settled_at && <span>Settled At: {new Date(booking.payout_settled_at).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                )}

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
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                                {financialBookings.length > 0 ? 'No matching transactions found.' : 'No transactions yet.'}
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                {financialBookings.length > 0 ? 'Try adjusting your filters and apply again.' : 'Earnings will appear here once bookings are confirmed.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}