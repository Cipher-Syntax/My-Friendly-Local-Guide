import React, { useState, useMemo, useEffect } from 'react';
import { Search, Image as ImageIcon, Eye, Trash2, AlertTriangle, MapPin, Star, XCircle, Plus, Filter, Landmark, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api/api';

const CATEGORY_CHOICES = ['Cultural', 'Historical', 'Adventure', 'Nature'];

export default function ContentManagement() {
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [editingSpot, setEditingSpot] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [isAttractionModalOpen, setIsAttractionModalOpen] = useState(false);
    const [targetDestId, setTargetDestId] = useState(null);
    const [newAttraction, setNewAttraction] = useState({
        name: '', description: '', photo: null
    });

    const [newSpot, setNewSpot] = useState({
        name: '', description: '', category: 'Cultural', location: '', rating: 0, is_featured: false
    });

    const [isViewImagesModalOpen, setIsViewImagesModalOpen] = useState(false);
    const [viewingSpotImages, setViewingSpotImages] = useState(null);
    const [viewingSpotName, setViewingSpotName] = useState('');

    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, itemId: null, itemName: '' });

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const fetchDestinations = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/destinations/');

            const mappedData = response.data.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                category: item.category,
                location: item.location,
                rating: item.average_rating,
                featured: item.is_featured,

                imageList: item.images ? item.images.map(img => img.image) : [],
                imagesCount: item.images ? item.images.length : 0,

                attractions: item.attractions || [],
                attractionsCount: item.attractions ? item.attractions.length : 0
            }));

            setDestinations(mappedData);
        } catch (error) {
            console.error("Failed to fetch destinations:", error);
            showToast("Failed to fetch destinations.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDestinations();
    }, []);


    const handleCreate = async () => {
        try {
            const payload = {
                name: newSpot.name,
                description: newSpot.description,
                category: newSpot.category,
                location: newSpot.location,
                average_rating: newSpot.rating,
                is_featured: newSpot.is_featured
            };

            const response = await api.post('api/destinations/', payload);

            const createdItem = {
                id: response.data.id,
                ...payload,
                imageList: [],
                imagesCount: 0,
                attractions: [],
                attractionsCount: 0
            };

            setDestinations([createdItem, ...destinations]);
            setIsCreateModalOpen(false);
            setNewSpot({ name: '', description: '', category: 'Cultural', location: '', rating: 0, is_featured: false });
            showToast("Destination created successfully!", "success");
        } catch (error) {
            console.error("Failed to create:", error);
            showToast("Failed to create destination.", "error");
        }
    };

    const handleCreateAttraction = async () => {
        if (!targetDestId || !newAttraction.name || !newAttraction.photo) {
            showToast("Please provide a name and an image.", "error");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('destination', targetDestId);
            formData.append('name', newAttraction.name);
            formData.append('description', newAttraction.description);
            formData.append('photo', newAttraction.photo);

            const response = await api.post('api/attractions/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const createdAttraction = response.data;

            showToast("Attraction added successfully!", "success");

            setDestinations(prev => prev.map(s => {
                if (s.id === targetDestId) {
                    return {
                        ...s,
                        attractions: [...s.attractions, createdAttraction],
                        attractionsCount: s.attractionsCount + 1
                    };
                }
                return s;
            }));

            setIsAttractionModalOpen(false);
            setNewAttraction({ name: '', description: '', photo: null });
        } catch (error) {
            console.error("Failed to add attraction:", error);
            showToast("Failed to add attraction.", "error");
        }
    };

    const openAddAttractionModal = (destinationId) => {
        setTargetDestId(destinationId);
        setIsAttractionModalOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingSpot) return;
        try {
            const payload = {
                name: editingSpot.name,
                description: editingSpot.description,
                category: editingSpot.category,
                location: editingSpot.location,
                average_rating: editingSpot.rating,
                is_featured: editingSpot.featured
            };
            await api.patch(`api/destinations/${editingSpot.id}/`, payload);
            setDestinations(prev => prev.map(s => s.id === editingSpot.id ? { ...s, ...editingSpot } : s));
            setIsEditModalOpen(false);
            setEditingSpot(null);
            showToast("Destination updated successfully!", "success");
        } catch (error) {
            console.error("Failed to save changes:", error);
            showToast("Failed to update destination.", "error");
        }
    };

    const handleDeleteAttraction = async (attractionId) => {
        if (!window.confirm("Are you sure you want to delete this attraction?")) return;

        try {
            await api.delete(`api/attractions/${attractionId}/`);

            const updatedAttractions = editingSpot.attractions.filter(a => a.id !== attractionId);

            setEditingSpot(prev => ({
                ...prev,
                attractions: updatedAttractions
            }));

            setDestinations(prev => prev.map(s =>
                s.id === editingSpot.id
                    ? { ...s, attractions: updatedAttractions, attractionsCount: updatedAttractions.length }
                    : s
            ));
            showToast("Attraction deleted successfully.", "success");

        } catch (error) {
            console.error("Failed to delete attraction:", error);
            showToast("Failed to delete attraction.", "error");
        }
    };

    const confirmDelete = async () => {
        if (deleteConfirmation.itemId) {
            try {
                await api.delete(`api/destinations/${deleteConfirmation.itemId}/`);
                setDestinations(prev => prev.filter(s => s.id !== deleteConfirmation.itemId));
                showToast("Destination deleted successfully.", "success");
            } catch (error) {
                console.error("Failed to delete:", error);
                showToast("Failed to delete destination.", "error");
            }
        }
        setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
    };

    const toggleFeatured = async (spot) => {
        try {
            const newFeaturedStatus = !spot.featured;
            setDestinations(prev => prev.map(s => s.id === spot.id ? { ...s, featured: newFeaturedStatus } : s));
            await api.patch(`api/destinations/${spot.id}/`, { is_featured: newFeaturedStatus });
        } catch (error) {
            console.error("Failed to toggle feature:", error);
            setDestinations(prev => prev.map(s => s.id === spot.id ? { ...s, featured: !spot.featured } : s));
            showToast("Failed to update status.", "error");
        }
    };

    const viewSpotImages = (spot) => {
        setViewingSpotImages(spot.imageList);
        setViewingSpotName(spot.name);
        setIsViewImagesModalOpen(true);
    };

    const filteredDestinations = useMemo(() => {
        return destinations.filter(spot => {
            const matchesSearch = spot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                spot.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || spot.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [destinations, searchTerm, selectedCategory]);

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

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="flex gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                    <div className="relative min-w-[150px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Filter className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white appearance-none focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                        >
                            <option value="All">All Types</option>
                            {CATEGORY_CHOICES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full md:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Destination
                </button>
            </div>

            <div className="space-y-4">
                {filteredDestinations.map(spot => (
                    <div key={spot.id} className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 transition-all ${spot.featured ? 'border-amber-500/30 bg-slate-800/80 shadow-lg shadow-amber-900/10' : 'border-slate-700/50'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-white font-bold text-xl">{spot.name}</h3>
                                    <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/20 uppercase tracking-wide">
                                        {spot.category}
                                    </span>
                                    {spot.featured && (
                                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20 flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" /> Featured
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                    {spot.location}
                                </div>
                                <p className="text-slate-300 text-sm mt-2 line-clamp-2 leading-relaxed">{spot.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="text-white font-bold">{spot.rating}</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {spot.attractionsCount} Attraction{spot.attractionsCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                            <button
                                onClick={() => openAddAttractionModal(spot.id)}
                                className="flex-1 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Landmark className="w-4 h-4" />
                                Add Attraction
                            </button>

                            <button
                                onClick={() => viewSpotImages(spot)}
                                className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Gallery
                            </button>

                            <button
                                onClick={() => toggleFeatured(spot)}
                                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border ${spot.featured
                                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                        : 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 border-transparent'
                                    }`}
                            >
                                <Star className={`w-4 h-4 ${spot.featured ? 'fill-current' : ''}`} />
                                {spot.featured ? 'Unfeature' : 'Feature'}
                            </button>

                            <button
                                onClick={() => {
                                    setEditingSpot({ ...spot });
                                    setIsEditModalOpen(true);
                                }}
                                className="flex-1 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Eye className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: true, itemId: spot.id, itemName: spot.name })}
                                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-white">Add New Destination</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Name</label>
                                <input type="text" value={newSpot.name} onChange={(e) => setNewSpot({ ...newSpot, name: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Category</label>
                                    <select value={newSpot.category} onChange={(e) => setNewSpot({ ...newSpot, category: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white">
                                        {CATEGORY_CHOICES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Location</label>
                                    <input type="text" value={newSpot.location} onChange={(e) => setNewSpot({ ...newSpot, location: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Description</label>
                                <textarea rows="4" value={newSpot.description} onChange={(e) => setNewSpot({ ...newSpot, description: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-900/30 rounded-lg border border-slate-700/30">
                                <input type="checkbox" checked={newSpot.is_featured} onChange={(e) => setNewSpot({ ...newSpot, is_featured: e.target.checked })} className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-offset-slate-900" />
                                <label className="text-white font-medium">Feature this destination?</label>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreate} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">Create Destination</button>
                        </div>
                    </div>
                </div>
            )}

            {isAttractionModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-white">Add Attraction</h3>
                            <button onClick={() => setIsAttractionModalOpen(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Attraction Name</label>
                                <input
                                    type="text"
                                    value={newAttraction.name}
                                    onChange={(e) => setNewAttraction({ ...newAttraction, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Description</label>
                                <textarea
                                    rows="3"
                                    value={newAttraction.description}
                                    onChange={(e) => setNewAttraction({ ...newAttraction, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Main Photo</label>
                                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewAttraction({ ...newAttraction, photo: e.target.files[0] })}
                                        className="hidden"
                                        id="attraction-photo-upload"
                                    />
                                    <label htmlFor="attraction-photo-upload" className="cursor-pointer flex flex-col items-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-300">
                                            {newAttraction.photo ? newAttraction.photo.name : "Click to upload image"}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setIsAttractionModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreateAttraction} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg">Add Attraction</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingSpot && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-white">Edit Destination</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Name</label>
                                <input type="text" value={editingSpot.name} onChange={(e) => setEditingSpot({ ...editingSpot, name: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Category</label>
                                    <select value={editingSpot.category} onChange={(e) => setEditingSpot({ ...editingSpot, category: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white">
                                        {CATEGORY_CHOICES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Location</label>
                                    <input type="text" value={editingSpot.location} onChange={(e) => setEditingSpot({ ...editingSpot, location: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Description</label>
                                <textarea rows="4" value={editingSpot.description} onChange={(e) => setEditingSpot({ ...editingSpot, description: e.target.value })} className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white" />
                            </div>

                            <div className="mt-6 border-t border-slate-700/50 pt-4">
                                <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                                    <Landmark className="w-4 h-4 text-purple-400" />
                                    Existing Attractions
                                </h4>
                                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                                    {editingSpot.attractions && editingSpot.attractions.length > 0 ? (
                                        editingSpot.attractions.map(attr => (
                                            <div key={attr.id} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {attr.image ? (
                                                        // Handle mixed content URL
                                                        <img
                                                            src={attr.image.startsWith('http') ? attr.image : `http://127.0.0.1:8000${attr.image}`}
                                                            alt={attr.name}
                                                            className="w-10 h-10 rounded object-cover border border-slate-700"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center">
                                                            <ImageIcon className="w-5 h-5 text-slate-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-slate-200 text-sm font-medium">{attr.name}</p>
                                                        <p className="text-slate-500 text-xs truncate w-32">{attr.description}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteAttraction(attr.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Attraction"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-sm text-center py-4 bg-slate-900/20 rounded-lg border border-dashed border-slate-700">
                                            No attractions added yet.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleUpdate} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                            <h3 className="text-lg font-bold text-white">Delete Confirmation</h3>
                        </div>
                        <p className="text-slate-400 mb-6">Are you sure you want to delete <strong>{deleteConfirmation.itemName}</strong>? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isViewImagesModalOpen && viewingSpotImages && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">{viewingSpotName} Gallery</h3>
                            <button onClick={() => setIsViewImagesModalOpen(false)}><XCircle className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {viewingSpotImages.length === 0 ? <p className="text-slate-400 col-span-3 text-center">No images.</p> :
                                viewingSpotImages.map((imgUrl, idx) => (
                                    <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-slate-700">
                                        <img src={imgUrl.startsWith('http') ? imgUrl : `http://127.0.0.1:8000${imgUrl}`} alt="Gallery" className="w-full h-full object-cover" />
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}