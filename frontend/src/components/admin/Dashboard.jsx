import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import {
    Users, Activity, Map, Briefcase,
    UserCheck, AlertTriangle, Loader2, DollarSign, Calendar, ArrowRight
} from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
                {subtext && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 dark:text-${color}-400 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
        <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-colors pointer-events-none`}></div>
    </div>
);

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/api/dashboard-summary/');
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="p-8 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl shadow-lg">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="font-semibold text-lg">Failed to load dashboard data.</p>
            <p className="text-sm mt-1">Please ensure the backend is running and the endpoint is accessible.</p>
        </div>
    );

    const { users, content, bookings, finance, system } = data;

    const getStatusColor = (status) => {
        const colors = {
            'Pending_Payment': 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
            'Confirmed': 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20',
            'Completed': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
            'Cancelled': 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
            'Accepted': 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
            'Declined': 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
        };
        return colors[status] || 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Overview</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Live platform analytics and pending actions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={users.total_users.toLocaleString()} subtext="Tourists, Guides & Agencies" icon={Users} color="blue" />
                <StatCard title="Destinations" value={content.destinations.toLocaleString()} subtext="Active locations available" icon={Map} color="purple" />
                <StatCard title="Platform Revenue" value={`₱${finance.platform_revenue.toLocaleString()}`} subtext="Earned from app fees" icon={DollarSign} color="emerald" />
                <StatCard title="System Health" value={`${system.health}%`} subtext="Operational status" icon={Activity} color="cyan" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                            Recent Bookings
                        </h3>
                        <Link to="/admin/bookings" className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-medium">ID</th>
                                    <th className="px-6 py-4 font-medium">Tourist</th>
                                    <th className="px-6 py-4 font-medium">Amount</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {bookings.recent.length > 0 ? (
                                    bookings.recent.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">#{booking.id}</td>
                                            <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{booking.tourist__username}</td>
                                            <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">₱{parseFloat(booking.total_price || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                                {new Date(booking.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                                            <Calendar className="w-8 h-8 opacity-20" />
                                            <span>No bookings have been made yet.</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">

                    <div className={`border rounded-xl p-6 shadow-lg transition-colors ${users.total_pending > 0 ? 'bg-orange-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20' : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'}`}>
                        <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2 mb-4">
                            <AlertTriangle className={`w-5 h-5 ${users.total_pending > 0 ? 'text-orange-500 dark:text-orange-400 animate-pulse' : 'text-slate-400'}`} />
                            Needs Attention
                        </h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                                        <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-slate-900 dark:text-white text-sm font-medium">Guides</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{users.pending_guides} pending</p>
                                    </div>
                                </div>
                                <Link to="/admin/guides" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-600 shadow-sm">
                                    Review
                                </Link>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
                                        <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-slate-900 dark:text-white text-sm font-medium">Agencies</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{users.pending_agencies} pending</p>
                                    </div>
                                </div>
                                <Link to="/admin/agency" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-600 shadow-sm">
                                    Review
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg">
                        <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2 mb-6">
                            <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            Platform Demographics
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between mb-2 text-sm">
                                    <span className="text-slate-600 dark:text-slate-400 font-medium">Tourists</span>
                                    <span className="text-slate-900 dark:text-white font-bold">{users.tourists}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-900/80 rounded-full h-2.5 shadow-inner">
                                    <div className="bg-blue-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(users.tourists / users.total_users) * 100 || 0}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2 text-sm">
                                    <span className="text-slate-600 dark:text-slate-400 font-medium">Tour Guides</span>
                                    <span className="text-slate-900 dark:text-white font-bold">{users.guides}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-900/80 rounded-full h-2.5 shadow-inner">
                                    <div className="bg-emerald-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(users.guides / users.total_users) * 100 || 0}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2 text-sm">
                                    <span className="text-slate-600 dark:text-slate-400 font-medium">Agencies</span>
                                    <span className="text-slate-900 dark:text-white font-bold">{users.agencies}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-900/80 rounded-full h-2.5 shadow-inner">
                                    <div className="bg-purple-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${(users.agencies / users.total_users) * 100 || 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}