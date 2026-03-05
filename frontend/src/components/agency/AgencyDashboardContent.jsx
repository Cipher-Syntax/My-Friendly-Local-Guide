import React, { useState, useMemo } from 'react';
import { Calendar, Users, Star, MapPin, TrendingUp, Clock, Award, Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function AgencyDashboardContent({ tourGuides = [], bookings = [], avgRating = 0, completedTours = 0, activeGuides = 0, getStatusBg }) {
    const [filter, setFilter] = useState('Daily');

    // Fallback calculations
    const activeGuidesCount = activeGuides || tourGuides.filter(g => g.available || g.is_active).length;
    const totalBookings = bookings.length;

    // Matches your exact backend choices
    const completedToursCount = completedTours || bookings.filter(b => b.status === 'Completed').length;

    // Derived State and Memoized Calculations based on current Filter
    const processedData = useMemo(() => {
        // Exclude Cancelled, Declined, and Refunded from the trends
        const validBookings = bookings.filter(b => {
            const s = b.status || '';
            return s !== 'Cancelled' && s !== 'Declined' && s !== 'Refunded';
        });

        let trendData = [];
        const now = new Date();

        // Helper function to safely get a local date string (YYYY-M-D)
        const getDateKey = (dateObj) => {
            return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
        };

        if (filter === 'Daily') {
            // Generate the last 7 days ending with today
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                trendData.push({
                    name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    dateKey: getDateKey(d),
                    Bookings: 0
                });
            }
        } else if (filter === 'Weekly') {
            // Last 4 weeks
            for (let i = 3; i >= 0; i--) {
                trendData.push({
                    name: i === 0 ? 'This Week' : `${i} Wks Ago`,
                    Bookings: 0
                });
            }
        } else if (filter === 'Monthly') {
            // Standard 12 months for the current year
            trendData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, index) => ({
                name: m,
                monthIndex: index,
                Bookings: 0
            }));
        } else if (filter === 'Yearly') {
            // Last 5 years including the current year
            const currentYear = now.getFullYear();
            trendData = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map(y => ({
                name: y.toString(),
                year: y,
                Bookings: 0
            }));
        }

        // Slot each booking into the right bucket using created_at
        validBookings.forEach(b => {
            // Your backend serializer sends created_at (booking date) and check_in (tour date)
            const rawDate = b.created_at || b.check_in;

            if (!rawDate) return;

            const date = new Date(rawDate);
            if (isNaN(date.getTime())) return;

            if (filter === 'Daily') {
                const bKey = getDateKey(date);
                const targetBucket = trendData.find(t => t.dateKey === bKey);
                if (targetBucket) {
                    targetBucket.Bookings += 1;
                }
            } else if (filter === 'Weekly') {
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfBooking = new Date(date.getFullYear(), date.getMonth(), date.getDate());

                if (startOfBooking <= startOfToday) {
                    const diffTime = Math.abs(startOfToday - startOfBooking);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const weeksAgo = Math.floor(diffDays / 7);

                    if (weeksAgo >= 0 && weeksAgo <= 3) {
                        const targetIndex = 3 - weeksAgo;
                        if (trendData[targetIndex]) {
                            trendData[targetIndex].Bookings += 1;
                        }
                    }
                }
            } else if (filter === 'Monthly') {
                if (date.getFullYear() === now.getFullYear()) {
                    trendData[date.getMonth()].Bookings += 1;
                }
            } else if (filter === 'Yearly') {
                const targetBucket = trendData.find(t => t.year === date.getFullYear());
                if (targetBucket) {
                    targetBucket.Bookings += 1;
                }
            }
        });

        return { trendData };
    }, [bookings, filter]);

    // Export Functionality
    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        const cleanTrendData = processedData.trendData.map(({ name, Bookings }) => ({ Period: name, Bookings }));
        const wsTrends = XLSX.utils.json_to_sheet(cleanTrendData);
        XLSX.utils.book_append_sheet(wb, wsTrends, `${filter} Trends`);

        const wsBookings = XLSX.utils.json_to_sheet(bookings);
        XLSX.utils.book_append_sheet(wb, wsBookings, "All Bookings");

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `agency-report-${filter.toLowerCase()}-${dateStr}.xlsx`);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-300 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-white font-semibold">
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header Controls for Export & Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                    <p className="text-slate-400">Live agency performance and statistics</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
                        <Filter className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

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

            {/* Booking Trends - Recharts Graph */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            Booking Trends ({filter})
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Volume overview based on backend data</p>
                    </div>
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
                            <Bar dataKey="Bookings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
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
                                .sort((a, b) => ((b.rating || b.average_rating || 0) - (a.rating || a.average_rating || 0)))
                                .slice(0, 4)
                                .map((guide) => (
                                    <div key={guide.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {guide.avatar || (guide.name || guide.first_name || 'U').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{`${guide.first_name || ''} ${guide.last_name || ''}`.trim() || guide.username || 'Unnamed Guide'}</p>
                                                <p className="text-slate-400 text-xs">{guide.tours || guide.tour_count || 0} tours</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-yellow-400 text-xs font-bold">{guide.rating || guide.average_rating || 'N/A'}</span>
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
                                .filter(b => b.status !== 'Declined' && b.status !== 'Cancelled')
                                // Sort to show the closest upcoming tours first based on check_in
                                .sort((a, b) => new Date(a.check_in || 0) - new Date(b.check_in || 0))
                                .slice(0, 4)
                                .map((booking) => {
                                    // Extract the name from destination_detail or accommodation_detail based on your serializers
                                    const tourName = booking.destination_detail?.name || booking.accommodation_detail?.title || `Booking #${booking.id}`;

                                    return (
                                        <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/20">
                                                    <MapPin className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-medium line-clamp-1">{tourName}</p>
                                                    <p className="text-slate-400 text-xs">{booking.check_in ? new Date(booking.check_in).toLocaleDateString() : 'No date set'}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-700 text-slate-300'}`}>
                                                {booking.status ? booking.status.replace('_', ' ') : 'Pending'}
                                            </span>
                                        </div>
                                    )
                                })
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No upcoming tours found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}