import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Search, Compass, MapPin, Star, User as UserIcon, Building, ShieldCheck, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/api';
import AddAgencyTourModal from './AddAgencyTourModal';

export default function AgencyExplore({ currentAgencyId, currentUserId }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [userTours, setUserTours] = useState([]);
    const [loadingTours, setLoadingTours] = useState(false);

    // Copy states
    const [copyWarningModal, setCopyWarningModal] = useState({ isOpen: false, package: null });
    const [isAddTourModalOpen, setIsAddTourModalOpen] = useState(false);
    const [packageToCopy, setPackageToCopy] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const [guidesRes, agenciesRes] = await Promise.all([
                    api.get('/api/guides/'),
                    api.get('/api/agencies/')
                ]);

                const guides = (guidesRes.data || []).map(g => ({
                    ...g,
                    role: 'Guide',
                    displayName: `${g.first_name || ''} ${g.last_name || ''}`.trim() || g.username,
                    linkedDestination: g.municipality || g.location || 'Local Guide'
                }));

                const agencies = (agenciesRes.data || []).map(a => ({
                    ...a,
                    role: 'Agency',
                    displayName: a.business_name || a.username || 'Agency',
                    linkedDestination: a.user?.municipality || a.user?.location || a.business_address || 'Travel Agency'
                }));

                let allUsers = [...guides, ...agencies];

                // Filter out self
                allUsers = allUsers.filter(u => {
                    if (u.role === 'Agency' && Number(u.id) === Number(currentAgencyId)) return false;
                    // If the current user's overall ID matches a guide ID
                    if (u.role === 'Guide' && Number(u.user_id || u.id) === Number(currentUserId)) return false;
                    return true;
                });

                // Only show active/approved
                allUsers = allUsers.filter(u => {
                    if (u.role === 'Guide') return u.is_active;
                    if (u.role === 'Agency') return u.status === 'Approved';
                    return true;
                });

                setUsers(allUsers);
            } catch (error) {
                console.error('Failed to fetch explore directory:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [currentAgencyId, currentUserId]);

    const handleViewProfile = async (user) => {
        setSelectedUser(user);
        setLoadingTours(true);
        try {
            if (user.role === 'Guide') {
                const res = await api.get(`/api/guides/${user.id}/tours/`);
                setUserTours(res.data || []);
            } else if (user.role === 'Agency') {
                // Fetch all destinations and filter by agency_user_id
                const destRes = await api.get('/api/destinations/');
                const destinations = destRes.data || [];
                
                const destTourCalls = destinations.map(dest => api.get(`/api/destinations/${dest.id}/tours/`));
                const results = await Promise.allSettled(destTourCalls);
                
                const mergedTours = [];
                results.forEach(res => {
                    if (res.status === 'fulfilled' && Array.isArray(res.value.data)) {
                        mergedTours.push(...res.value.data);
                    }
                });

                const agencyTours = mergedTours.filter(t => Number(t.agency_user_id) === Number(user.user_id || user.id));
                
                // Deduplicate
                const dedupedById = new Map();
                agencyTours.forEach(t => dedupedById.set(t.id, t));
                setUserTours(Array.from(dedupedById.values()));
            }
        } catch (error) {
            console.error('Failed to fetch user tours:', error);
            setUserTours([]);
        } finally {
            setLoadingTours(false);
        }
    };

    const initiateCopy = (pkg) => {
        setCopyWarningModal({ isOpen: true, package: pkg });
    };

    const confirmCopy = () => {
        const pkgToCopy = copyWarningModal.package;
        setCopyWarningModal({ isOpen: false, package: null });
        setPackageToCopy(pkgToCopy);
        setIsAddTourModalOpen(true);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  u.linkedDestination.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'All' || u.role === filterRole;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, filterRole]);

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const currentUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    // Reset to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole]);

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const base = api.defaults.baseURL || 'http://127.0.0.1:8000';
        return `${base}${path}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name or destination..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Guide', 'Agency'].map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                filterRole === role
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">User / Business</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Role</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {currentUsers.length > 0 ? (
                                currentUsers.map((user) => {
                                    const avatar = getImageUrl(user.profile_picture || user.logo);
                                    return (
                                        <tr key={`${user.role}-${user.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-600">
                                                        {avatar ? (
                                                            <img src={avatar} alt={user.displayName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            user.role === 'Guide' ? <UserIcon className="w-5 h-5 text-slate-400" /> : <Building className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{user.displayName}</div>
                                                        <div className="text-xs text-slate-500">{user.email || user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    user.role === 'Guide' 
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleViewProfile(user)}
                                                    className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-600 transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <Compass className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p>No profiles found matching your search.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/30">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{filteredUsers.length}</span> entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center px-4 font-semibold text-sm text-slate-700 dark:text-slate-300">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <Compass className="w-6 h-6 text-cyan-500" />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedUser.displayName}</h3>
                                    <p className="text-sm text-slate-500">{selectedUser.role} Profile - {selectedUser.linkedDestination}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="text-md font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Available Tour Packages</h4>
                            
                            {loadingTours ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                                </div>
                            ) : userTours.length === 0 ? (
                                <p className="text-slate-500 italic">This user currently has no tour packages available.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userTours.map(pkg => (
                                        <div key={pkg.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                                            <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">{pkg.name}</h5>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 flex-1">{pkg.description}</p>
                                            
                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">₱{pkg.price_per_day} / day</span>
                                                <button 
                                                    onClick={() => initiateCopy(pkg)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:hover:bg-cyan-800/50 text-cyan-700 dark:text-cyan-300 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Copy Package
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Modal */}
            {copyWarningModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in-95">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                            <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Copy Tour Package</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">
                            Please review properly what you want to copy and remove what you do not want to include.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setCopyWarningModal({ isOpen: false, package: null })}
                                className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmCopy}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg shadow-sm"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Agency Tour Modal (Used for Copying) */}
            <AddAgencyTourModal 
                isOpen={isAddTourModalOpen}
                onClose={() => {
                    setIsAddTourModalOpen(false);
                    setPackageToCopy(null);
                }}
                onTourAdded={(newTour) => {
                    console.log("Copied tour added successfully", newTour);
                }}
                onTourUpdated={() => {}}
                editData={packageToCopy}
                isCopying={true}
            />
        </div>
    );
}

// Inline Copy icon since it wasn't imported from lucide-react at the top
const Copy = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" className={className}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);