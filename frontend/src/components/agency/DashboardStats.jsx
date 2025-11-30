import React from 'react';
import { Calendar, Users, Star, MapPin } from 'lucide-react';

export default function DashboardStats({ tourGuides = [], bookings = [], avgRating = 0 }) {
    const activeGuidesCount = tourGuides.filter(g => g.available).length;
    const totalBookings = bookings.length;
    const completedTours = bookings.filter(b => b.status === 'completed').length;


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Total Bookings</span>
                    <Calendar className="w-5 h-5 text-cyan-500" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">{totalBookings}</div>
                <div className="text-xs text-slate-400">
                    <span>All time</span>
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
                <div className="text-4xl font-bold text-white mb-1">{completedTours}</div>
                <div className="text-xs text-slate-400">Successfully finished</div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Average Rating</span>
                    <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">{avgRating || '0.0'}</div>
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
    );
}