import React, { useState, useMemo } from 'react';
import { Calendar, Users, Star, MapPin, TrendingUp, Clock, Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function AgencyDashboardContent({
    tourGuides = [],
    bookings = [],
    avgRating = 0,
    completedTours = 0,
    activeGuides = 0,
    getStatusBg
}) {
    const [filter, setFilter] = useState('Daily');

    const getNormalizedStatus = (value) => String(value || '').toLowerCase();
    const getAssignedGuideIds = (booking) => {
        const source = Array.isArray(booking?.guideIds)
            ? booking.guideIds
            : (Array.isArray(booking?.assigned_agency_guides) ? booking.assigned_agency_guides : []);

        return source
            .map((id) => String(id || '').trim())
            .filter(Boolean);
    };

    const parseDateSafe = (value) => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    // Fallback calculations
    const activeGuidesCount = activeGuides || tourGuides.filter(g => g.available || g.is_active).length;
    const totalGuidePool = tourGuides.length;
    const formatGuideRatio = (count) => `${count}/${totalGuidePool}`;
    const totalBookings = bookings.length;

    // Matches your exact backend choices
    const completedToursCount = Number.isFinite(completedTours)
        ? completedTours
        : bookings.filter((b) => getNormalizedStatus(b?.status) === 'completed').length;

    const activeAssignmentBookings = useMemo(() => {
        const excluded = new Set(['cancelled', 'declined', 'refunded', 'completed', 'pending_payment']);
        return bookings.filter((booking) => !excluded.has(getNormalizedStatus(booking?.status)));
    }, [bookings]);

    const guideWorkloadSummary = useMemo(() => {
        const assignmentCountByGuide = new Map();
        const bookedGuideIds = new Set();

        activeAssignmentBookings.forEach((booking) => {
            const assignedIds = getAssignedGuideIds(booking);
            assignedIds.forEach((guideId) => {
                bookedGuideIds.add(guideId);
                assignmentCountByGuide.set(guideId, (assignmentCountByGuide.get(guideId) || 0) + 1);
            });
        });

        const normalizedGuides = tourGuides.map((guide) => {
            const idKey = String(guide?.id || '').trim();
            const isActive = Boolean(guide?.available || guide?.is_active);
            const assignedCount = assignmentCountByGuide.get(idKey) || 0;

            return {
                idKey,
                displayName: guide?.name || `${guide?.first_name || ''} ${guide?.last_name || ''}`.trim() || guide?.username || 'Unnamed Guide',
                avatar: guide?.avatar || (guide?.name || guide?.first_name || 'U').charAt(0),
                isActive,
                isBooked: bookedGuideIds.has(idKey),
                assignedCount,
            };
        });

        const topAssignedGuides = normalizedGuides
            .filter((guide) => guide.assignedCount > 0)
            .sort((a, b) => b.assignedCount - a.assignedCount || a.displayName.localeCompare(b.displayName))
            .slice(0, 4);

        const bookedGuidesCount = normalizedGuides.filter((guide) => guide.isActive && guide.isBooked).length;
        const availableNowCount = normalizedGuides.filter((guide) => guide.isActive && !guide.isBooked).length;
        const inactiveGuidesCount = normalizedGuides.filter((guide) => !guide.isActive).length;
        const unassignedActiveBookings = activeAssignmentBookings.filter((booking) => getAssignedGuideIds(booking).length === 0).length;

        return {
            topAssignedGuides,
            bookedGuidesCount,
            availableNowCount,
            inactiveGuidesCount,
            unassignedActiveBookings,
        };
    }, [tourGuides, activeAssignmentBookings]);

    // Derived State and Memoized Calculations based on current Filter
    const processedData = useMemo(() => {
        // Exclude Cancelled, Declined, and Refunded from the trends
        const validBookings = bookings.filter(b => {
            const s = getNormalizedStatus(b?.status);
            return s !== 'cancelled' && s !== 'declined' && s !== 'refunded';
        });

        let trendData = [];
        const now = new Date();

        // Helper function to safely get a local date string (YYYY-M-D)
        const getDateKey = (dateObj) => {
            return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
        };

        if (filter === 'Daily') {
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
            for (let i = 3; i >= 0; i--) {
                trendData.push({
                    name: i === 0 ? 'This Week' : `${i} Wks Ago`,
                    Bookings: 0
                });
            }
        } else if (filter === 'Monthly') {
            trendData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, index) => ({
                name: m,
                monthIndex: index,
                Bookings: 0
            }));
        } else if (filter === 'Yearly') {
            const currentYear = now.getFullYear();
            trendData = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map(y => ({
                name: y.toString(),
                year: y,
                Bookings: 0
            }));
        }

        // Slot each booking into the right bucket using created_at
        validBookings.forEach(b => {
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

    const upcomingBookings = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        return bookings
            .filter((booking) => {
                const status = getNormalizedStatus(booking?.status);
                if (['declined', 'cancelled', 'refunded', 'completed'].includes(status)) {
                    return false;
                }

                // Keep only bookings that have not ended yet.
                const checkOutDate = parseDateSafe(booking?.check_out);
                if (checkOutDate) {
                    return checkOutDate >= todayStart;
                }

                const checkInDate = parseDateSafe(booking?.check_in);
                if (checkInDate) {
                    return checkInDate >= todayStart;
                }

                return false;
            })
            .sort((a, b) => {
                const aDate = parseDateSafe(a?.check_in) || parseDateSafe(a?.check_out);
                const bDate = parseDateSafe(b?.check_in) || parseDateSafe(b?.check_out);
                return (aDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (bDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
            });
    }, [bookings]);

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
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-600 dark:text-slate-300 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-slate-900 dark:text-white font-bold">
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            {/* Header Controls for Export & Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h2>
                    <p className="text-slate-500 dark:text-slate-400">Live agency performance and statistics</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                        <Filter className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f
                                    ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Bookings</span>
                        <Calendar className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{totalBookings}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>All time history</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Guides</span>
                        <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{activeGuidesCount}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total: {tourGuides.length} guides</div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Completed Tours</span>
                        <MapPin className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{completedToursCount}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Successfully finished</div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Average Rating</span>
                        <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{typeof avgRating === 'number' ? avgRating.toFixed(1) : '0.0'}</div>
                    <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Star
                                key={i}
                                className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-300 dark:text-slate-600'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Booking Trends - Recharts Graph */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                            Booking Trends ({filter})
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Volume overview based on backend data</p>
                    </div>
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#e2e8f0', className: 'dark:fill-slate-800', opacity: 0.4 }} />
                            <Bar dataKey="Bookings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Section: Guide Workload and Upcoming Tours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Guide Workload & Availability */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Guide Workload & Availability</h3>
                        <Users className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Available</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-200 mt-1">{formatGuideRatio(guideWorkloadSummary.availableNowCount)}</p>
                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">guides</p>
                        </div>
                        <div className="rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Booked</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-200 mt-1">{formatGuideRatio(guideWorkloadSummary.bookedGuidesCount)}</p>
                            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">guides</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Unavailable</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{formatGuideRatio(guideWorkloadSummary.inactiveGuidesCount)}</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">guides</p>
                        </div>
                    </div>

                    <div className="mb-4 rounded-xl border border-cyan-100 dark:border-cyan-500/20 bg-cyan-50/60 dark:bg-cyan-500/10 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Unassigned Active Bookings</p>
                        <p className="text-2xl font-black text-cyan-700 dark:text-cyan-200 mt-1">{guideWorkloadSummary.unassignedActiveBookings}</p>
                    </div>

                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Top Assigned Guides</h4>
                    <div className="space-y-3">
                        {guideWorkloadSummary.topAssignedGuides.length > 0 ? (
                                guideWorkloadSummary.topAssignedGuides.map((guide) => (
                                    <div key={guide.idKey} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                {guide.avatar}
                                            </div>
                                            <div>
                                                <p className="text-slate-900 dark:text-white text-sm font-bold">{guide.displayName}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{guide.assignedCount} active booking{guide.assignedCount === 1 ? '' : 's'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${guide.isBooked
                                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20'
                                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20'
                                            }`}>
                                            {guide.isBooked ? 'Booked' : 'Available'}
                                        </span>
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm font-medium">No active guide assignments yet.</div>
                        )}
                    </div>
                </div>

                {/* Upcoming Tours */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Upcoming Tours</h3>
                        <Clock className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <div className="space-y-3">
                        {upcomingBookings.length > 0 ? (
                            upcomingBookings
                                .slice(0, 4)
                                .map((booking) => {
                                    const tourName = booking.destination_detail?.name || booking.accommodation_detail?.title || `Booking #${booking.id}`;
                                    const checkInLabel = parseDateSafe(booking?.check_in)?.toLocaleDateString() || 'No date set';
                                    const checkOutLabel = parseDateSafe(booking?.check_out)?.toLocaleDateString() || 'No date set';

                                    return (
                                        <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                                                    <MapPin className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white text-sm font-bold line-clamp-1">{tourName}</p>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Check in: {checkInLabel}</p>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Check out: {checkOutLabel}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusBg ? getStatusBg(booking.status) : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-transparent'}`}>
                                                {booking.status ? booking.status.replace('_', ' ') : 'Pending'}
                                            </span>
                                        </div>
                                    )
                                })
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm font-medium">No upcoming tours found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}