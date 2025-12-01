import React, { useState } from 'react';
import { MapPin, Check, XCircle, Filter, Calendar } from 'lucide-react';

export default function AgencyBookingsTable({ bookings, getGuideNames, getStatusBg, updateBookingStatus, openManageGuidesModal, agencyTier, freeBookingLimit }) {
    
    const [filterStatus, setFilterStatus] = useState('all');

    const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
    const isLimitReached = agencyTier === 'free' && acceptedBookingsCount >= freeBookingLimit;

    const filteredBookings = filterStatus === 'all' 
        ? bookings 
        : bookings.filter(b => b.status === filterStatus);

    // Helper to format dates nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full">
            
            {/* Filter Header */}
            <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Bookings List</h3>
                    <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                        {filteredBookings.length}
                    </span>
                </div>
                
                <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer hover:bg-slate-800 transition-all appearance-none capitalize min-w-[160px]"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="paid">Paid</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700/50 bg-slate-900/20">
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Booking Name</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Schedule</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Location</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Group Size</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Assigned Guides</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Status</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Action</th>
                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Decision</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((booking) => {
                                const isManageDisabled = ['accepted', 'paid', 'completed', 'declined', 'cancelled'].includes(booking.status);

                                return (
                                    <tr key={booking.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                                                    <MapPin className="w-5 h-5 text-cyan-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium truncate max-w-[150px]" title={booking.name}>{booking.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-white text-sm">
                                                    <Calendar className="w-3 h-3 text-cyan-400" />
                                                    <span>{formatDate(booking.check_in)}</span>
                                                </div>
                                                <span className="text-slate-500 text-xs ml-4.5">to {formatDate(booking.check_out)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white text-sm truncate max-w-[120px]" title={booking.location}>{booking.location}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white text-sm">{booking.groupSize} people</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {booking.guideIds.length > 0 ? (
                                                    getGuideNames(booking.guideIds).map((name, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded truncate max-w-[100px]">
                                                            {name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-500 text-sm italic">Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border border-current whitespace-nowrap ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-700 text-slate-300'}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => openManageGuidesModal(booking.id)}
                                                disabled={isManageDisabled}
                                                className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                                                    isManageDisabled
                                                        ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                                        : 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'
                                                }`}
                                                title={isManageDisabled ? `Cannot manage guides when ${booking.status}` : "Assign guides"}
                                            >
                                                Manage Guides
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                                    disabled={
                                                        booking.status === 'accepted' || 
                                                        booking.status === 'paid' || 
                                                        booking.status === 'declined' || 
                                                        booking.status === 'completed' ||
                                                        booking.status === 'cancelled' ||
                                                        (booking.status !== 'accepted' && isLimitReached)
                                                    }
                                                    className={`p-2 rounded-lg transition-colors 
                                                        ${booking.status === 'accepted' ? 'bg-green-500 text-white cursor-default' : 
                                                        ['paid', 'completed'].includes(booking.status) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                                                        isLimitReached ? 'bg-yellow-900/30 text-yellow-600 cursor-not-allowed' :
                                                        'bg-slate-700/50 text-slate-400 hover:bg-green-500 hover:text-white'
                                                        }`}
                                                    title={
                                                        booking.status === 'accepted' ? "Booking already accepted" :
                                                        ['paid', 'completed'].includes(booking.status) ? "Booking finalized" :
                                                        isLimitReached ? `Upgrade to accept more bookings (Limit: ${freeBookingLimit})` : "Accept booking"
                                                    }
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => updateBookingStatus(booking.id, 'declined')}
                                                    disabled={['accepted', 'paid', 'completed', 'cancelled'].includes(booking.status)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        booking.status === 'declined'
                                                            ? 'bg-red-500 text-white'
                                                            : ['accepted', 'paid', 'completed', 'cancelled'].includes(booking.status)
                                                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                            : 'bg-slate-700/50 text-slate-400 hover:bg-red-500 hover:text-white'
                                                    }`}
                                                    title={['accepted', 'paid', 'completed'].includes(booking.status) ? 'Cannot decline active/finalized booking' : 'Decline booking'}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                    <p className="text-sm">No bookings found for "{filterStatus}"</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}