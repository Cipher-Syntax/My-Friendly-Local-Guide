import React, { useState, useEffect } from 'react';
import { Loader2, Archive, Calendar as CalendarIcon, Clock, AlertTriangle } from 'lucide-react';
import api from '../../api/api';

export default function ArchivedAccounts() {
    const [archivedUsers, setArchivedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchArchivedAccounts = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/admin/archived-accounts/');
            setArchivedUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch archived accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchivedAccounts();
    }, []);

    const calculateDaysLeft = (deletionDateStr) => {
        const deletionDate = new Date(deletionDateStr);
        const now = new Date();
        const diffTime = deletionDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div className="space-y-4 relative p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Archive className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Archived Accounts</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Accounts inactive for over 30 days. They will be permanently deleted after the countdown ends.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
                    {archivedUsers.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-800/30">
                            <Archive className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-400" />
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No archived accounts.</p>
                            <p className="text-sm mt-2 text-slate-500">Accounts appear here 30 days after deactivation.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Deactivated On</th>
                                        <th className="px-6 py-4 text-right">Time Until Deletion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                    {archivedUsers.map((user) => {
                                        const daysLeft = calculateDaysLeft(user.scheduled_deletion_date);
                                        const isCritical = daysLeft <= 7;

                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                    {user.username}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold uppercase">
                                                        {user.is_local_guide ? "Tour Guide" : "Tourist"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <CalendarIcon className="w-4 h-4" />
                                                        {new Date(user.deactivated_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <div className={`inline-flex items-center justify-end gap-2 px-3 py-1.5 rounded-lg border font-bold ${isCritical
                                                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
                                                            : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30'
                                                        }`}>
                                                        {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                        {daysLeft} Days Left
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}