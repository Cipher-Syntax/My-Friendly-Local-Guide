import React, { useMemo, useState } from 'react';
import { Calendar, History, Search, User } from 'lucide-react';

const HISTORY_STATUSES = ['completed', 'declined', 'cancelled', 'refunded'];

export default function AgencyBookingHistory({ bookings = [], getStatusBg }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const historicalBookings = useMemo(() => {
        return bookings.filter((booking) => HISTORY_STATUSES.includes(String(booking?.status || '').toLowerCase()));
    }, [bookings]);

    const filteredHistory = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return historicalBookings.filter((booking) => {
            const status = String(booking?.status || '').toLowerCase();
            const statusPass = statusFilter === 'all' ? true : status === statusFilter;
            if (!statusPass) return false;

            if (!normalizedSearch) return true;

            const haystack = [
                booking?.name,
                booking?.destination_detail?.name,
                booking?.accommodation_detail?.title,
                booking?.tourist_username,
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
    }, [historicalBookings, searchTerm, statusFilter]);

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
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {filteredHistory.length} records
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by booking, tourist, destination, or ID"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 capitalize"
                    >
                        <option value="all">All History Status</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>
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
                                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                        No booking history found.
                                    </td>
                                </tr>
                            )}

                            {filteredHistory.map((booking) => {
                                const bookingTitle = booking?.destination_detail?.name || booking?.accommodation_detail?.title || booking?.name || `Booking #${booking?.id}`;

                                return (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-slate-900 dark:text-white font-medium">{bookingTitle}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Booking #{booking.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{booking?.tourist_username || 'Guest'}</span>
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
            </div>
        </div>
    );
}
