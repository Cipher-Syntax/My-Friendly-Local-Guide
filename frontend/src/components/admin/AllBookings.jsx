import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, AlertTriangle, Trash2, XCircle, CheckCircle, Eye, AlertCircle, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx'; // IMPORT XLSX FOR EXPORT
import api from '../../api/api';

export default function AllBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Modal State
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        confirmText: 'Confirm',
        onConfirm: () => { }
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };



    const fetchBookings = useCallback(async () => {
        try {
            const aggregate = [];
            let nextUrl = '/api/bookings/';
            let safetyCounter = 0;

            while (nextUrl && safetyCounter < 100) {
                const res = await api.get(nextUrl);
                const payload = res.data;

                if (Array.isArray(payload)) {
                    aggregate.push(...payload);
                    nextUrl = null;
                    break;
                }

                const results = Array.isArray(payload?.results) ? payload.results : [];
                aggregate.push(...results);

                if (payload?.next && typeof payload.next === 'string') {
                    const base = api.defaults.baseURL || '';
                    nextUrl = base && payload.next.startsWith(base)
                        ? payload.next.slice(base.length)
                        : payload.next;
                } else {
                    nextUrl = null;
                }

                safetyCounter += 1;
            }

            setBookings(aggregate);
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
            showToast("Failed to fetch bookings.", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const getTouristDisplayName = (booking) => {
        const firstName = String(booking?.tourist_detail?.first_name || '').trim();
        const lastName = String(booking?.tourist_detail?.last_name || '').trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

        if (fullName) return fullName;

        const username = String(booking?.tourist_username || booking?.tourist_detail?.username || '').trim();
        return username || 'Unknown';
    };

    const executeForceUpdate = async (id, newStatus) => {
        try {
            await api.patch(`/api/bookings/${id}/status/`, { status: newStatus });
            fetchBookings();
            showToast(`Booking ${id} status forced to ${newStatus}.`, "success");
            closeModal();
        } catch (error) {
            showToast("Failed to force update. Check console.", "error");
            console.error(error);
        }
    };

    const executeDelete = async (id) => {
        try {
            await api.delete(`/api/bookings/${id}/`);
            setBookings(prev => prev.filter(b => b.id !== id));
            showToast("Booking deleted permanently.", "success");
            closeModal();
        } catch (error) {
            showToast("Failed to delete booking.", "error");
            console.error(error);
        }
    };

    const promptForceUpdate = (id, newStatus) => {
        setModal({
            isOpen: true,
            title: 'Force Status Update',
            message: `ADMIN OVERRIDE: Are you sure you want to force booking #${id} to '${newStatus}'?`,
            type: 'warning',
            confirmText: 'Update Status',
            onConfirm: () => executeForceUpdate(id, newStatus)
        });
    };

    const promptDelete = (id) => {
        setModal({
            isOpen: true,
            title: 'Permanently Delete Record',
            message: `DANGER: This will permanently DELETE booking #${id} from the database. This cannot be undone. Are you sure?`,
            type: 'danger',
            confirmText: 'Delete Permanently',
            onConfirm: () => executeDelete(id)
        });
    };

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
    };

    const filteredBookings = bookings.filter(b => {
        const touristName = getTouristDisplayName(b).toLowerCase();
        const touristUsername = String(b.tourist_username || '').toLowerCase();
        const matchesSearch =
            touristName.includes(searchTerm.toLowerCase()) ||
            touristUsername.includes(searchTerm.toLowerCase()) ||
            b.id.toString().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

    // --- EXPORT TO EXCEL FUNCTIONALITY ---
    const handleExport = () => {
        if (filteredBookings.length === 0) {
            showToast("No data to export.", "error");
            return;
        }

        const exportData = filteredBookings.map(b => ({
            "Booking ID": b.id,
            "Tourist Name": getTouristDisplayName(b),
            "Tour Guide": b.guide ? b.guide_detail?.username || 'Unknown' :
                b.agency ? `Agency: ${b.agency_detail?.username || 'Unknown'}` : 'N/A',
            "Check-In Date": b.check_in,
            "Check-Out Date": b.check_out,
            "Total Amount": parseFloat(b.total_price || 0),
            "Down Payment": parseFloat(b.down_payment || 0),
            "Status": b.status,
            "Date Created": new Date(b.created_at).toLocaleDateString()
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto-size columns slightly
        const colWidths = [
            { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "All Bookings");

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `global-bookings-${dateStr}.xlsx`);
    };

    if (loading) return <div className="p-8 text-slate-900 dark:text-white">Loading Admin Data...</div>;

    return (
        <div className="p-6 space-y-6 relative">
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-900 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {modal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full ${modal.type === 'danger' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500'}`}>
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{modal.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{modal.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700/50">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modal.onConfirm}
                                className={`px-4 py-2 text-white rounded-lg font-medium transition-all shadow-lg ${modal.type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                                    }`}
                            >
                                {modal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Global Booking Registry</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Superuser Access • View & Override All Bookings</p>
                    </div>
                </div>

                {/* Updated Header Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <Download className="w-4 h-4" />
                        Export Bookings
                    </button>
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 px-4 py-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="text-red-600 dark:text-red-400 text-xs font-bold">ADMIN MODE ACTIVE</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Booking ID or Tourist Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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

            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Tourist</th>
                            <th className="px-6 py-4">Tour Guide</th>
                            <th className="px-6 py-4">Dates</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Admin Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        {paginatedBookings.map(booking => (
                            <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">#{booking.id}</td>
                                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{getTouristDisplayName(booking)}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {booking.guide ? booking.guide_detail?.username || 'Unknown' :
                                        booking.agency ? `Agency: ${booking.agency_detail?.username || 'Unknown'}` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                    {booking.check_in} <span className="text-slate-400 dark:text-slate-500">to</span> {booking.check_out}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${booking.status === 'Confirmed' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/50' :
                                        booking.status === 'Cancelled' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/50' :
                                            'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/50'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {booking.status !== 'Cancelled' && (
                                        <button
                                            onClick={() => promptForceUpdate(booking.id, 'Cancelled')}
                                            title="Force Cancel (Admin Override)"
                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-orange-500 dark:hover:bg-orange-600 text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    {booking.status !== 'Confirmed' && booking.status !== 'Completed' && (
                                        <button
                                            onClick={() => promptForceUpdate(booking.id, 'Confirmed')}
                                            title="Force Confirm (Bypass Payment)"
                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-green-500 dark:hover:bg-green-600 text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white rounded-lg transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => promptDelete(booking.id)}
                                        title="PERMANENTLY DELETE RECORD"
                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-red-500 dark:hover:bg-red-600 text-slate-600 dark:text-slate-300 hover:text-white dark:hover:text-white rounded-lg transition-colors group"
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

                {filteredBookings.length > 0 && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredBookings.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredBookings.length}</span> results
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}