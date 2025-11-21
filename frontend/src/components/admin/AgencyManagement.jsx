import React, { useState, useMemo } from 'react';
import { Search, Eye, Check, X } from 'lucide-react';
import { agencies as initialAgencies, getStatusColor } from '../../data/adminData';

export default function AgencyManagement() {
	const [agencies, setAgencies] = useState(initialAgencies);
	const [searchTerm, setSearchTerm] = useState('');
	const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
	const [reviewingItem, setReviewingItem] = useState(null);

	const filteredAgencies = useMemo(() =>
		agencies.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
		[agencies, searchTerm]
	);

	const reviewApplication = (item, type) => {
		setReviewingItem({ ...item, type });
		setIsReviewModalOpen(true);
	};

	const approveApplication = () => {
		if (reviewingItem.type === 'agency') {
			setAgencies(agencies.map(a => a.id === reviewingItem.id ? { ...a, status: 'approved' } : a));
		}
		setIsReviewModalOpen(false);
	};

	const declineApplication = () => {
		if (reviewingItem.type === 'agency') {
			setAgencies(agencies.filter(a => a.id !== reviewingItem.id));
		}
		setIsReviewModalOpen(false);
	};

	return (
		<div className="space-y-4">
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Search agencies..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
					/>
				</div>
			</div>

			<div className="space-y-3">
				{filteredAgencies.map(agency => (
					<div key={agency.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<h3 className="text-white font-semibold">{agency.name}</h3>
								<p className="text-slate-400 text-sm">{agency.email}</p>
								<p className="text-slate-400 text-sm">Location: {agency.location}</p>
							</div>
							<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(agency.status)}`}>
								{agency.status}
							</span>
						</div>
						{agency.status === 'pending' && (
							<div className="flex gap-2 mt-4">
								<button
									onClick={() => reviewApplication(agency, 'agency')}
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
							{reviewingItem.type === 'agency' && (
								<div>
									<p className="text-slate-400 text-sm">Location</p>
									<p className="text-white font-medium">{reviewingItem.location}</p>
								</div>
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
		</div>
	);
}