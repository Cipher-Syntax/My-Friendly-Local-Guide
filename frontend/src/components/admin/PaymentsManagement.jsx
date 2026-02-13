import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import {
    DollarSign,
    TrendingUp,
    CheckCircle,
    Clock,
    Search,
    Filter,
    Download,
    AlertCircle,
    XCircle
} from 'lucide-react';

export default function PaymentsManagement() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({
        totalRevenue: 0,
        platformFees: 0,
        pendingPayouts: 0,
        settledPayouts: 0
    });

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await api.get('/api/bookings/');
            // Filter only confirmed/completed bookings
            const relevantBookings = response.data.filter(b =>
                ['Confirmed', 'Completed'].includes(b.status)
            );

            setBookings(relevantBookings);
            calculateStats(relevantBookings);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            showToast("Failed to fetch bookings.", "error");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const platformFees = data.reduce((acc, curr) => acc + parseFloat(curr.platform_fee || 0), 0);
        const totalRevenue = data.reduce((acc, curr) => acc + parseFloat(curr.total_price || 0), 0);

        const pending = data
            .filter(b => !b.is_payout_settled)
            .reduce((acc, curr) => acc + parseFloat(curr.guide_payout_amount || 0), 0);

        const settled = data
            .filter(b => b.is_payout_settled)
            .reduce((acc, curr) => acc + parseFloat(curr.guide_payout_amount || 0), 0);

        setStats({
            totalRevenue,
            platformFees,
            pendingPayouts: pending,
            settledPayouts: settled
        });
    };

    const handleMarkSettled = async (bookingId) => {
        if (!window.confirm("Are you sure you have sent the money to the guide?")) return;

        try {
            await api.patch(`/api/bookings/${bookingId}/`, {
                is_payout_settled: true
            });
            fetchBookings();
            showToast("Payout marked as settled!", "success");
        } catch (error) {
            console.error("Failed to update payout:", error);
            showToast("Failed to update status.", "error");
        }
    };

    const filteredBookings = bookings.filter(booking => {
        if (filter === 'settled') return booking.is_payout_settled;
        if (filter === 'pending') return !booking.is_payout_settled;
        return true;
    });

    // --- HELPER TO GET NAMES SAFELY ---
    const getProviderName = (b) => {
        if (b.guide_detail) return `${b.guide_detail.first_name} ${b.guide_detail.last_name}`;
        if (b.agency_detail) return b.agency_detail.username;
        if (b.accommodation_detail) return b.accommodation_detail.host_full_name || b.accommodation_detail.host_username;
        return "Unknown Provider";
    };

    const getProviderType = (b) => {
        if (b.guide_detail) return 'Tour Guide';
        if (b.agency_detail) return 'Agency';
        if (b.accommodation_detail) return 'Host';
        return 'N/A';
    };

    const getProviderPhone = (b) => {
        if (b.guide_detail) return b.guide_detail.phone_number;
        if (b.agency_detail) return b.agency_detail.phone_number;
        if (b.accommodation_detail) return "Check Profile"; // Host phone might be elsewhere
        return "N/A";
    };

    const StatsCard = ({ title, value, icon: Icon, color, subValue }) => (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
                    {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-lg bg-${color}-500/10 text-${color}-400`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="text-white p-10">Loading financial data...</div>;

    return (
        <div className="space-y-6 relative">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-slate-800 border-green-500/50 text-green-400'
                    : 'bg-slate-800 border-red-500/50 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Payments & Payouts</h1>
                    <p className="text-slate-400 mt-1">Manage platform commissions and guide transfers</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Export Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Platform Earnings (2%)"
                    value={`₱${stats.platformFees.toLocaleString()}`}
                    subValue="Total accumulated fees"
                    icon={TrendingUp}
                    color="emerald"
                />
                <StatsCard
                    title="Pending Payouts"
                    value={`₱${stats.pendingPayouts.toLocaleString()}`}
                    subValue="Needs transfer to guides"
                    icon={Clock}
                    color="orange"
                />
                <StatsCard
                    title="Settled Payouts"
                    value={`₱${stats.settledPayouts.toLocaleString()}`}
                    subValue="Already transferred"
                    icon={CheckCircle}
                    color="blue"
                />
                <StatsCard
                    title="Total Booking Value"
                    value={`₱${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="purple"
                />
            </div>

            {/* Main Content */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">Payout Requests</h2>
                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">
                            {filteredBookings.length}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search guide..."
                                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 w-64"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending Transfer</option>
                            <option value="settled">Settled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4">Booking ID</th>
                                <th className="p-4">Provider / Guide</th>
                                <th className="p-4">Contact (GCash)</th>
                                <th className="p-4 text-right">Down Payment</th>
                                <th className="p-4 text-right">App Fee (2%)</th>
                                <th className="p-4 text-right">Net Payout</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="text-sm hover:bg-slate-700/20 transition-colors">
                                    <td className="p-4 text-white font-medium">#{booking.id}</td>

                                    {/* PROVIDER NAME COLUMN */}
                                    <td className="p-4">
                                        <div className="text-white font-medium">
                                            {getProviderName(booking)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {getProviderType(booking)}
                                        </div>
                                    </td>

                                    {/* CONTACT COLUMN */}
                                    <td className="p-4 text-slate-300">
                                        {getProviderPhone(booking)}
                                    </td>

                                    {/* FINANCIALS */}
                                    <td className="p-4 text-right text-slate-300">
                                        ₱{parseFloat(booking.down_payment || 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-emerald-400">
                                        +₱{parseFloat(booking.platform_fee || 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-bold text-white">
                                        ₱{parseFloat(booking.guide_payout_amount || 0).toLocaleString()}
                                    </td>

                                    {/* STATUS */}
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.is_payout_settled
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                            }`}>
                                            {booking.is_payout_settled ? 'Settled' : 'Pending'}
                                        </span>
                                    </td>

                                    {/* ACTION */}
                                    <td className="p-4 text-right">
                                        {!booking.is_payout_settled && (
                                            <button
                                                onClick={() => handleMarkSettled(booking.id)}
                                                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                Mark Settled
                                            </button>
                                        )}
                                        {booking.is_payout_settled && (
                                            <span className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                                <CheckCircle className="w-3 h-3" /> Paid
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredBookings.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            No bookings found matching your filter.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}