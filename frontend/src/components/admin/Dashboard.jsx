import React from 'react';
import { stats, agencies, tourGuides, users, reports, spotsAndAttractions } from '../../data/adminData';
import { Map, Home, Users, BarChart3, AlertCircle } from 'lucide-react'; // Re-add necessary icons

export default function Dashboard() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{stats.map((stat, idx) => (
					<div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-slate-400 text-sm">{stat.label}</p>
								<p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
							</div>
							<stat.icon className="w-12 h-12 text-cyan-400 opacity-20" />
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
					<h3 className="text-white font-semibold mb-4">Applications & Reports Status</h3>
					<div className="space-y-4">
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Pending Agencies</p>
								<p className="text-white font-semibold">{agencies.filter(a => a.status === 'pending').length}/3</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
									style={{ width: `${(agencies.filter(a => a.status === 'pending').length / 3) * 100}%` }}
								></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Pending Tour Guides</p>
								<p className="text-white font-semibold">{tourGuides.filter(g => g.status === 'pending').length}/3</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
									style={{ width: `${(tourGuides.filter(g => g.status === 'pending').length / 3) * 100}%` }}
								></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Pending Reports</p>
								<p className="text-white font-semibold">{reports.filter(r => r.status === 'pending').length}/3</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full"
									style={{ width: `${(reports.filter(r => r.status === 'pending').length / 3) * 100}%` }}
								></div>
							</div>
						</div>
						
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Restricted Users</p>
								<p className="text-white font-semibold">{users.filter(u => u.status === 'restricted').length}/4</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
									style={{ width: `${(users.filter(u => u.status === 'restricted').length / 4) * 100}%` }}
								></div>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
					<h3 className="text-white font-semibold mb-4 ">Content Management Overview</h3>
					<div className="space-y-4">
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Featured Spots</p>
								<p className="text-white font-semibold">{spotsAndAttractions.filter(s => s.featured).length}/{spotsAndAttractions.length}</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
									style={{ width: `${(spotsAndAttractions.filter(s => s.featured).length / spotsAndAttractions.length) * 100}%` }}
								></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Published Spots</p>
								<p className="text-white font-semibold">{spotsAndAttractions.filter(s => s.status === 'published').length}/{spotsAndAttractions.length}</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
									style={{ width: `${(spotsAndAttractions.filter(s => s.status === 'published').length / spotsAndAttractions.length) * 100}%` }}
								></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Approved Agencies</p>
								<p className="text-white font-semibold">{agencies.filter(a => a.status === 'approved').length}/{agencies.length}</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
									style={{ width: `${(agencies.filter(a => a.status === 'approved').length / agencies.length) * 100}%` }}
								></div>
							</div>
						</div>
						<div>
							<div className="flex justify-between mb-2">
								<p className="text-slate-400 text-sm">Verified Guides</p>
								<p className="text-white font-semibold">{tourGuides.filter(g => g.verified).length}/{tourGuides.length}</p>
							</div>
							<div className="w-full bg-slate-900/50 rounded-full h-2">
								<div
									className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full"
									style={{ width: `${(tourGuides.filter(g => g.verified).length / tourGuides.length) * 100}%` }}
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
					<h3 className="text-white font-semibold mb-4">User Statistics</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Total Users</p>
							<p className="text-white font-bold text-lg">{users.length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Active Users</p>
							<p className="text-green-400 font-bold text-lg">{users.filter(u => u.status === 'active').length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Restricted Users</p>
							<p className="text-red-400 font-bold text-lg">{users.filter(u => u.status === 'restricted').length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Users with Warnings</p>
							<p className="text-yellow-400 font-bold text-lg">{users.filter(u => u.warnings > 0).length}</p>
						</div>
					</div>
				</div>

				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
					<h3 className="text-white font-semibold mb-4">Applications</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Total Agencies</p>
							<p className="text-white font-bold text-lg">{agencies.length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Approved Agencies</p>
							<p className="text-green-400 font-bold text-lg">{agencies.filter(a => a.status === 'approved').length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Pending Agencies</p>
							<p className="text-yellow-400 font-bold text-lg">{agencies.filter(a => a.status === 'pending').length}</p>
						</div>
						<div className="border-t border-slate-700/50 pt-3 mt-3">
							<p className="text-slate-400 text-sm">Total Tour Guides</p>
							<p className="text-white font-bold text-lg mt-1">{tourGuides.length}</p>
						</div>
					</div>
				</div>

				<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
					<h3 className="text-white font-semibold mb-4">Content Stats</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Spots & Attractions</p>
							<p className="text-white font-bold text-lg">{spotsAndAttractions.length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Featured Content</p>
							<p className="text-amber-400 font-bold text-lg">{spotsAndAttractions.filter(s => s.featured).length}</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-slate-400 text-sm">Pending Reports</p>
							<p className="text-red-400 font-bold text-lg">{reports.filter(r => r.status === 'pending').length}</p>
						</div>
						<div className="border-t border-slate-700/50 pt-3 mt-3">
							<p className="text-slate-400 text-sm">Resolved Reports</p>
							<p className="text-green-400 font-bold text-lg">{reports.filter(r => r.status === 'resolved').length}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}