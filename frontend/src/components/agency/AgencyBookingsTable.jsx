import React from 'react';
import { MapPin, Check, XCircle } from 'lucide-react';

export default function AgencyBookingsTable({ bookings, getGuideNames, getStatusBg, updateBookingStatus, openManageGuidesModal, agencyTier, freeBookingLimit }) {
    
    const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;

    const isLimitReached = agencyTier === 'free' && acceptedBookingsCount >= freeBookingLimit;
    
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Booking Name</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Date & Time</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Location</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Group Size</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Assigned Guides</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Action</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Decision</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((booking) => (
                            <tr key={booking.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{booking.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-white text-sm">{booking.date}</p>
                                    <p className="text-slate-400 text-xs">{booking.time}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-white text-sm">{booking.location}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-white text-sm">{booking.groupSize} people</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {booking.guideIds.length > 0 ? (
                                            getGuideNames(booking.guideIds).map((name, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                    {name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-slate-500 text-sm">No guides assigned</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => openManageGuidesModal(booking.id)}
                                        disabled={booking.status === 'declined'}
                                        className={`px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                                            booking.status === 'declined'
                                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                : 'bg-cyan-500 hover:bg-cyan-600'
                                        }`}
                                    >
                                        Manage Guides
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                            // 🔥 NEW LOGIC: Disable if declined OR if free tier limit is reached
                                            disabled={
                                                booking.status === 'declined' || 
                                                (booking.status !== 'accepted' && isLimitReached)
                                            }
                                            className={`p-2 rounded-lg transition-colors 
                                                ${booking.status === 'accepted' ? 'bg-green-500 text-white' : 
                                                isLimitReached ? 'bg-yellow-800/50 text-yellow-400 cursor-not-allowed opacity-70' :
                                                'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-green-400'
                                                }`}
                                            title={isLimitReached && booking.status !== 'accepted' ? `Upgrade to accept more bookings (Limit: ${freeBookingLimit})` : "Accept booking"}
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => updateBookingStatus(booking.id, 'declined')}
                                            disabled={booking.status === 'accepted'}
                                            className={`p-2 rounded-lg transition-colors ${
                                                booking.status === 'declined'
                                                    ? 'bg-red-500 text-white'
                                                    : booking.status === 'accepted'
                                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-red-400'
                                            }`}
                                            title={booking.status === 'accepted' ? 'Cannot decline after accepting' : 'Decline booking'}
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}