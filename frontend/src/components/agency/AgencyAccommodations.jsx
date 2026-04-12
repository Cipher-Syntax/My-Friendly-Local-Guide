import React, { useState, useEffect, useMemo } from 'react';
import { Home, Plus, Edit, Trash2, MapPin, Bed, Car, AlertTriangle, X, Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/api';
import AddAgencyAccommodationModal from './AddAgencyAccommodationModal';

export default function AgencyAccommodations() {
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [accToEdit, setAccToEdit] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Custom Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [accToDelete, setAccToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [transportFilter, setTransportFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    useEffect(() => {
        const fetchAccommodations = async () => {
            try {
                const response = await api.get('api/accommodations/');
                const rawData = Array.isArray(response.data) ? response.data : (response.data?.results || []);
                setAccommodations(rawData);
                setErrorMsg('');
            } catch (error) {
                console.error("Failed to fetch accommodations:", error);
                setErrorMsg("Failed to load your accommodations.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccommodations();
    }, []);



    const confirmDelete = async () => {
        if (!accToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`api/accommodations/${accToDelete.id}/`);
            setAccommodations(accommodations.filter(a => a.id !== accToDelete.id));
            setDeleteModalOpen(false);
            setAccToDelete(null);
        } catch (error) {
            console.error("Failed to delete accommodation:", error);
            setErrorMsg("Failed to delete the accommodation. Please try again.");
            setTimeout(() => setErrorMsg(''), 4000);
            setDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAccommodationAdded = (newAcc) => {
        setAccommodations([newAcc, ...accommodations]);
    };

    const handleAccommodationUpdated = (updatedAcc) => {
        setAccommodations(accommodations.map(a => a.id === updatedAcc.id ? updatedAcc : a));
    };

    const typeOptions = useMemo(() => {
        const unique = new Set(
            accommodations
                .map((acc) => String(acc.accommodation_type || acc.room_type || '').trim())
                .filter(Boolean)
        );
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [accommodations]);

    const processedAccommodations = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const filtered = accommodations.filter((acc) => {
            const title = String(acc.title || '').toLowerCase();
            const location = String(acc.location || '').toLowerCase();
            const description = String(acc.description || '').toLowerCase();
            const accommodationType = String(acc.accommodation_type || acc.room_type || '');

            const matchesSearch = !q || title.includes(q) || location.includes(q) || description.includes(q);
            const matchesType = typeFilter === 'all' || accommodationType === typeFilter;
            const matchesTransport =
                transportFilter === 'all' ||
                (transportFilter === 'with-transport' ? !!acc.offer_transportation : !acc.offer_transportation);

            return matchesSearch && matchesType && matchesTransport;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'name-asc') return String(a.title || '').localeCompare(String(b.title || ''));
            if (sortBy === 'name-desc') return String(b.title || '').localeCompare(String(a.title || ''));
            if (sortBy === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
            if (sortBy === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
            if (sortBy === 'oldest') {
                return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            }
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        return filtered;
    }, [accommodations, searchTerm, typeFilter, transportFilter, sortBy]);

    const totalPages = Math.max(1, Math.ceil(processedAccommodations.length / itemsPerPage));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, transportFilter, sortBy]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAccommodations = processedAccommodations.slice(startIndex, startIndex + itemsPerPage);
    const showingFrom = processedAccommodations.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + itemsPerPage, processedAccommodations.length);

    return (
        <div className="space-y-6 relative">
            {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium animate-in fade-in">
                    {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Home className="w-6 h-6 text-blue-500" />
                        My Accommodations
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage the rooms and properties your agency owns.</p>
                </div>

                <button
                    onClick={() => { setAccToEdit(null); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Add Accommodation
                </button>
            </div>

            {!isLoading && accommodations.length > 0 && (
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title or location..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"
                            >
                                <option value="all">All Types</option>
                                {typeOptions.map((typeName) => (
                                    <option key={typeName} value={typeName}>{typeName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={transportFilter}
                                onChange={(e) => setTransportFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"
                            >
                                <option value="all">All Transport Options</option>
                                <option value="with-transport">With Transport</option>
                                <option value="without-transport">Without Transport</option>
                            </select>
                        </div>

                        <div className="relative">
                            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"
                            >
                                <option value="newest">Sort: Newest</option>
                                <option value="oldest">Sort: Oldest</option>
                                <option value="name-asc">Sort: Name A-Z</option>
                                <option value="name-desc">Sort: Name Z-A</option>
                                <option value="price-high">Sort: Price High-Low</option>
                                <option value="price-low">Sort: Price Low-High</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-10 text-slate-500">Loading your properties...</div>
            ) : accommodations.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                    <Home className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Accommodations Yet</h3>
                    <p className="text-slate-500 mt-1">Click the button above to list your first property or room.</p>
                </div>
            ) : processedAccommodations.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                    <Home className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Matching Accommodations</h3>
                    <p className="text-slate-500 mt-1">Try adjusting your search, type filter, or transport options.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedAccommodations.map(acc => (
                        <div key={acc.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-48 bg-slate-200 dark:bg-slate-700 relative">
                                {acc.photo ? (
                                    <img src={acc.photo} alt={acc.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                                )}
                                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                                    <span className="font-bold text-slate-900 dark:text-white">₱{acc.price}</span>
                                    <span className="text-xs text-slate-500">/night</span>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">{acc.title}</h3>

                                <div className="space-y-2 mb-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 line-clamp-1">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {acc.location}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <Bed className="w-4 h-4 text-slate-400 shrink-0" /> {acc.room_type || 'Standard Room'}
                                    </p>
                                    {acc.offer_transportation && (
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                                            <Car className="w-4 h-4" /> Transport Included
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={() => { setAccToEdit(acc); setIsAddModalOpen(true); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Edit className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => { setAccToDelete(acc); setDeleteModalOpen(true); }}
                                        className="flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>

                    {processedAccommodations.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{showingFrom}</span> to <span className="font-semibold text-slate-900 dark:text-white">{showingTo}</span> of <span className="font-semibold text-slate-900 dark:text-white">{processedAccommodations.length}</span> accommodations
                            </span>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Per page</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value={6}>6</option>
                                        <option value={12}>12</option>
                                        <option value={18}>18</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${currentPage === 1 ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${currentPage === page ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${currentPage === totalPages ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AddAgencyAccommodationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAccommodationAdded={handleAccommodationAdded}
                onAccommodationUpdated={handleAccommodationUpdated}
                editData={accToEdit}
            />

            {/* Custom Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Confirm Deletion
                            </h3>
                            <button onClick={() => setDeleteModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-slate-600 dark:text-slate-300">
                            Are you absolutely sure you want to delete <strong className="text-slate-900 dark:text-white">"{accToDelete?.title}"</strong>? This action cannot be undone and will remove the property from the app.
                        </div>
                        <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="px-5 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} disabled={isDeleting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}