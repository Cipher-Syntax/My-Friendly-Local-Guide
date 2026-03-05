import React from 'react';
import { MapPin, Users, User, Plus, UserX, Tag } from 'lucide-react';

export default function BookingsList({ bookings, selectedBookingId, setSelectedBookingId, getGuideNames, getStatusBg, getStatusColor }) {

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
        <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">BOOKINGS</h3>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            const guideArray = booking.guideIds || booking.assigned_agency_guides || booking.assigned_guides || [];
                            const bookingName = getBookingName(booking);
                            const bookingCategory = getBookingCategory(booking);

                            // --- DEBUG CARD VIEW ---
                            console.log(`[CARD VIEW] Booking ID: ${booking.id} | Extracted Category: "${bookingCategory}" | Raw Dest:`, booking.destination_detail);

                            return (
                                <div
                                    key={booking.id}
                                    className={`rounded-xl p-5 border transition-colors ${selectedBookingId === booking.id ? 'border-cyan-500 ring-2 ring-cyan-500/50 bg-slate-800' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <MapPin className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold text-lg">{bookingName}</h4>
                                                <div className="flex items-center gap-2 mt-0.5 mb-1">
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-700/50 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                                                        <Tag className="w-3 h-3" /> {bookingCategory}
                                                    </span>
                                                    <p className="text-slate-400 text-sm">{booking.location || 'Local'}</p>
                                                </div>
                                                <p className="text-slate-500 text-xs flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    Group Size: {booking.num_guests || booking.groupSize || '1'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-white font-medium">{booking.date || (booking.check_in && new Date(booking.check_in).toLocaleDateString())}</div>
                                            <div className="text-slate-400 text-sm">{booking.time}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border border-current ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-700 text-slate-300'}`}>
                                            {booking.status}
                                        </span>
                                        {guideArray.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                                <User className="w-4 h-4" />
                                                <span className='font-medium'>Guides:</span>
                                                {getGuideNames(guideArray).map((name, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-slate-700 rounded text-xs">{name}</span>
                                                ))}
                                            </div>
                                        )}
                                        {guideArray.length === 0 && booking.status?.toLowerCase() === 'pending' && (
                                            <div className="flex items-center gap-2 text-sm text-yellow-400">
                                                <UserX className="w-4 h-4" />
                                                <span>Guide required</span>
                                            </div>
                                        )}
                                    </div>

                                    {booking.status?.toLowerCase() !== 'cancelled' && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-slate-400 text-sm">Progress</span>
                                                <span className="text-slate-300 text-sm font-medium">{booking.progress || 0}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getStatusColor ? getStatusColor(booking.status) : 'bg-slate-500'} transition-all duration-300`}
                                                    style={{ width: `${booking.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedBookingId(selectedBookingId === booking.id ? null : booking.id)}
                                            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2
                                                ${selectedBookingId === booking.id
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                                }`}
                                            disabled={booking.status?.toLowerCase() === 'cancelled' || booking.status?.toLowerCase() === 'completed'}
                                        >
                                            {selectedBookingId === booking.id ? (
                                                <><UserX className="w-4 h-4" /> Stop Assigning</>
                                            ) : (
                                                <><Plus className="w-4 h-4" /> Manage Guides</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}