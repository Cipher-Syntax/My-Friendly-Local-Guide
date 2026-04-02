import React, { useState, useEffect, useMemo } from 'react';
import { Map, Plus, Edit, Trash2, MapPin, Clock, Users, AlertTriangle, X, Image as ImageIcon, Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/api';
import AddAgencyTourModal from './AddAgencyTourModal';

export default function AgencyTourPackages() {
    const [tours, setTours] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [tourToEdit, setTourToEdit] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tourToDelete, setTourToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDestination, setSelectedDestination] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        fetchMyTours();
    }, []);

    const fetchMyTours = async () => {
        try {
            const response = await api.get('api/my-tours/');
            const rawData = Array.isArray(response.data) ? response.data : (response.data?.results || []);
            setTours(rawData);
            setErrorMsg('');
        } catch (error) {
            console.error("Failed to fetch tour packages:", error);
            setErrorMsg("Failed to load your tour packages.");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!tourToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`api/tours/${tourToDelete.id}/`);
            setTours(tours.filter(t => t.id !== tourToDelete.id));
            setDeleteModalOpen(false);
            setTourToDelete(null);
        } catch (error) {
            console.error("Failed to delete tour:", error);
            setErrorMsg("Failed to delete the tour package.");
            setDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTourAdded = (newTour) => setTours([newTour, ...tours]);
    const handleTourUpdated = (updatedTour) => setTours(tours.map(t => t.id === updatedTour.id ? updatedTour : t));

    const destinationOptions = useMemo(() => {
        const unique = new Set(
            tours
                .map((tour) => String(tour.destination_name || '').trim())
                .filter(Boolean)
        );
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [tours]);

    const processedTours = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const filtered = tours.filter((tour) => {
            const name = String(tour.name || '').toLowerCase();
            const destination = String(tour.destination_name || '').toLowerCase();
            const description = String(tour.description || '').toLowerCase();

            const matchesSearch = !q || name.includes(q) || destination.includes(q) || description.includes(q);
            const matchesDestination = selectedDestination === 'all' || String(tour.destination_name || '') === selectedDestination;

            return matchesSearch && matchesDestination;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''));
            if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
            if (sortBy === 'price-high') return Number(b.price_per_day || 0) - Number(a.price_per_day || 0);
            if (sortBy === 'price-low') return Number(a.price_per_day || 0) - Number(b.price_per_day || 0);
            if (sortBy === 'oldest') {
                return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            }
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        return filtered;
    }, [tours, searchTerm, selectedDestination, sortBy]);

    const totalPages = Math.max(1, Math.ceil(processedTours.length / itemsPerPage));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDestination, sortBy]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTours = processedTours.slice(startIndex, startIndex + itemsPerPage);
    const showingFrom = processedTours.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + itemsPerPage, processedTours.length);

    return (
        <div className="space-y-6 relative">
            {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                    {errorMsg}
                </div>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Map className="w-6 h-6 text-cyan-500" />
                        My Tour Packages
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Design and manage your agency's travel itineraries.</p>
                </div>

                <button
                    onClick={() => { setTourToEdit(null); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Add Tour Package
                </button>
            </div>

            {!isLoading && tours.length > 0 && (
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by package or destination..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={selectedDestination}
                                onChange={(e) => setSelectedDestination(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"
                            >
                                <option value="all">All Destinations</option>
                                {destinationOptions.map((destinationName) => (
                                    <option key={destinationName} value={destinationName}>{destinationName}</option>
                                ))}
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
                <div className="text-center py-10 text-slate-500">Loading packages...</div>
            ) : tours.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                    <Map className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Tour Packages Yet</h3>
                    <p className="text-slate-500 mt-1">Start by creating your first agency tour package.</p>
                </div>
            ) : processedTours.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                    <Map className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Matching Packages</h3>
                    <p className="text-slate-500 mt-1">Try adjusting your search, destination filter, or sorting.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedTours.map(tour => (
                        <div key={tour.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            {/* NEW: Destination Image Header */}
                            <div className="h-44 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                {tour.destination_image ? (
                                    <img src={tour.destination_image} alt={tour.destination_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <ImageIcon className="w-8 h-8 mb-1" />
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm border border-white/20">
                                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">₱{tour.price_per_day}</span>
                                    <span className="text-[10px] text-slate-500 ml-1">/day</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                    <p className="text-white text-xs font-bold flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {tour.destination_name}
                                    </p>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">{tour.name}</h3>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                                        <span>{tour.duration_days} Days</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Users className="w-3.5 h-3.5 text-cyan-500" />
                                        <span>Max {tour.max_group_size}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={() => { setTourToEdit(tour); setIsAddModalOpen(true); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        <Edit className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => { setTourToDelete(tour); setDeleteModalOpen(true); }}
                                        className="flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{showingFrom}</span> to <span className="font-semibold text-slate-900 dark:text-white">{showingTo}</span> of <span className="font-semibold text-slate-900 dark:text-white">{processedTours.length}</span> packages
                            </span>

                            <div className="flex items-center gap-2">
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

            <AddAgencyTourModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onTourAdded={handleTourAdded}
                onTourUpdated={handleTourUpdated}
                editData={tourToEdit}
            />

            {deleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Confirm Deletion
                            </h3>
                            <button onClick={() => setDeleteModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-slate-600 dark:text-slate-300">
                            Remove <strong className="text-slate-900 dark:text-white">"{tourToDelete?.name}"</strong>? This will delete the package and all its stops permanently.
                        </div>
                        <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="px-5 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} disabled={isDeleting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}