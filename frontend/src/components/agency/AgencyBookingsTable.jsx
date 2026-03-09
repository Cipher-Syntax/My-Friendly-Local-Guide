import React, { useState } from 'react';
import { MapPin, Filter, Calendar, AlertCircle, CheckCircle, XCircle, Tag } from 'lucide-react';

export default function AgencyBookingsTable({ bookings, getGuideNames, getStatusBg, updateBookingStatus, openManageGuidesModal, agencyTier, freeBookingLimit }) {
    const [filterStatus, setFilterStatus] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
    const isLimitReached = agencyTier === 'free' && acceptedBookingsCount >= freeBookingLimit;

    const filteredBookings = filterStatus === 'all'
        ? bookings
        : bookings.filter(b => b.status === filterStatus);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3000);
    };

    const getBookingName = (booking) => booking.name || booking.destination_detail?.name || booking.accommodation_detail?.title || `Booking #${booking.id}`;

    const getBookingCategory = (booking) => {
        if (!booking) return 'General Tour';
        let cat = booking.destination_detail?.category || booking.category || 'General Tour';
        if (typeof cat === 'object' && cat !== null) {
            return cat.name || cat.title || 'General Tour';
        }
        return String(cat);
    };

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full relative transition-colors duration-300">
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400' : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-900 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bookings List</h3>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">{filteredBookings.length}</span>
                </div>
                <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all appearance-none capitalize min-w-[160px] font-medium"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="paid">Paid</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/20">
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Booking Name</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Schedule</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Location</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Group Size</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Assigned Guides</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Status</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Action</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Decision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((booking) => {
                                // ADDED 'confirmed' TO THESE CHECKS
                                const isManageDisabled = ['accepted', 'paid', 'confirmed', 'completed', 'declined', 'cancelled'].includes(booking.status?.toLowerCase());
                                const isDecisionMade = ['accepted', 'paid', 'confirmed', 'completed', 'declined', 'cancelled'].includes(booking.status?.toLowerCase());
                                const isPositiveStatus = ['accepted', 'paid', 'confirmed', 'completed'].includes(booking.status?.toLowerCase());

                                const guideArray = booking.guideIds || booking.assigned_agency_guides || booking.assigned_guides || [];
                                const hasGuides = guideArray.length > 0;

                                const bookingName = getBookingName(booking);
                                const bookingCategory = getBookingCategory(booking);

                                // --- DEBUG TABLE VIEW ---
                                console.log(`[TABLE VIEW] Booking ID: ${booking.id} | Extracted Category: "${bookingCategory}" | Raw Dest:`, booking.destination_detail);

                                return (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-cyan-50 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                                                    <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-slate-900 dark:text-white font-medium truncate max-w-[150px]" title={bookingName}>{bookingName}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 truncate max-w-[150px] flex items-center gap-1">
                                                            <Tag className="w-2.5 h-2.5" /> {bookingCategory}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white text-sm font-medium">
                                                    <Calendar className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                                                    <span>{formatDate(booking.check_in || booking.date)}</span>
                                                </div>
                                                <span className="text-slate-500 text-xs ml-4.5 font-medium">to {formatDate(booking.check_out || booking.date)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 dark:text-white text-sm truncate max-w-[120px] font-medium" title={booking.location || 'Local'}>{booking.location || 'Local'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 dark:text-white text-sm font-medium">{booking.num_guests || booking.groupSize || 1} people</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {hasGuides ? (
                                                    getGuideNames(guideArray).map((name, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded truncate max-w-[100px] border border-blue-200 dark:border-transparent">
                                                            {name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500 text-sm italic">Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border whitespace-nowrap ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => openManageGuidesModal(booking.id)}
                                                disabled={isManageDisabled}
                                                className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${isManageDisabled ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'}`}
                                            >
                                                Manage Guides
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!hasGuides) {
                                                            showToast("Please choose a guide for this booking", "error");
                                                            return;
                                                        }
                                                        updateBookingStatus(booking.id, 'accepted');
                                                    }}
                                                    disabled={isDecisionMade || isLimitReached}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-[80px] ${isPositiveStatus ? 'bg-green-500 text-white cursor-default' : isDecisionMade ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-green-500 hover:text-white'}`}
                                                >
                                                    {isPositiveStatus ? 'Accepted' : 'Accept'}
                                                </button>
                                                <button
                                                    onClick={() => updateBookingStatus(booking.id, 'declined')}
                                                    disabled={isDecisionMade}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-[80px] ${booking.status?.toLowerCase() === 'declined' ? 'bg-red-500 text-white cursor-default' : isDecisionMade ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white'}`}
                                                >
                                                    {booking.status?.toLowerCase() === 'declined' ? 'Declined' : 'Decline'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"><p className="text-sm font-medium">No bookings found</p></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}