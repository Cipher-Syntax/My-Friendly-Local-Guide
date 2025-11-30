import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, Lock, Trash2 } from 'lucide-react';
import { getStatusColor } from '../../data/adminData';
import api from '../../api/api';

export default function UserManagement() {
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await api.get('api/review/');
                setReports(response.data);
            } catch (error) {
                console.error('Failed to fetch reports:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const [warningModal, setWarningModal] = useState({ isOpen: false, user: null });
    const [warningMessage, setWarningMessage] = useState('');

    const warnUser = async () => {
        if (!warningMessage.trim()) {
            alert('Warning message cannot be empty.');
            return;
        }
        try {
            await api.post('api/alerts/create/', {
                recipient: warningModal.user.id,
                title: 'Warning from Admin',
                message: warningMessage,
                target_type: warningModal.user.type,
            });
            setWarningModal({ isOpen: false, user: null });
            setWarningMessage('');
            alert('Warning sent successfully.');
        } catch (error) {
            console.error('Failed to send warning:', error);
            alert('Failed to send warning.');
        }
    };

    const openWarningModal = (user) => {
        setWarningModal({ isOpen: true, user: user });
    };

    const filteredUsers = useMemo(() =>
        reports.map((report, index) => ({

            uniqueKey: report.id || `${report.reported_user}-${index}`,
            id: report.reported_user,
            name: report.reported_username,
            email: 'N/A', 
            type: report.reported_user_type,
            warnings: 0, 
            status: report.reported_user_is_active ? 'active' : 'restricted',
            isActive: report.reported_user_is_active,
            reason: report.reason,
            reporter: report.reporter_username,
        })).filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [reports, searchTerm]
    );

    const restrictUser = async (userId, isActive) => {
        try {
            await api.patch(`api/admin/users/${userId}/`, {
                is_active: !isActive,
            });
            setReports(reports.map(report =>
                report.reported_user === userId
                    ? { ...report, reported_user_is_active: !isActive }
                    : report
            ));
            alert(`User ${isActive ? 'restricted' : 'unrestricted'} successfully.`);
        } catch (error) {
            console.error('Failed to restrict user:', error);
            alert('Failed to update user status.');
        }
    };

    const deleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await api.delete(`api/admin/users/${userId}/`);
                setReports(reports.filter(report => report.reported_user !== userId));
                alert('User deleted successfully.');
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert('Failed to delete user.');
            }
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
            </div>

            <div className="space-y-3">
                {filteredUsers.map(user => (
                    <div key={user.uniqueKey} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="text-white font-semibold">{user.name}</h3>
                                <p className="text-slate-400 text-sm">Reported by: {user.reporter}</p>
                                <p className="text-slate-400 text-sm">Reason: {user.reason}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                {user.status}
                            </span>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => openWarningModal(user)}
                                className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Warn
                            </button>
                            <button
                                onClick={() => restrictUser(user.id, user.isActive)}
                                className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                {user.status === 'restricted' ? 'Unrestrict' : 'Restrict'}
                            </button>
                            <button
                                onClick={() => deleteUser(user.id)}
                                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {warningModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">Send Warning</h3>
                        <textarea
                            value={warningMessage}
                            onChange={(e) => setWarningMessage(e.target.value)}
                            placeholder="Enter warning message..."
                            className="w-full h-32 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setWarningModal({ isOpen: false, user: null })} className="px-4 py-2 text-slate-300">Cancel</button>
                            <button onClick={warnUser} className="px-4 py-2 bg-yellow-500 text-black rounded-lg">Send Warning</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}