import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Trash2, XCircle, CheckCircle, Eye } from 'lucide-react';
import api from '../../api/api';

export default function AllBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            // As a superuser, this endpoint now returns ALL bookings sorted by date
            const res = await api.get('/api/bookings/');
            setBookings(res.data);
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- ADMIN ONLY ACTIONS ---
    const forceUpdateStatus = async (id, newStatus) => {
        if (!window.confirm(`ADMIN OVERRIDE: Are you sure you want to force this booking to '${newStatus}'?`)) return;

        try {
            await api.patch(`/api/bookings/${id}/status/`, { status: newStatus });
            fetchBookings(); // Refresh list
            alert(`Booking ${id} status forced to ${newStatus}.`);
        } catch (error) {
            alert("Failed to force update. Check console.");
            console.error(error);
        }
    };

    const adminDeleteBooking = async (id) => {
        if (!window.confirm("DANGER: This will permanently DELETE this booking record from the database. This cannot be undone. Are you sure?")) return;

        try {
            await api.delete(`/api/bookings/${id}/`);
            setBookings(prev => prev.filter(b => b.id !== id));
            alert("Booking deleted permanently.");
        } catch (error) {
            alert("Failed to delete.");
            console.error(error);
        }
    };

    // Filtering logic
    const filteredBookings = bookings.filter(b => {
        const matchesSearch =
            b.tourist_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.id.toString().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div className="p-8 text-white">Loading Admin Data...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Global Booking Registry</h1>
                    <p className="text-slate-400 text-sm">Superuser Access • View & Override All Bookings</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/50 px-4 py-2 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400 text-xs font-bold">ADMIN MODE ACTIVE</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Booking ID or Tourist Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 text-white focus:outline-none focus:border-cyan-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="Pending_Payment">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Declined">Declined</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-slate-400 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Tourist</th>
                            <th className="px-6 py-4">Target</th>
                            <th className="px-6 py-4">Dates</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Admin Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredBookings.map(booking => (
                            <tr key={booking.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 text-slate-300 font-mono">#{booking.id}</td>
                                <td className="px-6 py-4 text-white font-medium">{booking.tourist_username}</td>
                                <td className="px-6 py-4 text-slate-300">
                                    {booking.accommodation ? `Accom: ${booking.accommodation_detail?.title || 'Unknown'}` :
                                        booking.guide ? `Guide: ${booking.guide_detail?.username || 'Unknown'}` :
                                            booking.agency ? `Agency: ${booking.agency_detail?.username || 'Unknown'}` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-slate-300 text-sm">
                                    {booking.check_in} <span className="text-slate-500">to</span> {booking.check_out}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${booking.status === 'Confirmed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                            booking.status === 'Cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                                'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {/* Override Status Button */}
                                    {booking.status !== 'Cancelled' && (
                                        <button
                                            onClick={() => forceUpdateStatus(booking.id, 'Cancelled')}
                                            title="Force Cancel (Admin Override)"
                                            className="p-2 bg-slate-700 hover:bg-orange-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* Force Confirm Button (if stuck) */}
                                    {booking.status !== 'Confirmed' && booking.status !== 'Completed' && (
                                        <button
                                            onClick={() => forceUpdateStatus(booking.id, 'Confirmed')}
                                            title="Force Confirm (Bypass Payment)"
                                            className="p-2 bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* The Nuclear Option: DELETE */}
                                    <button
                                        onClick={() => adminDeleteBooking(booking.id)}
                                        title="PERMANENTLY DELETE RECORD"
                                        className="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors group"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover:animate-pulse" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredBookings.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No bookings found.</div>
                )}
            </div>
        </div>
    );
}