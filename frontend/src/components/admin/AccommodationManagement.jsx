import React, { useState, useMemo } from 'react';
import { Search, Image as ImageIcon, Check, X } from 'lucide-react';
import { accommodations as initialAccommodations, getStatusColor } from '../../data/adminData';

export default function AccommodationManagement() {
	const [accommodations, setAccommodations] = useState(initialAccommodations);
	const [searchTerm, setSearchTerm] = useState('');
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedImage, setSelectedImage] = useState(null);

	const filteredAccommodations = useMemo(() =>
		accommodations.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
		[accommodations, searchTerm]
	);

	const viewAccommodationImages = (accommodation) => {
		setSelectedImage(accommodation);
		setIsImageModalOpen(true);
	};

	const approveAccommodation = (id) => {
		setAccommodations(accommodations.map(acc => acc.id === id ? { ...acc, status: 'approved' } : acc));
	};

	const rejectAccommodation = (id) => {
		setAccommodations(accommodations.filter(acc => acc.id !== id));
	};

	return (
		<div className="space-y-4">
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Search accommodations..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
					/>
				</div>
			</div>

			<div className="space-y-3">
				{filteredAccommodations.map(accommodation => (
					<div key={accommodation.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<h3 className="text-white font-semibold">{accommodation.name}</h3>
								<p className="text-slate-400 text-sm">{accommodation.description}</p>
								<p className="text-slate-400 text-sm">Submitted by: {accommodation.submittedBy}</p>
								<p className="text-slate-400 text-sm">Location: {accommodation.location} | Price: {accommodation.price}</p>
							</div>
							<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(accommodation.status)}`}>
								{accommodation.status}
							</span>
						</div>
						<div className="flex gap-2 mt-4">
							<button
								onClick={() => viewAccommodationImages(accommodation)}
								className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<ImageIcon className="w-4 h-4" />
								View Images ({accommodation.images})
							</button>
							{accommodation.status === 'pending' && (
								<>
									<button 
										onClick={() => approveAccommodation(accommodation.id)}
										className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2">
										<Check className="w-4 h-4" />
										Approve
									</button>
									<button 
										onClick={() => rejectAccommodation(accommodation.id)}
										className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2">
										<X className="w-4 h-4" />
										Reject
									</button>
								</>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Image View Modal */}
			{isImageModalOpen && selectedImage && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
						<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
							<h3 className="text-xl font-bold text-white">{selectedImage.name} - Images</h3>
							<button
								onClick={() => setIsImageModalOpen(false)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="px-6 py-6">
							<p className="text-slate-400 mb-4">Total Images: {selectedImage.images}</p>
							<div className="grid grid-cols-3 gap-4">
								{Array.from({ length: selectedImage.images }).map((_, idx) => (
									<div
										key={idx}
										className="aspect-square bg-slate-900/50 border border-slate-700/50 rounded-lg flex items-center justify-center"
									>
										<ImageIcon className="w-8 h-8 text-slate-600" />
									</div>
								))}
							</div>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setIsImageModalOpen(false)}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}