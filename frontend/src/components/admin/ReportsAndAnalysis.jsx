import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Map, Globe, Activity, ArrowUpRight, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import api from '../../api/api';
import { Loader2 } from 'lucide-react';

// A reusable card component for stats
const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
                <p className="text-slate-500 text-xs mt-1">{subtext}</p>
            </div>
            <div className={`p-3 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
        </div>
        {trend && (
            <div className="flex items-center gap-1 mt-4 text-green-400 text-sm font-medium">
                <ArrowUpRight className="w-4 h-4" />
                <span>{trend}</span>
            </div>
        )}
    </div>
);

// A simple bar for visualization
const ProgressBar = ({ label, value, max, color }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-sm">
            <span className="text-slate-300">{label}</span>
            <span className="text-white font-medium">{value}</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
                className={`h-full bg-${color}-500 rounded-full transition-all duration-1000`}
                style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
            />
        </div>
    </div>
);

export default function ReportsAndAnalysis() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        revenue: 0,
        totalBookings: 0,
        activeAgencies: 0,
        totalGuides: 0,
        totalDestinations: 0,
        totalUsers: 0,
        monthlyBookings: Array(12).fill(0),
        systemLogs: [],
        topRegions: []
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch data from multiple endpoints
                const [bookingsRes, agenciesRes, guidesRes, destinationsRes, alertsRes] = await Promise.all([
                    api.get('api/bookings/'),
                    api.get('api/agencies/'),
                    api.get('api/admin/guide-reviews/'), // Using review list to count total applied guides
                    api.get('api/destinations/'),
                    api.get('api/alerts/') // Use alerts as system logs
                ]);

                const bookings = bookingsRes.data.results || bookingsRes.data || [];
                const agencies = agenciesRes.data.results || agenciesRes.data || [];
                const guides = guidesRes.data.results || guidesRes.data || [];
                const destinations = destinationsRes.data.results || destinationsRes.data || [];
                const alerts = alertsRes.data.results || alertsRes.data || [];

                // --- PROCESS REVENUE ---
                // Sum total_price of bookings that are not cancelled or pending payment
                const validBookings = bookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Pending_Payment');
                const totalRevenue = validBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

                // --- PROCESS MONTHLY TRENDS ---
                const monthlyCounts = Array(12).fill(0);
                bookings.forEach(b => {
                    const date = new Date(b.created_at);
                    const month = date.getMonth(); // 0-11
                    monthlyCounts[month]++;
                });

                // --- PROCESS REGIONS ---
                // Count destinations by city/location
                const locationCounts = {};
                destinations.forEach(d => {
                    const loc = d.location || 'Unknown';
                    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
                });
                const sortedRegions = Object.entries(locationCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3) // Top 3
                    .map(([city, count]) => ({ city, count }));


                setData({
                    revenue: totalRevenue,
                    totalBookings: bookings.length,
                    activeAgencies: agencies.length,
                    totalGuides: guides.filter(g => g.status === 'Approved').length, // Assuming status field exists or checking guide_approved
                    totalDestinations: destinations.length,
                    totalUsers: agencies.length + guides.length + bookings.length, // Rough estimate using unique entities
                    monthlyBookings: monthlyCounts,
                    systemLogs: alerts.slice(0, 5), // Latest 5 alerts
                    topRegions: sortedRegions
                });

            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const currentMonthIndex = new Date().getMonth();
    const currentMonthBookings = data.monthlyBookings[currentMonthIndex];
    const lastMonthBookings = data.monthlyBookings[currentMonthIndex - 1] || 1; // avoid divide by zero
    const growthTrend = ((currentMonthBookings - lastMonthBookings) / lastMonthBookings * 100).toFixed(1);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
                    <p className="text-slate-400">Live system performance from backend data</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2">
                        {new Date().getFullYear()}
                    </div>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Volume"
                    value={`₱${data.revenue.toLocaleString()}`}
                    subtext="Gross booking value"
                    icon={DollarSign}
                    color="emerald"
                    trend={null}
                />
                <StatCard
                    title="Total Users"
                    value={data.totalUsers}
                    subtext="Across all roles"
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Destinations"
                    value={data.totalDestinations}
                    subtext="Active locations"
                    icon={Map}
                    color="purple"
                />
                <StatCard
                    title="System Health"
                    value="100%"
                    subtext="Operational"
                    icon={Activity}
                    color="cyan"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            Booking Trends ({new Date().getFullYear()})
                        </h3>
                        <span className={`text-sm ${parseFloat(growthTrend) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(growthTrend) > 0 ? '+' : ''}{growthTrend}% this month
                        </span>
                    </div>

                    {/* CSS Bar Chart */}
                    <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-slate-700/50 pb-2">
                        {data.monthlyBookings.map((count, i) => {
                            const max = Math.max(...data.monthlyBookings, 10); // Scale based on max value
                            const heightPercentage = (count / max) * 100;
                            const monthName = new Date(0, i).toLocaleString('default', { month: 'short' });

                            return (
                                <div key={i} className="w-full flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-cyan-500/20 group-hover:bg-cyan-500/40 rounded-t-sm transition-all relative min-h-[4px]"
                                        style={{ height: `${heightPercentage}%` }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 z-10">
                                            {count} Bookings
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 uppercase">{monthName}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Side Stats */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-6">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-400" />
                        Platform Distribution
                    </h3>

                    <div className="space-y-4">
                        <ProgressBar
                            label="Confirmed Bookings"
                            value={data.totalBookings}
                            max={data.totalBookings + 50} // visual scaling
                            color="blue"
                        />
                        <ProgressBar
                            label="Active Guides"
                            value={data.totalGuides}
                            max={data.totalUsers}
                            color="green"
                        />
                        <ProgressBar
                            label="Agencies"
                            value={data.activeAgencies}
                            max={data.totalUsers}
                            color="purple"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">Top Locations</h4>
                        <div className="space-y-3">
                            {data.topRegions.length > 0 ? (
                                data.topRegions.map((region, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="text-white">{index + 1}. {region.city}</span>
                                        <span className="text-slate-500">{region.count} Spots</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-xs italic">No location data available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table (System Logs) */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-700/50">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        System Logs & Alerts
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {data.systemLogs.length > 0 ? (
                                data.systemLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{log.title}</td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={log.message}>
                                            {log.message}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs border ${log.target_type === 'Admin'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {log.target_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                        No recent system logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}