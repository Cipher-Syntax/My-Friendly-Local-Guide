import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle, Lock, Trash2 } from 'lucide-react';
import { users as initialUsers, getStatusColor } from '../../data/adminData';

export default function UserManagement() {
	const [users, setUsers] = useState(initialUsers);
	const [searchTerm, setSearchTerm] = useState('');

	const filteredUsers = useMemo(() =>
		users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
		[users, searchTerm]
	);

	const restrictUser = (userId) => {
		setUsers(users.map(u => u.id === userId ? { ...u, status: u.status === 'restricted' ? 'active' : 'restricted' } : u));
	};

	const warnUser = (userId) => {
		setUsers(users.map(u => u.id === userId ? { ...u, warnings: u.warnings + 1 } : u));
	};

	const deleteUser = (userId) => {
		setUsers(users.filter(u => u.id !== userId));
	};

	return (
		<div className="space-y-4">
			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
					<input
						type="text"
						placeholder="Search users..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
					/>
				</div>
			</div>

			<div className="space-y-3">
				{filteredUsers.map(user => (
					<div key={user.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<h3 className="text-white font-semibold">{user.name}</h3>
								<p className="text-slate-400 text-sm">{user.email}</p>
								<p className="text-slate-400 text-sm">Type: {user.type}</p>
								<p className="text-slate-400 text-sm">Warnings: {user.warnings}</p>
							</div>
							<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
								{user.status}
							</span>
						</div>
						<div className="flex gap-2 mt-4">
							<button
								onClick={() => warnUser(user.id)}
								className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<AlertTriangle className="w-4 h-4" />
								Warn
							</button>
							<button
								onClick={() => restrictUser(user.id)}
								className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<Lock className="w-4 h-4" />
								{user.status === 'restricted' ? 'Unrestrict' : 'Restrict'}
							</button>
							<button
								onClick={() => deleteUser(user.id)}
								className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<Trash2 className="w-4 h-4" />
								Delete
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}