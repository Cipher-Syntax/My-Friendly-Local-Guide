import React from 'react';
import { Calendar, Users, Star, TrendingUp, Clock, MapPin, Award } from 'lucide-react';

export default function AgencyDashboardContent({ activeGuides, completedTours, avgRating, tourGuides, bookings, getStatusBg }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-medium">Total Bookings</h3>
                        <Calendar className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">127</p>
                    <p className="text-slate-500 text-sm">For this month</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-medium">Active Guides</h3>
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">{activeGuides}</p>
                    <p className="text-slate-500 text-sm">Total: {tourGuides.length} guides</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-medium">Completed Tours</h3>
                        <MapPin className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">{completedTours}</p>
                    <p className="text-slate-500 text-sm">This month</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 text-sm font-medium">Average Rating</h3>
                        <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">{avgRating}</p>
                    <div className="flex gap-1 mt-2">
                        {[1,2,3,4,5].map(i => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white text-lg font-semibold">Booking Trends</h3>
                        <p className="text-slate-400 text-sm mt-1">Monthly bookings overview</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                
                <div className="h-64 flex items-end justify-between gap-2">
                    {[
                        { month: 'Jan', value: 45, label: '45' },
                        { month: 'Feb', value: 52, label: '52' },
                        { month: 'Mar', value: 48, label: '48' },
                        { month: 'Apr', value: 65, label: '65' },
                        { month: 'May', value: 72, label: '72' },
                        { month: 'Jun', value: 68, label: '68' },
                        { month: 'Jul', 'value': 85, label: '85' },
                        { month: 'Aug', value: 92, label: '92' },
                        { month: 'Sep', value: 78, label: '78' },
                        { month: 'Oct', value: 95, label: '95' },
                        { month: 'Nov', value: 127, label: '127' },
                        { month: 'Dec', value: 0, label: '0' }
                    ].map((data, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="relative w-full flex flex-col items-center">
                                <span className="text-white text-xs font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {data.label}
                                </span>
                                <div 
                                    className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all hover:from-cyan-400 hover:to-blue-400"
                                    style={{ height: `${(data.value / 127) * 100}%`, minHeight: data.value > 0 ? '8px' : '2px' }}
                                ></div>
                            </div>
                            <span className="text-slate-500 text-xs font-medium">{data.month}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">Top Performing Guides</h3>
                        <Award className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="space-y-3">
                        {tourGuides
                            .sort((a, b) => b.rating - a.rating)
                            .slice(0, 4)
                            .map((guide, idx) => (
                                <div key={guide.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {guide.avatar}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{guide.name}</p>
                                            <p className="text-slate-400 text-xs">{guide.tours} tours</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        <span className="text-white text-sm font-semibold">{guide.rating}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">Upcoming Tours</h3>
                        <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="space-y-3">
                        {bookings
                            .filter(b => b.status !== 'declined')
                            .slice(0, 4)
                            .map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{booking.name}</p>
                                            <p className="text-slate-400 text-xs">{booking.date}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBg(booking.status)}`}>
                                        {booking.status}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}