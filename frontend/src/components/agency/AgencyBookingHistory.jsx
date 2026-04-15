import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, History, Search, User, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { exportStyledWorkbook } from '../../utils/excelExport';

const HISTORY_STATUSES = ['completed', 'declined', 'cancelled', 'refunded'];

export default function AgencyBookingHistory({ bookings = [], getStatusBg }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const getTouristDisplayName = (booking) => {
        const tourist = booking?.tourist_detail || {};
        const profileName = [tourist?.first_name, tourist?.last_name].filter(Boolean).join(' ').trim();

        return (
            profileName ||
            booking?.tourist_name ||
            booking?.tourist_full_name ||
            booking?.tourist_display_name ||
            booking?.tourist_username ||
            tourist?.username ||
            'Guest'
        );
    };

    const historicalBookings = useMemo(() => {
        return bookings.filter((booking) => HISTORY_STATUSES.includes(String(booking?.status || '').toLowerCase()));
    }, [bookings]);

    const getBookingTimestamp = (booking) => {
        const raw = booking?.check_in || booking?.created_at || booking?.check_out;
        if (!raw) return 0;
        const parsed = new Date(raw).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getBookingAmount = (booking) => Number(booking?.total_price || 0);

    const filteredHistory = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        let parsedFromDate = null;
        if (fromDate) {
            const [year, month, day] = fromDate.split('-');
            parsedFromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        }

        let parsedToDate = null;
        if (toDate) {
            const [year, month, day] = toDate.split('-');
            parsedToDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        return historicalBookings.filter((booking) => {
            const status = String(booking?.status || '').toLowerCase();
            const statusPass = statusFilter === 'all' ? true : status === statusFilter;
            if (!statusPass) return false;

            if (parsedFromDate || parsedToDate) {
                const bookingTimestamp = getBookingTimestamp(booking);
                if (!bookingTimestamp) return false;

                if (parsedFromDate && bookingTimestamp < parsedFromDate.getTime()) return false;
                if (parsedToDate && bookingTimestamp > parsedToDate.getTime()) return false;
            }

            if (!normalizedSearch) return true;

            const touristDisplayName = getTouristDisplayName(booking);
            const touristUsername = booking?.tourist_username || booking?.tourist_detail?.username;

            const haystack = [
                booking?.name,
                booking?.destination_detail?.name,
                booking?.accommodation_detail?.title,
                touristDisplayName,
                touristUsername,
                booking?.status,
                booking?.check_in,
                booking?.check_out,
                String(booking?.id || ''),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [historicalBookings, searchTerm, statusFilter, fromDate, toDate]);

    const sortedHistory = useMemo(() => {
        const next = [...filteredHistory];

        next.sort((a, b) => {
            const aStatus = String(a?.status || '').toLowerCase();
            const bStatus = String(b?.status || '').toLowerCase();
            const aTimestamp = getBookingTimestamp(a);
            const bTimestamp = getBookingTimestamp(b);
            const aAmount = getBookingAmount(a);
            const bAmount = getBookingAmount(b);

            switch (sortBy) {
                case 'oldest':
                    return aTimestamp - bTimestamp;
                case 'amount_high':
                    return bAmount - aAmount;
                case 'amount_low':
                    return aAmount - bAmount;
                case 'status':
                    return aStatus.localeCompare(bStatus);
                case 'newest':
                default:
                    return bTimestamp - aTimestamp;
            }
        });

        return next;
    }, [filteredHistory, sortBy]);

    const summary = useMemo(() => {
        const completed = sortedHistory.filter((booking) => String(booking?.status || '').toLowerCase() === 'completed').length;
        const declinedOrCancelled = sortedHistory.filter((booking) => {
            const status = String(booking?.status || '').toLowerCase();
            return status === 'declined' || status === 'cancelled';
        }).length;
        const refunded = sortedHistory.filter((booking) => String(booking?.status || '').toLowerCase() === 'refunded').length;
        const grossValue = sortedHistory.reduce((sum, booking) => sum + getBookingAmount(booking), 0);

        return {
            completed,
            declinedOrCancelled,
            refunded,
            grossValue,
        };
    }, [sortedHistory]);

    const totalPages = Math.max(1, Math.ceil(sortedHistory.length / pageSize));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedHistory = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return sortedHistory.slice(start, end);
    }, [sortedHistory, currentPage, pageSize]);

    const startItem = sortedHistory.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, sortedHistory.length);

    const formatDate = (value) => {
        if (!value) return 'N/A';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleExportReport = () => {
        if (sortedHistory.length === 0) return;

        const dateStr = new Date().toISOString().slice(0, 10);
        exportStyledWorkbook({
            fileName: `agency-booking-history-${dateStr}.xlsx`,
            reportTitle: 'Agency Booking History Export',
            metadata: [
                { label: 'Search Term', value: searchTerm || 'None' },
                { label: 'Status Filter', value: statusFilter },
                { label: 'From Date', value: fromDate || 'N/A' },
                { label: 'To Date', value: toDate || 'N/A' },
                { label: 'Sort Mode', value: sortBy },
                { label: 'Record Count', value: sortedHistory.length },
                { label: 'Gross Booking Value', value: summary.grossValue },
            ],
            sheets: [
                {
                    name: 'History Records',
                    tableTitle: 'Filtered Booking History Records',
                    rows: sortedHistory.map((booking) => ({
                        booking_id: booking?.id || '',
                        booking_title: booking?.destination_detail?.name || booking?.accommodation_detail?.title || booking?.name || `Booking #${booking?.id}`,
                        tourist: getTouristDisplayName(booking),
                        status: String(booking?.status || '').replace('_', ' '),
                        check_in: booking?.check_in || '',
                        check_out: booking?.check_out || '',
                        created_at: booking?.created_at || '',
                        total_price: Number(getBookingAmount(booking).toFixed(2)),
                    })),
                    columns: [
                        { key: 'booking_id', header: 'Booking ID' },
                        { key: 'booking_title', header: 'Booking' },
                        { key: 'tourist', header: 'Tourist' },
                        { key: 'status', header: 'Status' },
                        { key: 'check_in', header: 'Check In' },
                        { key: 'check_out', header: 'Check Out' },
                        { key: 'created_at', header: 'Created At' },
                        { key: 'total_price', header: 'Total Price (PHP)' },
                    ],
                },
            ],
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30">
                            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Booking History</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Completed, declined, cancelled, and refunded bookings.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {sortedHistory.length} records
                        </span>
                        <button
                            onClick={handleExportReport}
                            disabled={sortedHistory.length === 0}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Excel
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Completed</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.completed}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Declined + Cancelled</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.declinedOrCancelled}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Refunded</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.refunded}</p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Gross Booking Value</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₱ {summary.grossValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <div className="xl:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by booking, tourist, destination, or ID"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 capitalize"
                    >
                        <option value="all">All History Status</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">From:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(event) => {
                                setFromDate(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">To:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(event) => {
                                setToDate(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>
                </div>

                <div className="mt-3 flex flex-col md:flex-row md:items-center justify-start gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <select
                            value={sortBy}
                            onChange={(event) => {
                                setSortBy(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-auto px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="newest">Sort: Newest First</option>
                            <option value="oldest">Sort: Oldest First</option>
                            <option value="amount_high">Sort: Amount (High to Low)</option>
                            <option value="amount_low">Sort: Amount (Low to High)</option>
                            <option value="status">Sort: Status (A-Z)</option>
                        </select>
                        {/* CHANGED TO BLUE BACKGROUND HERE */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setFromDate('');
                                setToDate('');
                                setSortBy('newest');
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition-colors whitespace-nowrap"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                        Showing {startItem}-{endItem} of {sortedHistory.length} record{sortedHistory.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Per page</span>
                        <select
                            value={pageSize}
                            onChange={(event) => {
                                setPageSize(Number(event.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30">
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Booking</th>
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Tourist</th>
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Schedule</th>
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Total</th>
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                            {paginatedHistory.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                        No booking history found.
                                    </td>
                                </tr>
                            )}

                            {paginatedHistory.map((booking) => {
                                const bookingTitle = booking?.destination_detail?.name || booking?.accommodation_detail?.title || booking?.name || `Booking #${booking?.id}`;
                                const touristDisplayName = getTouristDisplayName(booking);
                                const touristUsername = booking?.tourist_username || booking?.tourist_detail?.username || '';

                                return (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-slate-900 dark:text-white font-medium">{bookingTitle}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Booking #{booking.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-sm">
                                                <User className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">{touristDisplayName}</p>
                                                    {touristUsername && touristUsername !== touristDisplayName && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">@{touristUsername}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                                                    <span>{formatDate(booking?.check_in)}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 ml-5">to {formatDate(booking?.check_out)}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            ₱ {getBookingAmount(booking).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border whitespace-nowrap ${getStatusBg ? getStatusBg(booking?.status) : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                                {String(booking?.status || 'unknown').replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-sm">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1 || sortedHistory.length === 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" /> Prev
                    </button>

                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                        Page {sortedHistory.length === 0 ? 0 : currentPage} / {sortedHistory.length === 0 ? 0 : totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages || sortedHistory.length === 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}