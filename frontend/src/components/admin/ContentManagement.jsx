import React, { useState, useMemo } from 'react';
import { Search, Image as ImageIcon, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { spotsAndAttractions as initialSpotsAndAttractions, getStatusColor } from '../../data/adminData';

export default function ContentManagement() {
	const [spotsAndAttractions, setSpotsAndAttractions] = useState(initialSpotsAndAttractions);
	const [searchTerm, setSearchTerm] = useState('');
	const [editingSpot, setEditingSpot] = useState(null);
	const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
	const [isViewImagesModalOpen, setIsViewImagesModalOpen] = useState(false);
	const [viewingSpotImages, setViewingSpotImages] = useState(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, itemId: null, itemType: null, itemName: '' });

	const filteredSpotsAndAttractions = useMemo(() =>
		spotsAndAttractions.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
		[spotsAndAttractions, searchTerm]
	);

	const editAccommodation = (accommodation) => { // Renamed from editAccommodation to editSpot for clarity
		setEditingSpot({ ...accommodation });
		setIsEditSpotModalOpen(true);
	};

	const saveAccommodationChanges = () => { // Renamed from saveAccommodationChanges to saveSpotChanges for clarity
		setSpotsAndAttractions(spotsAndAttractions.map(s => 
			s.id === editingSpot.id ? editingSpot : s
		));
		setIsEditSpotModalOpen(false);
		setEditingSpot(null);
	};

	const deleteAccommodation = (accommodationId, name) => { // Renamed from deleteAccommodation to deleteSpot for clarity
		setDeleteConfirmation({ isOpen: true, itemId: accommodationId, itemType: 'spot', itemName: name });
	};

	const confirmDelete = () => {
		if (deleteConfirmation.itemType === 'spot') {
			setSpotsAndAttractions(spotsAndAttractions.filter(s => s.id !== deleteConfirmation.itemId));
		}
		setDeleteConfirmation({ isOpen: false, itemId: null, itemType: null, itemName: '' });
	};

	const toggleFeatured = (spotId) => { // Renamed from accommodationId to spotId for clarity
		setSpotsAndAttractions(spotsAndAttractions.map(s => 
			s.id === spotId ? { ...s, featured: !s.featured } : s
		));
	};

	const viewSpotImages = (spot) => {
		setViewingSpotImages(spot);
		setIsViewImagesModalOpen(true);
	};

	return (
		<div className="space-y-4">
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Search spots and attractions..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
					/>
				</div>
			</div>

			<div className="space-y-3">
				{filteredSpotsAndAttractions.map(spot => (
					<div key={spot.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-white font-semibold text-lg">{spot.name}</h3>
									{spot.featured && (
										<span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
											★ Featured
										</span>
									)}
								</div>
								<p className="text-slate-400 text-sm">Posted by: {spot.postedBy} ({spot.type})</p>
								<p className="text-slate-400 text-sm">Category: {spot.category}</p>
								<p className="text-slate-400 text-sm">{spot.description}</p>
							</div>
							<div className="flex flex-col items-end gap-2">
								<span className={`px-3 py-1 rounded-full text-xs font-medium border ${
									getStatusColor(spot.status)
								}`}>
									{spot.status}
								</span>
								<div className="flex items-center gap-1 text-amber-400">
									<span>★</span>
									<span className="text-white font-semibold">{spot.rating}</span>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3 mb-4 text-sm">
							<div className="bg-slate-900/50 rounded-lg p-3">
								<p className="text-slate-400">Images</p>
								<p className="text-white font-medium">{spot.images} uploaded</p>
							</div>
							<div className="bg-slate-900/50 rounded-lg p-3">
								<p className="text-slate-400">Type</p>
								<p className="text-white font-medium">{spot.type}</p>
							</div>
						</div>

						<div className="flex gap-2">
							<button
								onClick={() => viewSpotImages(spot)}
								className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<ImageIcon className="w-4 h-4" />
								Images ({spot.images})
							</button>
							<button
								onClick={() => editAccommodation(spot)}
								className="flex-1 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<Eye className="w-4 h-4" />
								Edit
							</button>
							<button
								onClick={() => toggleFeatured(spot.id)}
								className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
									spot.featured
										? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
										: 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
								}`}
							>
								{spot.featured ? '★ Featured' : '☆ Feature'}
							</button>
							<button
								onClick={() => deleteAccommodation(spot.id, spot.name)}
								className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<Trash2 className="w-4 h-4" />
								Delete
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Edit Spot Modal */}
			{isEditSpotModalOpen && editingSpot && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800">
							<h3 className="text-xl font-bold text-white">Edit Spot & Attraction</h3>
							<button
								onClick={() => setIsEditSpotModalOpen(false)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="px-6 py-6 space-y-4">
							<div>
								<label className="block text-white text-sm font-medium mb-2">Spot / Attraction Name</label>
								<input
									type="text"
									value={editingSpot.name}
									onChange={(e) => setEditingSpot({ ...editingSpot, name: e.target.value })}
									className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
								/>
							</div>

							<div>
								<label className="block text-white text-sm font-medium mb-2">Description</label>
								<textarea
									value={editingSpot.description}
									onChange={(e) => setEditingSpot({ ...editingSpot, description: e.target.value })}
									rows="4"
									className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-white text-sm font-medium mb-2">Category</label>
									<input
										type="text"
										value={editingSpot.category}
										onChange={(e) => setEditingSpot({ ...editingSpot, category: e.target.value })}
										className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
									/>
								</div>
								<div>
									<label className="block text-white text-sm font-medium mb-2">Rating</label>
									<input
										type="number"
										step="0.1"
										min="0"
										max="5"
										value={editingSpot.rating}
										onChange={(e) => setEditingSpot({ ...editingSpot, rating: parseFloat(e.target.value) })}
										className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-white text-sm font-medium mb-2">Status</label>
									<select
										value={editingSpot.status}
										onChange={(e) => setEditingSpot({ ...editingSpot, status: e.target.value })}
										className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
									>
										<option value="draft">Draft</option>
										<option value="published">Published</option>
									</select>
								</div>
								<div>
									<label className="block text-white text-sm font-medium mb-2">Number of Images</label>
									<input
										type="number"
										value={editingSpot.images}
										onChange={(e) => setEditingSpot({ ...editingSpot, images: parseInt(e.target.value) })}
										min="0"
										className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
									/>
								</div>
							</div>

							<div className="bg-slate-900/30 border border-slate-700/30 rounded-lg p-4">
								<p className="text-slate-400 text-sm">Posted by: <span className="text-white font-medium">{editingSpot.postedBy}</span></p>
								<p className="text-slate-400 text-sm">Type: <span className="text-white font-medium">{editingSpot.type}</span></p>
							</div>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 sticky bottom-0 bg-slate-800">
							<button
								onClick={() => setIsEditSpotModalOpen(false)}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={saveAccommodationChanges}
								className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
							>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}

			{/* View Spot Images Modal */}
			{isViewImagesModalOpen && viewingSpotImages && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
						<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
							<h3 className="text-xl font-bold text-white">{viewingSpotImages.name} - Images</h3>
							<button
								onClick={() => setIsViewImagesModalOpen(false)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="px-6 py-6">
							<p className="text-slate-400 mb-4 text-sm">Total Images: {viewingSpotImages.images}</p>
							<div className="grid grid-cols-3 gap-4">
								{Array.from({ length: viewingSpotImages.images }).map((_, idx) => (
									<div
										key={idx}
										className="aspect-square bg-slate-900/50 border border-slate-700/50 rounded-lg flex items-center justify-center hover:bg-slate-900 transition-colors cursor-pointer"
									>
										<ImageIcon className="w-8 h-8 text-slate-600" />
									</div>
								))}
							</div>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setIsViewImagesModalOpen(false)}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirmation.isOpen && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
						<div className="px-6 py-4 border-b border-slate-700/50">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-red-500/20 rounded-lg">
									<AlertTriangle className="w-6 h-6 text-red-400" />
								</div>
								<h3 className="text-lg font-bold text-white">Delete Confirmation</h3>
							</div>
						</div>

						<div className="px-6 py-6">
							<p className="text-slate-400 mb-2">Are you sure you want to delete this item?</p>
							<p className="text-white font-semibold text-lg">"{deleteConfirmation.itemName}"</p>
							<p className="text-slate-400 text-sm mt-3">This action cannot be undone.</p>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setDeleteConfirmation({ isOpen: false, itemId: null, itemType: null, itemName: '' })}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={confirmDelete}
								className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}