import React, { useEffect } from 'react';
import { Calendar, Users, Star, MapPin, TrendingUp, Clock, Award } from 'lucide-react';

export default function AgencyDashboardContent({ tourGuides = [], bookings = [], avgRating = 0, completedTours = 0, activeGuides = 0, getStatusBg }) {
    
    // Fallback calculations
    const activeGuidesCount = activeGuides || tourGuides.filter(g => g.available).length;
    const totalBookings = bookings.length;
    const completedToursCount = completedTours || bookings.filter(b => b.status === 'completed').length;

    useEffect(() => {
        // Log to verify data flow
        console.warn('🔥 AgencyDashboardContent Stats - Total:', totalBookings, 'Completed:', completedToursCount, 'Rating:', avgRating);
    }, [bookings, avgRating, completedToursCount]);

    // Mock trend data - in a real app, this would come from the backend
    const trendData = [
        { month: 'Jan', value: 45, label: '45' },
        { month: 'Feb', value: 52, label: '52' },
        { month: 'Mar', value: 48, label: '48' },
        { month: 'Apr', value: 65, label: '65' },
        { month: 'May', value: 72, label: '72' },
        { month: 'Jun', value: 68, label: '68' },
        { month: 'Jul', value: 85, label: '85' },
        { month: 'Aug', value: 92, label: '92' },
        { month: 'Sep', value: 78, label: '78' },
        { month: 'Oct', value: 95, label: '95' },
        { month: 'Nov', value: totalBookings > 0 ? totalBookings : 127, label: (totalBookings > 0 ? totalBookings : 127).toString() }, // Use dynamic total if available
        { month: 'Dec', value: 0, label: '0' }
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">Total Bookings</span>
                        <Calendar className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{totalBookings}</div>
                    <div className="text-xs text-slate-400">
                        <span>All time history</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">Active Guides</span>
                        <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{activeGuidesCount}</div>
                    <div className="text-xs text-slate-400">Total: {tourGuides.length} guides</div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">Completed Tours</span>
                        <MapPin className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{completedToursCount}</div>
                    <div className="text-xs text-slate-400">Successfully finished</div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">Average Rating</span>
                        <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{typeof avgRating === 'number' ? avgRating.toFixed(1) : '0.0'}</div>
                    <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star 
                                key={i} 
                                className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'}`} 
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Booking Trends */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white text-lg font-semibold">Booking Trends</h3>
                        <p className="text-slate-400 text-sm mt-1">Monthly bookings overview</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                
                <div className="h-64 flex items-end justify-between gap-2">
                    {trendData.map((data, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="relative w-full flex flex-col items-center">
                                <span className="text-white text-xs font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">
                                    {data.label}
                                </span>
                                <div 
                                    className="w-full bg-gradient-to-t from-cyan-500/20 to-blue-500/20 rounded-t-sm group-hover:from-cyan-500 group-hover:to-blue-500 transition-all duration-300 relative overflow-hidden"
                                    style={{ height: `${(data.value / 150) * 100}%`, minHeight: data.value > 0 ? '4px' : '2px' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                            <span className="text-slate-500 text-xs font-medium">{data.month}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section: Top Guides & Upcoming Tours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Performing Guides */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">Top Performing Guides</h3>
                        <Award className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="space-y-3">
                        {tourGuides.length > 0 ? (
                            tourGuides
                                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                                .slice(0, 4)
                                .map((guide) => (
                                    <div key={guide.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {guide.avatar || guide.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{guide.name}</p>
                                                <p className="text-slate-400 text-xs">{guide.tours || 0} tours</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-yellow-400 text-xs font-bold">{guide.rating || 'N/A'}</span>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No guides available.</div>
                        )}
                    </div>
                </div>

                {/* Upcoming Tours */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">Upcoming Tours</h3>
                        <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="space-y-3">
                        {bookings.length > 0 ? (
                            bookings
                                .filter(b => b.status !== 'declined' && b.status !== 'cancelled')
                                .slice(0, 4)
                                .map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/20">
                                                <MapPin className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium line-clamp-1">{booking.name}</p>
                                                <p className="text-slate-400 text-xs">{booking.date}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-700 text-slate-300'}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No upcoming tours found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}