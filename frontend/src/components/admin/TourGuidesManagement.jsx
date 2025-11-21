import React, { useState, useMemo } from 'react';
import { Search, Eye, Check, X, Image as ImageIcon } from 'lucide-react';
import { tourGuides as initialTourGuides, getStatusColor } from '../../data/adminData';

export default function TourGuidesManagement() {
	const [tourGuides, setTourGuides] = useState(initialTourGuides);
	const [searchTerm, setSearchTerm] = useState('');
	const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
	const [reviewingItem, setReviewingItem] = useState(null);
	const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
	const [viewingCredentials, setViewingCredentials] = useState(null);
	const [viewingCredentialImage, setViewingCredentialImage] = useState(null);
	const [isViewCredentialImageModalOpen, setIsViewCredentialImageModalOpen] = useState(false);

	const filteredGuides = useMemo(() =>
		tourGuides.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
		[tourGuides, searchTerm]
	);

	const reviewApplication = (item, type) => {
		setReviewingItem({ ...item, type });
		setIsReviewModalOpen(true);
	};

	const approveApplication = () => {
		if (reviewingItem.type === 'guide') {
			setTourGuides(tourGuides.map(g => g.id === reviewingItem.id ? { ...g, status: 'approved', verified: true } : g));
		}
		setIsReviewModalOpen(false);
	};

	const declineApplication = () => {
		if (reviewingItem.type === 'guide') {
			setTourGuides(tourGuides.filter(g => g.id !== reviewingItem.id));
		}
		setIsReviewModalOpen(false);
	};

	const viewGuideCredentials = (guide) => {
		setViewingCredentials(guide);
		setIsCredentialsModalOpen(true);
	};

	const viewCredentialImage = (credentialType, guideName) => {
		setViewingCredentialImage({ type: credentialType, guideName });
		setIsViewCredentialImageModalOpen(true);
	};

	return (
		<div className="space-y-4">
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Search tour guides..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
					/>
				</div>
			</div>

			<div className="space-y-3">
				{filteredGuides.map(guide => (
					<div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<h3 className="text-white font-semibold">{guide.name}</h3>
								<p className="text-slate-400 text-sm">{guide.email}</p>
								<p className="text-slate-400 text-sm">Specialty: {guide.specialty}</p>
								<p className="text-slate-400 text-sm">Languages: {guide.languages.join(', ')}</p>
							</div>
							<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(guide.status)}`}>
								{guide.status}
							</span>
						</div>
						{guide.status === 'pending' && (
							<div className="flex gap-2 mt-4">
								<button
									onClick={() => viewGuideCredentials(guide)}
									className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
								>
									<ImageIcon className="w-4 h-4" />
									Credentials
								</button>
								<button
									onClick={() => reviewApplication(guide, 'guide')}
									className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
								>
									<Eye className="w-4 h-4" />
									Review
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Review Application Modal */}
			{isReviewModalOpen && reviewingItem && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
						<div className="px-6 py-4 border-b border-slate-700/50">
							<h3 className="text-xl font-bold text-white">Review Application</h3>
						</div>

						<div className="px-6 py-6 space-y-3">
							<div>
								<p className="text-slate-400 text-sm">Name</p>
								<p className="text-white font-medium">{reviewingItem.name}</p>
							</div>
							<div>
								<p className="text-slate-400 text-sm">Email</p>
								<p className="text-white font-medium">{reviewingItem.email}</p>
							</div>
							{reviewingItem.type === 'guide' && (
								<>
									<div>
										<p className="text-slate-400 text-sm">Specialty</p>
										<p className="text-white font-medium">{reviewingItem.specialty}</p>
									</div>
									<div>
										<p className="text-slate-400 text-sm">Languages</p>
										<p className="text-white font-medium">{reviewingItem.languages.join(', ')}</p>
									</div>
								</>
							)}
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setIsReviewModalOpen(false)}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Close
							</button>
							<button
								onClick={declineApplication}
								className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
							>
								Decline
							</button>
							<button
								onClick={approveApplication}
								className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
							>
								Approve
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Guide Credentials Modal */}
			{isCredentialsModalOpen && viewingCredentials && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
						<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
							<h3 className="text-xl font-bold text-white">{viewingCredentials.name} - Credentials</h3>
							<button
								onClick={() => setIsCredentialsModalOpen(false)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="px-6 py-6">
							<p className="text-slate-400 text-sm mb-6">Guide credentials verification documents</p>
							<div className="space-y-3">
								<div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
									<div className="flex items-center gap-3">
										<ImageIcon className="w-5 h-5 text-cyan-400" />
										<span className="text-white font-medium">Tour Guide Certificate</span>
									</div>
									<div className="flex items-center gap-2">
										{viewingCredentials.credentials.certificate ? (
											<>
												<span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
													<Check className="w-4 h-4" />
													Submitted
												</span>
												<button 
													onClick={() => viewCredentialImage('certificate', viewingCredentials.name)}
													className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
												>
													View
												</button>
											</>
										) : (
											<span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
												<X className="w-4 h-4" />
												Missing
											</span>
										)}
									</div>
								</div>

								<div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
									<div className="flex items-center gap-3">
										<ImageIcon className="w-5 h-5 text-cyan-400" />
										<span className="text-white font-medium">Proof of Residency</span>
									</div>
									<div className="flex items-center gap-2">
										{viewingCredentials.credentials.residency ? (
											<>
												<span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
													<Check className="w-4 h-4" />
													Submitted
												</span>
												<button 
													onClick={() => viewCredentialImage('residency', viewingCredentials.name)}
													className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
												>
													View
												</button>
											</>
										) : (
											<span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
												<X className="w-4 h-4" />
												Missing
											</span>
										)}
									</div>
								</div>

								<div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
									<div className="flex items-center gap-3">
										<ImageIcon className="w-5 h-5 text-cyan-400" />
										<span className="text-white font-medium">Valid ID</span>
									</div>
									<div className="flex items-center gap-2">
										{viewingCredentials.credentials.validId ? (
											<>
												<span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
													<Check className="w-4 h-4" />
													Submitted
												</span>
												<button 
													onClick={() => viewCredentialImage('validId', viewingCredentials.name)}
													className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
												>
													View
												</button>
											</>
										) : (
											<span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
												<X className="w-4 h-4" />
												Missing
											</span>
										)}
									</div>
								</div>

								<div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
									<div className="flex items-center gap-3">
										<ImageIcon className="w-5 h-5 text-cyan-400" />
										<span className="text-white font-medium">NBI Clearance</span>
									</div>
									<div className="flex items-center gap-2">
										{viewingCredentials.credentials.nbiClearance ? (
											<>
												<span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
													<Check className="w-4 h-4" />
													Submitted
												</span>
												<button 
													onClick={() => viewCredentialImage('nbiClearance', viewingCredentials.name)}
													className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
												>
													View
												</button>
											</>
										) : (
											<span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
												<X className="w-4 h-4" />
												Missing
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setIsCredentialsModalOpen(false)}
								className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* View Credential Image Modal */}
			{isViewCredentialImageModalOpen && viewingCredentialImage && (
				<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
						<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
							<h3 className="text-xl font-bold text-white">
								{viewingCredentialImage.type === 'certificate' && 'Tour Guide Certificate'}
								{viewingCredentialImage.type === 'residency' && 'Proof of Residency'}
								{viewingCredentialImage.type === 'validId' && 'Valid ID'}
								{viewingCredentialImage.type === 'nbiClearance' && 'NBI Clearance'}
							</h3>
							<button
								onClick={() => setIsViewCredentialImageModalOpen(false)}
								className="text-slate-400 hover:text-white"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="px-6 py-6">
							<p className="text-slate-400 text-sm mb-4">Submitted by: {viewingCredentialImage.guideName}</p>
							<div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-8 flex items-center justify-center min-h-96">
								<div className="text-center">
									<ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
									<p className="text-slate-400">Credential image placeholder</p>
									<p className="text-slate-500 text-sm mt-2">
										{viewingCredentialImage.type === 'certificate' && 'Tour guide certificate document'}
										{viewingCredentialImage.type === 'residency' && 'Proof of residency document'}
										{viewingCredentialImage.type === 'validId' && 'Valid government ID document'}
										{viewingCredentialImage.type === 'nbiClearance' && 'NBI clearance certificate'}
									</p>
								</div>
							</div>
						</div>

						<div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
							<button
								onClick={() => setIsViewCredentialImageModalOpen(false)}
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