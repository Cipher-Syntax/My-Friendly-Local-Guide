import React, { useState, useMemo, useEffect } from 'react';
import { Search, Image as ImageIcon, Eye, Trash2, AlertTriangle, MapPin, Star, XCircle, Plus, Filter, Landmark, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';
import api from '../../api/api';

export default function ContentManagement() {
    const [destinations, setDestinations] = useState([]);
    const [categoryChoices, setCategoryChoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [editingSpot, setEditingSpot] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [isAttractionModalOpen, setIsAttractionModalOpen] = useState(false);
    const [targetDestId, setTargetDestId] = useState(null);
    const [newAttraction, setNewAttraction] = useState({
        name: '', description: '', photo: null
    });

    const [newSpot, setNewSpot] = useState({
        name: '', description: '', category: '', location: '', rating: 0, is_featured: false, images: []
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

    const fetchCategories = async () => {
        try {
            const response = await api.get('api/categories/');
            setCategoryChoices(response.data);

            if (response.data.length > 0) {
                setNewSpot(prev => ({ ...prev, category: response.data[0] }));
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            showToast("Failed to load categories.", "error");
        }
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
        fetchCategories();
        fetchDestinations();
    }, []);

    const handleCreate = async () => {
        if (!newSpot.name || !newSpot.location || !newSpot.description) {
            showToast("Please fill in all required text fields.", "error");
            return;
        }

        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', newSpot.name);
            formData.append('description', newSpot.description);
            formData.append('category', newSpot.category || categoryChoices[0]);
            formData.append('location', newSpot.location);
            formData.append('average_rating', newSpot.rating);
            formData.append('is_featured', newSpot.is_featured);

            newSpot.images.forEach((image) => {
                formData.append('uploaded_images', image);
            });

            await api.post('api/destinations/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchDestinations(); // Refetch to ensure sync with newly generated backend URLs

            setIsCreateModalOpen(false);
            setNewSpot({ name: '', description: '', category: categoryChoices[0] || '', location: '', rating: 0, is_featured: false, images: [] });
            showToast("Destination created successfully!", "success");
        } catch (error) {
            console.error("Failed to create:", error);
            showToast("Failed to create destination.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDestinationImageChange = (e) => {
        const files = Array.from(e.target.files);
        setNewSpot(prev => {
            const total = prev.images.length + files.length;
            if (total > 5) {
                showToast("Maximum of 5 images allowed.", "error");
                const allowed = files.slice(0, Math.max(0, 5 - prev.images.length));
                return { ...prev, images: [...prev.images, ...allowed] };
            }
            return { ...prev, images: [...prev.images, ...files] };
        });
        e.target.value = null; // Clear input to allow re-selecting the same file if needed
    };

    const removeDestinationImage = (indexToRemove) => {
        setNewSpot(prev => ({
            ...prev,
            images: prev.images.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleEditImageChange = (e) => {
        const files = Array.from(e.target.files);
        setEditingSpot(prev => {
            const existingCount = prev.imageList ? prev.imageList.length : 0;
            const newCount = prev.newImages ? prev.newImages.length : 0;
            const total = existingCount + newCount + files.length;

            if (total > 5) {
                showToast("Maximum of 5 images allowed.", "error");
                const allowed = files.slice(0, Math.max(0, 5 - (existingCount + newCount)));
                return { ...prev, newImages: [...(prev.newImages || []), ...allowed] };
            }
            return { ...prev, newImages: [...(prev.newImages || []), ...files] };
        });
        e.target.value = null; // Clear input to allow re-selecting the same file if needed
    };

    const removeEditExistingImage = (indexToRemove) => {
        setEditingSpot(prev => ({
            ...prev,
            imageList: prev.imageList.filter((_, index) => index !== indexToRemove)
        }));
    };

    const removeEditNewImage = (indexToRemove) => {
        setEditingSpot(prev => ({
            ...prev,
            newImages: prev.newImages.filter((_, index) => index !== indexToRemove)
        }));
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
        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', editingSpot.name);
            formData.append('description', editingSpot.description);
            formData.append('category', editingSpot.category);
            formData.append('location', editingSpot.location);
            formData.append('average_rating', editingSpot.rating);
            formData.append('is_featured', editingSpot.featured);

            if (editingSpot.imageList) {
                editingSpot.imageList.forEach(url => formData.append('existing_images', url));
            }

            if (editingSpot.newImages) {
                editingSpot.newImages.forEach(file => formData.append('uploaded_images', file));
            }

            await api.patch(`api/destinations/${editingSpot.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchDestinations(); // Refetch perfectly syncs the newly processed backend images to frontend state

            setIsEditModalOpen(false);
            setEditingSpot(null);
            showToast("Destination updated successfully!", "success");
        } catch (error) {
            console.error("Failed to save changes:", error);
            showToast("Failed to update destination.", "error");
        } finally {
            setIsCreating(false);
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
        <div className="space-y-6 relative transition-colors duration-300">
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-900 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
                <div className="flex gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                    </div>
                    <div className="relative min-w-[150px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Filter className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"
                        >
                            <option value="All">All Types</option>
                            {categoryChoices.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setNewSpot(prev => ({ ...prev, category: categoryChoices[0] || '' }));
                        setIsCreateModalOpen(true);
                    }}
                    className="w-full md:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Destination
                </button>
            </div>

            <div className="space-y-4">
                {filteredDestinations.map(spot => (
                    <div key={spot.id} className={`bg-white dark:bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 transition-all shadow-sm ${spot.featured ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-slate-800/80 shadow-amber-900/5 dark:shadow-amber-900/10' : 'border-slate-200 dark:border-slate-700/50'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-slate-900 dark:text-white font-bold text-xl">{spot.name}</h3>
                                    <span className="px-2.5 py-0.5 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-semibold rounded-full border border-cyan-200 dark:border-cyan-500/20 uppercase tracking-wide">
                                        {spot.category}
                                    </span>
                                    {spot.featured && (
                                        <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" /> Featured
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-2">
                                    <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    {spot.location}
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 line-clamp-2 leading-relaxed">{spot.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-500/20">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="text-slate-900 dark:text-white font-bold">{spot.rating}</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {spot.attractionsCount} Attraction{spot.attractionsCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <button
                                onClick={() => viewSpotImages(spot)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border border-slate-200 dark:border-transparent"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Gallery ({spot.imagesCount})
                            </button>

                            <button
                                onClick={() => toggleFeatured(spot)}
                                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border ${spot.featured
                                    ? 'bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-transparent'
                                    }`}
                            >
                                <Star className={`w-4 h-4 ${spot.featured ? 'fill-current' : ''}`} />
                                {spot.featured ? 'Unfeature' : 'Feature'}
                            </button>

                            <button
                                onClick={() => {
                                    setEditingSpot({ ...spot, newImages: [] });
                                    setIsEditModalOpen(true);
                                }}
                                className="flex-1 px-4 py-2.5 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Eye className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: true, itemId: spot.id, itemName: spot.name })}
                                className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10 transition-colors">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Destination</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Name</label>
                                <input type="text" value={newSpot.name} onChange={(e) => setNewSpot({ ...newSpot, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Category</label>
                                    <select value={newSpot.category} onChange={(e) => setNewSpot({ ...newSpot, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors">
                                        {categoryChoices.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Location</label>
                                    <input type="text" value={newSpot.location} onChange={(e) => setNewSpot({ ...newSpot, location: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Description</label>
                                <textarea rows="4" value={newSpot.description} onChange={(e) => setNewSpot({ ...newSpot, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                            </div>

                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Destination Images (Max 5)</label>
                                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${newSpot.images.length >= 5 ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 opacity-70' : 'border-slate-300 dark:border-slate-600 hover:border-cyan-500 bg-slate-50 dark:bg-transparent'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleDestinationImageChange}
                                        className="hidden"
                                        id="destination-images-upload"
                                        disabled={newSpot.images.length >= 5}
                                    />
                                    <label htmlFor="destination-images-upload" className={`flex flex-col items-center ${newSpot.images.length >= 5 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {newSpot.images.length >= 5 ? 'Maximum 5 images reached' : 'Click to upload images'}
                                        </span>
                                    </label>
                                </div>
                                {newSpot.images.length > 0 && (
                                    <div className="mt-4 grid grid-cols-5 gap-3">
                                        {newSpot.images.map((img, index) => (
                                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                <img src={URL.createObjectURL(img)} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeDestinationImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700/30">
                                <input type="checkbox" checked={newSpot.is_featured} onChange={(e) => setNewSpot({ ...newSpot, is_featured: e.target.checked })} className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-cyan-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer" />
                                <label className="text-slate-900 dark:text-white font-medium cursor-pointer" onClick={() => setNewSpot({ ...newSpot, is_featured: !newSpot.is_featured })}>Feature this destination?</label>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">Cancel</button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className={`px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${isCreating ? 'bg-cyan-500/50 text-white/70 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                                    }`}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Destination'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAttractionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Attraction</h3>
                            <button onClick={() => setIsAttractionModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Attraction Name</label>
                                <input
                                    type="text"
                                    value={newAttraction.name}
                                    onChange={(e) => setNewAttraction({ ...newAttraction, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Description</label>
                                <textarea
                                    rows="3"
                                    value={newAttraction.description}
                                    onChange={(e) => setNewAttraction({ ...newAttraction, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Main Photo</label>
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors bg-slate-50 dark:bg-transparent">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewAttraction({ ...newAttraction, photo: e.target.files[0] })}
                                        className="hidden"
                                        id="attraction-photo-upload"
                                    />
                                    <label htmlFor="attraction-photo-upload" className="cursor-pointer flex flex-col items-center">
                                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {newAttraction.photo ? newAttraction.photo.name : "Click to upload image"}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button onClick={() => setIsAttractionModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">Cancel</button>
                            <button onClick={handleCreateAttraction} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium shadow-lg shadow-purple-500/20 transition-all">Add Attraction</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingSpot && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10 transition-colors">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Destination</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Name</label>
                                <input type="text" value={editingSpot.name} onChange={(e) => setEditingSpot({ ...editingSpot, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Category</label>
                                    <select value={editingSpot.category} onChange={(e) => setEditingSpot({ ...editingSpot, category: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors">
                                        {categoryChoices.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Location</label>
                                    <input type="text" value={editingSpot.location} onChange={(e) => setEditingSpot({ ...editingSpot, location: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-900 dark:text-white text-sm font-medium mb-2">Description</label>
                                <textarea rows="4" value={editingSpot.description} onChange={(e) => setEditingSpot({ ...editingSpot, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" />
                            </div>

                            <div className="mt-6 border-t border-slate-200 dark:border-slate-700/50 pt-4">
                                <h4 className="text-slate-900 dark:text-white text-sm font-medium mb-3 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    Destination Images (Max 5)
                                </h4>

                                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${((editingSpot.imageList?.length || 0) + (editingSpot.newImages?.length || 0)) >= 5 ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 opacity-70' : 'border-slate-300 dark:border-slate-600 hover:border-cyan-500 bg-slate-50 dark:bg-transparent'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleEditImageChange}
                                        className="hidden"
                                        id="edit-destination-images-upload"
                                        disabled={((editingSpot.imageList?.length || 0) + (editingSpot.newImages?.length || 0)) >= 5}
                                    />
                                    <label htmlFor="edit-destination-images-upload" className={`flex flex-col items-center ${((editingSpot.imageList?.length || 0) + (editingSpot.newImages?.length || 0)) >= 5 ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {((editingSpot.imageList?.length || 0) + (editingSpot.newImages?.length || 0)) >= 5 ? 'Maximum 5 images reached' : 'Click to upload new images'}
                                        </span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-5 gap-3">
                                    {editingSpot.imageList && editingSpot.imageList.map((imgUrl, index) => (
                                        <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <img src={imgUrl.startsWith('http') ? imgUrl : `http://127.0.0.1:8000${imgUrl}`} alt={`Existing ${index}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeEditExistingImage(index)}
                                                className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {editingSpot.newImages && editingSpot.newImages.map((img, index) => (
                                        <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-cyan-200 dark:border-cyan-700">
                                            <img src={URL.createObjectURL(img)} alt={`New ${index}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none"></div>
                                            <button
                                                onClick={() => removeEditNewImage(index)}
                                                className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">Cancel</button>
                            <button
                                onClick={handleUpdate}
                                disabled={isCreating}
                                className={`px-6 py-2 rounded-lg font-medium shadow-lg transition-all flex items-center gap-2 ${isCreating ? 'bg-cyan-500/50 text-white/70 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/20'}`}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Confirmation</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deleteConfirmation.itemName}</strong>? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg shadow-lg shadow-red-500/20 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isViewImagesModalOpen && viewingSpotImages && (
                <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl animate-in zoom-in-95 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewingSpotName} Gallery</h3>
                            <button onClick={() => setIsViewImagesModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800 max-h-[70vh] overflow-y-auto">
                            {viewingSpotImages.length === 0 ? <p className="text-slate-500 dark:text-slate-400 col-span-3 text-center font-medium">No images.</p> :
                                viewingSpotImages.map((imgUrl, idx) => (
                                    <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
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