import React, { useState } from 'react';
import { MapPin, Filter, Calendar, AlertCircle, CheckCircle, XCircle, Tag, Clock, Info, CheckCircle2 } from 'lucide-react';

export default function AgencyBookingsTable({ bookings, getGuideNames, getStatusBg, updateBookingStatus, confirmPayment, openManageGuidesModal, agencyTier, freeBookingLimit }) {
    const [filterStatus, setFilterStatus] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    // State for Accept & Meetup Modal
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [selectedBookingForAccept, setSelectedBookingForAccept] = useState(null);
    const [meetupForm, setMeetupForm] = useState({ location: '', time: '', instructions: '' });

    // State for Confirm Payment Modal
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

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

    const handleAcceptConfirm = () => {
        if (!meetupForm.location || !meetupForm.time) {
            showToast("Location and Time are required to accept a booking.", "error");
            return;
        }

        updateBookingStatus(selectedBookingForAccept.id, 'accepted', {
            meetup_location: meetupForm.location,
            meetup_time: meetupForm.time,
            meetup_instructions: meetupForm.instructions
        });

        setAcceptModalOpen(false);
        setMeetupForm({ location: '', time: '', instructions: '' });
        setSelectedBookingForAccept(null);
        showToast("Booking accepted & meetup details sent!", "success");
    };

    const handlePaymentConfirm = () => {
        confirmPayment(selectedBookingForPayment.id);
        setPaymentModalOpen(false);
        setSelectedBookingForPayment(null);
        showToast("Balance received. Booking marked as Completed!", "success");
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
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Group Size</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Assigned Guides</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Status</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Action</th>
                            <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold text-sm">Decision / Payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((booking) => {
                                const statusString = booking.status?.toLowerCase();
                                const isManageDisabled = ['accepted', 'paid', 'confirmed', 'completed', 'declined', 'cancelled'].includes(statusString);

                                // FIX: Ensure button shows for pending or pending_payment status
                                const isPendingStatus = statusString === 'pending' || statusString === 'pending_payment';

                                const guideArray = booking.guideIds || booking.assigned_agency_guides || booking.assigned_guides || [];
                                const hasGuides = guideArray.length > 0;

                                const bookingName = getBookingName(booking);
                                const bookingCategory = getBookingCategory(booking);

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
                                                {booking.status ? booking.status.replace('_', ' ') : 'Pending'}
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
                                            {isPendingStatus && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (!hasGuides) {
                                                                showToast("Please assign a guide before accepting.", "error");
                                                                return;
                                                            }
                                                            setSelectedBookingForAccept(booking);
                                                            setAcceptModalOpen(true);
                                                        }}
                                                        disabled={isLimitReached}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-[80px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-green-500 hover:text-white`}
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => updateBookingStatus(booking.id, 'declined')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors w-[80px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white`}
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {statusString === 'confirmed' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBookingForPayment(booking);
                                                        setPaymentModalOpen(true);
                                                    }}
                                                    className="flex items-center justify-center gap-1 w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-emerald-500/30"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> Collect Balance
                                                </button>
                                            )}

                                            {['accepted', 'paid', 'completed', 'declined', 'cancelled'].includes(statusString) && (
                                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic block mt-1">
                                                    {statusString === 'completed' ? 'Fully Paid & Completed' :
                                                        statusString === 'accepted' ? 'Waiting for downpayment...' : 'Action Locked'}
                                                </span>
                                            )}
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

            {/* ACCEPT & MEETUP MODAL */}
            {acceptModalOpen && selectedBookingForAccept && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coordinate Meetup</h3>
                            <button onClick={() => setAcceptModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                Please provide the meetup details for <span className="font-bold">{getBookingName(selectedBookingForAccept)}</span>. The tourist will see this on their receipt.
                            </p>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meetup Location *</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Zamboanga Port, Gate 2"
                                        value={meetupForm.location}
                                        onChange={(e) => setMeetupForm({ ...meetupForm, location: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meetup Time *</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="time"
                                        value={meetupForm.time}
                                        onChange={(e) => setMeetupForm({ ...meetupForm, time: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                    Special Instructions <span className="text-xs font-normal text-slate-400">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <textarea
                                        rows="3"
                                        placeholder="e.g. Look for our guide wearing a green LocaLynk vest."
                                        value={meetupForm.instructions}
                                        onChange={(e) => setMeetupForm({ ...meetupForm, instructions: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setAcceptModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAcceptConfirm} className="px-4 py-2 font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm">
                                Accept & Send Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM PAYMENT MODAL */}
            {paymentModalOpen && selectedBookingForPayment && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20">
                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Confirm Payment
                            </h3>
                            <button onClick={() => setPaymentModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-3xl">💰</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Collect Balance</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Has the tourist paid the remaining balance for <span className="font-bold">{getBookingName(selectedBookingForPayment)}</span>?
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                                * This will mark the booking as "Completed" and the transaction as finalized.
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Not Yet
                            </button>
                            <button onClick={handlePaymentConfirm} className="px-4 py-2 font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm shadow-emerald-500/30">
                                Yes, Payment Received
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}