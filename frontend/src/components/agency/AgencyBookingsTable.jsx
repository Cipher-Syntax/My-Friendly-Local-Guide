import React, { useCallback, useMemo, useState } from 'react';
import { MapPin, Filter, Calendar, AlertCircle, CheckCircle, XCircle, Tag, Clock, Info, CheckCircle2, Search, ChevronLeft, ChevronRight, Eye, Trash2, MessageSquare, Images, CreditCard, User } from 'lucide-react';
import api from '../../api/api';

export default function AgencyBookingsTable({ bookings, getGuideNames, getStatusBg, updateBookingStatus, confirmPayment, openManageGuidesModal, agencyTier, freeBookingLimit, deleteBooking, openMessageWithTourist = () => { } }) {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    // State for Accept & Meetup Modal
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [selectedBookingForAccept, setSelectedBookingForAccept] = useState(null);
    const [meetupForm, setMeetupForm] = useState({ location: '', time: '', instructions: '' });

    // State for Confirm Payment Modal
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

    // State for View Details Modal
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedBookingForView, setSelectedBookingForView] = useState(null);
    const [stopDetailsModalOpen, setStopDetailsModalOpen] = useState(false);

    // State for Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedBookingForDelete, setSelectedBookingForDelete] = useState(null);

    const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
    const isLimitReached = agencyTier === 'free' && acceptedBookingsCount >= freeBookingLimit;

    const filteredBookings = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return bookings.filter((b) => {
            const statusOk = filterStatus === 'all' ? true : b.status === filterStatus;
            if (!statusOk) return false;

            if (!normalizedSearch) return true;

            const haystack = [
                b.name,
                b.destination_detail?.name,
                b.accommodation_detail?.title,
                b.tourist_username,
                b.status,
                b.check_in,
                b.check_out,
                String(b.id),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [bookings, filterStatus, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

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

    // Helper to safely handle the JSONField data from Django
    const formatGuestNames = (data) => {
        if (!data) return null;

        let namesArray = [];
        if (Array.isArray(data)) {
            namesArray = data;
        } else {
            try {
                namesArray = typeof data === 'string' && data.trim() !== "" ? JSON.parse(data) : [];
            } catch (e) {
                console.error("Failed to parse guest names:", e);
                return null;
            }
        }

        if (!Array.isArray(namesArray) || namesArray.length === 0) return null;
        return namesArray.join(', ');
    };

    const resolveImageUrl = (imagePath) => {
        if (!imagePath) return '';
        const raw = String(imagePath).trim();
        if (!raw) return '';
        if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

        let apiOrigin = '';
        try {
            const base = api?.defaults?.baseURL || import.meta.env.VITE_API_URL || '';
            if (base) {
                apiOrigin = new URL(base).origin;
            }
        } catch {
            apiOrigin = '';
        }

        const normalizedRaw = raw.replace(/^\/+/, '');
        const mediaIndex = normalizedRaw.toLowerCase().indexOf('media/');

        if (mediaIndex >= 0 && apiOrigin) {
            return `${apiOrigin}/${normalizedRaw.slice(mediaIndex)}`;
        }

        if (raw.startsWith('/')) {
            return apiOrigin ? `${apiOrigin}${raw}` : raw;
        }

        return apiOrigin ? `${apiOrigin}/${normalizedRaw}` : `/${normalizedRaw}`;
    };

    const groupTimelineByDay = useCallback((timelineInput, booking) => {
        if (!timelineInput) return [];

        let timeline = timelineInput;
        if (!Array.isArray(timelineInput)) {
            try {
                timeline = JSON.parse(timelineInput);
            } catch {
                return [];
            }
        }

        if (!Array.isArray(timeline) || timeline.length === 0) return [];

        const stopLibrary = Array.isArray(booking?.tour_package_detail?.stops) ? booking.tour_package_detail.stops : [];
        const accommodationImage = booking?.accommodation_detail?.photo || booking?.accommodation_detail?.image || '';

        const getEntityImage = (entity) => {
            if (!entity || typeof entity !== 'object') return '';
            return entity.image || entity.photo || entity.stop_image || entity.thumbnail || entity.cover_image || entity.activity_image || '';
        };

        const resolveStopImage = (entry) => {
            const explicitImage = entry?.image || entry?.photo || entry?.stop_image || entry?.activityImage || entry?.activity_image;
            if (explicitImage) return resolveImageUrl(explicitImage);

            const refId = Number.parseInt(entry?.refId, 10);
            if (Number.isFinite(refId) && refId > 0) {
                const byRef = stopLibrary.find((stop) => Number(stop?.id) === refId);
                if (byRef) return resolveImageUrl(getEntityImage(byRef));
            }

            const activityName = String(entry?.activityName || entry?.name || '').trim().toLowerCase();
            if (activityName) {
                const byName = stopLibrary.find((stop) => {
                    const stopName = String(stop?.name || stop?.title || '').trim().toLowerCase();
                    return stopName === activityName;
                });

                if (byName) return resolveImageUrl(getEntityImage(byName));

                const byPartialName = stopLibrary.find((stop) => {
                    const stopName = String(stop?.name || stop?.title || '').trim().toLowerCase();
                    return stopName && (stopName.includes(activityName) || activityName.includes(stopName));
                });

                if (byPartialName) return resolveImageUrl(getEntityImage(byPartialName));
            }

            if (String(entry?.type || '').toLowerCase() === 'accom' && accommodationImage) {
                return resolveImageUrl(accommodationImage);
            }

            return '';
        };

        const dayMap = new Map();

        timeline.forEach((entry) => {
            const parsedDay = Number.parseInt(entry?.day, 10);
            const day = Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : 1;

            const place =
                entry?.location ||
                entry?.activityName ||
                entry?.title ||
                entry?.name ||
                entry?.activity ||
                'Tour Stop';

            const placeName = String(place).trim();
            if (!placeName) return;

            if (!dayMap.has(day)) {
                dayMap.set(day, []);
            }

            dayMap.get(day).push({
                place: placeName,
                description: entry?.description ? String(entry.description).trim() : '',
                startTime: entry?.startTime ? String(entry.startTime) : '',
                endTime: entry?.endTime ? String(entry.endTime) : '',
                type: entry?.type ? String(entry.type) : '',
                image: resolveStopImage(entry),
            });
        });

        return Array.from(dayMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([day, stops]) => {
                const uniqueStops = [];
                const seen = new Set();
                stops.forEach((stop) => {
                    const key = `${stop.place}||${stop.description}||${stop.startTime}||${stop.endTime}||${stop.type}||${stop.image}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueStops.push(stop);
                    }
                });

                return { day, stops: uniqueStops };
            });
    }, []);

    const groupedViewTimeline = useMemo(() => {
        return groupTimelineByDay(selectedBookingForView?.tour_package_detail?.itinerary_timeline, selectedBookingForView);
    }, [selectedBookingForView, groupTimelineByDay]);

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

    const handlePaymentConfirm = async () => {
        try {
            await confirmPayment(selectedBookingForPayment.id);
            setPaymentModalOpen(false);
            setSelectedBookingForPayment(null);
        } catch {
            showToast("Failed to confirm payment. Please try again.", "error");
        }
    };

    return (
        <>
            {/* MAIN TABLE CONTAINER */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full transition-colors duration-300">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bookings List</h3>
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">{filteredBookings.length}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search booking, tourist, date, or ID..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>

                        <div className="relative group">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                            <select
                                value={filterStatus}
                                onChange={(e) => {
                                    setFilterStatus(e.target.value);
                                    setCurrentPage(1);
                                }}
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

                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer min-w-[120px] font-medium"
                        >
                            <option value={5}>5 / page</option>
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
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
                            {paginatedBookings.length > 0 ? (
                                paginatedBookings.map((booking) => {
                                    const statusString = booking.status?.toLowerCase();
                                    const isManageDisabled = ['accepted', 'paid', 'confirmed', 'completed', 'declined', 'cancelled'].includes(statusString);
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
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBookingForView(booking);
                                                            setStopDetailsModalOpen(false);
                                                            setViewModalOpen(true);
                                                        }}
                                                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View
                                                    </button>

                                                    <button
                                                        onClick={() => openManageGuidesModal(booking.id)}
                                                        disabled={isManageDisabled}
                                                        className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${isManageDisabled ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'}`}
                                                    >
                                                        Manage Guides
                                                    </button>

                                                    <button
                                                        onClick={() => openMessageWithTourist(booking)}
                                                        disabled={!booking?.tourist_id}
                                                        className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${booking?.tourist_id
                                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                            : 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" /> Message Tourist
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isPendingStatus && (
                                                    <div className="flex items-center gap-2 mb-2">
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
                                                        className="flex items-center justify-center gap-1 w-full px-3 py-2 mb-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-emerald-500/30"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> Collect Balance
                                                    </button>
                                                )}

                                                {['accepted', 'paid', 'completed', 'declined', 'cancelled'].includes(statusString) && (
                                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic block mb-2 mt-1">
                                                        {statusString === 'completed' ? 'Fully Paid & Completed' :
                                                            statusString === 'accepted' ? 'Waiting for downpayment...' : 'Action Locked'}
                                                    </span>
                                                )}

                                                {/* DELETE BUTTON */}
                                                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 mt-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBookingForDelete(booking);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        className="flex items-center justify-center gap-1 w-full px-3 py-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete Booking
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

                <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                        Showing {filteredBookings.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">Page {safePage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODALS SECTION - MOVED OUTSIDE THE TABLE DIV */}
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

            {/* ACCEPT & MEETUP MODAL */}
            {acceptModalOpen && selectedBookingForAccept && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coordinate Meetup</h3>
                            <button onClick={() => setAcceptModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                Please provide the meetup details for <span className="font-bold">{getBookingName(selectedBookingForAccept)}</span>.
                            </p>

                            {/* NEW: Display the Start Date (Check-in Date) automatically */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meetup Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={selectedBookingForAccept.check_in || ''}
                                        disabled
                                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">* Automatically matched to the tourist's Start Date.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meetup Location *</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Zamboanga Port, Gate 2"
                                        value={meetupForm.location}
                                        onChange={(e) => setMeetupForm({ ...meetupForm, location: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 resize-none"
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
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                Not Yet
                            </button>
                            <button onClick={handlePaymentConfirm} className="px-4 py-2 font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                                Yes, Payment Received
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW DETAILS MODAL */}
            {viewModalOpen && selectedBookingForView && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Info className="w-5 h-5 text-cyan-500" /> Booking Details #{selectedBookingForView.id}
                            </h3>
                            <button onClick={() => { setStopDetailsModalOpen(false); setViewModalOpen(false); }} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Tourist Information */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Tourist Information</h4>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {selectedBookingForView.tourist_detail?.first_name} {selectedBookingForView.tourist_detail?.last_name}
                                            {(!selectedBookingForView.tourist_detail?.first_name && !selectedBookingForView.tourist_detail?.last_name) && (selectedBookingForView.tourist_username || 'N/A')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {selectedBookingForView.tourist_detail?.email || selectedBookingForView.tourist_email || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {selectedBookingForView.tourist_detail?.phone_number || selectedBookingForView.tourist_phone_number || selectedBookingForView.tourist_phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Guests</p>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {selectedBookingForView.num_guests} Pax
                                            {(() => {
                                                const guests = formatGuestNames(selectedBookingForView.additional_guest_names);
                                                return guests && (
                                                    <span className="text-xs font-normal text-slate-500 ml-1">
                                                        ({guests})
                                                    </span>
                                                );
                                            })()}
                                        </p>
                                    </div>
                                </div>

                                {/* --- START VERIFICATION DOCUMENTS --- */}
                                {(selectedBookingForView.tourist_valid_id_image || selectedBookingForView?.tourist_detail?.valid_id_image || selectedBookingForView.tourist_selfie_image) && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                        <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-400 mb-3">Verification Documents</h4>
                                        <div className="flex gap-4">
                                            {/* ID Box */}
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold flex items-center gap-1">
                                                    <CreditCard className="w-3.5 h-3.5" /> Valid ID
                                                </p>
                                                {(selectedBookingForView.tourist_valid_id_image || selectedBookingForView?.tourist_detail?.valid_id_image) ? (
                                                    <img
                                                        src={resolveImageUrl(selectedBookingForView.tourist_valid_id_image || selectedBookingForView?.tourist_detail?.valid_id_image)}
                                                        alt="Valid ID"
                                                        className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                                                    />
                                                ) : (
                                                    <div className="w-full aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                        <CreditCard className="w-6 h-6 text-slate-300 dark:text-slate-500 mb-1" />
                                                        <span className="text-xs text-slate-400">No ID</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Selfie Box */}
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5" /> Selfie
                                                </p>
                                                {selectedBookingForView.tourist_selfie_image ? (
                                                    <img
                                                        src={resolveImageUrl(selectedBookingForView.tourist_selfie_image)}
                                                        alt="Selfie"
                                                        className="w-full aspect-square object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                                                    />
                                                ) : (
                                                    <div className="w-full aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                                                        <User className="w-6 h-6 text-slate-300 dark:text-slate-500 mb-1" />
                                                        <span className="text-xs text-slate-400">No Selfie</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* --- END VERIFICATION DOCUMENTS --- */}
                            </div>

                            {/* Trip Info */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Trip Details</h4>
                                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Destination</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{selectedBookingForView.destination_detail?.name || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Dates</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{formatDate(selectedBookingForView.check_in)} - {formatDate(selectedBookingForView.check_out)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Tour Package</p>
                                        <p className="font-medium text-slate-900 dark:text-white mb-2">
                                            {selectedBookingForView.tour_package_detail?.name || 'Custom/Standard Package'}
                                        </p>

                                        {groupedViewTimeline.length > 0 && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => setStopDetailsModalOpen(true)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors"
                                                >
                                                    <Images className="w-3.5 h-3.5" /> View Stop Details
                                                </button>

                                                <div className="mt-3 pl-3 border-l-2 border-cyan-500/40 space-y-3">
                                                    <p className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">Itinerary Stops</p>
                                                    {groupedViewTimeline.map((dayGroup) => (
                                                        <div key={`day-${dayGroup.day}`} className="text-sm">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Day {dayGroup.day}</p>
                                                            {dayGroup.stops.map((stop, idx) => (
                                                                <div key={`day-${dayGroup.day}-stop-${idx}`} className="pl-2 mb-1">
                                                                    <p className="text-slate-700 dark:text-slate-300 font-medium">- {stop.place}</p>
                                                                    {stop.description && (
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-3 mt-0.5">{stop.description}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedBookingForView.accommodation_detail && (
                                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Accommodation</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{selectedBookingForView.accommodation_detail.title}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Payment Summary</h4>
                                <div className="space-y-2 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Total Price</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₱ {parseFloat(selectedBookingForView.total_price || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Down Payment</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₱ {parseFloat(selectedBookingForView.down_payment || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-emerald-200 dark:border-emerald-800/50">
                                        <span className="text-slate-600 dark:text-slate-300">Balance Due</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₱ {parseFloat(selectedBookingForView.balance_due || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedBookingForView.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            Status: {selectedBookingForView.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {stopDetailsModalOpen && selectedBookingForView && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Images className="w-5 h-5 text-cyan-500" /> Itinerary Stop Details
                            </h3>
                            <button onClick={() => setStopDetailsModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {groupedViewTimeline.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-slate-500 dark:text-slate-400">
                                    No itinerary stops available.
                                </div>
                            )}

                            {groupedViewTimeline.map((dayGroup) => (
                                <div key={`details-day-${dayGroup.day}`} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 p-4">
                                    <p className="text-sm font-extrabold text-cyan-700 dark:text-cyan-300 mb-3">Day {dayGroup.day}</p>

                                    <div className="space-y-3">
                                        {dayGroup.stops.map((stop, idx) => (
                                            <div key={`details-day-${dayGroup.day}-stop-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/70">
                                                {stop.image ? (
                                                    <img
                                                        src={stop.image}
                                                        alt={stop.place}
                                                        className="w-full h-40 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-28 bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-semibold">
                                                        No image available
                                                    </div>
                                                )}

                                                <div className="p-3">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{stop.place}</p>
                                                    {(stop.startTime || stop.endTime) && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            {stop.startTime || 'N/A'}{stop.endTime ? ` - ${stop.endTime}` : ''}
                                                        </p>
                                                    )}
                                                    {stop.type && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">{stop.type}</p>
                                                    )}
                                                    {stop.description && (
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{stop.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModalOpen && selectedBookingForDelete && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-3 bg-red-50 dark:bg-red-900/20">
                            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-full">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Delete Booking</h3>
                            <button onClick={() => setDeleteModalOpen(false)} className="ml-auto text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center space-y-3">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Are you sure you want to permanently delete <span className="font-bold">{getBookingName(selectedBookingForDelete)}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (deleteBooking) {
                                        try {
                                            await deleteBooking(selectedBookingForDelete.id);
                                            showToast("Booking deleted successfully.", "success");
                                        } catch (e) {
                                            showToast("Failed to delete booking.", "error");
                                        }
                                    } else {
                                        showToast("Delete function not provided by parent component.", "error");
                                    }
                                    setDeleteModalOpen(false);
                                    setSelectedBookingForDelete(null);
                                }}
                                className="px-4 py-2 font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm shadow-red-500/30"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}