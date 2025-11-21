import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Map, Users, User, Home, AlertCircle, Settings, LogOut } from 'lucide-react';

const menuItems = [
	{ id: 'dashboard', icon: BarChart3, label: 'Dashboard', path: '/admin' },
	{ id: 'agency', icon: Map, label: 'Agency', path: '/admin/agency' },
	{ id: 'guides', icon: Users, label: 'Tour Guides', path: '/admin/guides' },
	{ id: 'users', icon: User, label: 'User Management', path: '/admin/users' },
	{ id: 'content', icon: Home, label: 'Content Management', path: '/admin/content' },
	{ id: 'accommodation', icon: Home, label: 'Accommodation', path: '/admin/accommodation' },
	{ id: 'reports', icon: AlertCircle, label: 'Report & Analysis', path: '/admin/reports' },
	{ id: 'settings', icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function Sidebar() {
	const navigate = useNavigate();

	const handleSignOut = () => {
		navigate('/admin-signin');
	};

	return (
		<aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-y-auto">
			<div className="p-6 border-b border-slate-700/50">
				<h1 className="text-xl font-bold text-white">Admin Portal</h1>
				<p className="text-slate-400 text-sm mt-1">System Management</p>
			</div>

			<nav className="flex-1 p-4 space-y-2">
				{menuItems.map(item => (
					<NavLink
						key={item.id}
						to={item.path}
						className={({ isActive }) =>
							`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
								isActive
									? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
									: 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
							}`
						}
					>
						<item.icon className="w-5 h-5" />
						<span className="font-medium">{item.label}</span>
					</NavLink>
				))}
			</nav>

			<div className="p-4 border-t border-slate-700/50">
				<div className="flex items-center gap-3 px-4 py-3 mb-3">
					<div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
						<User className="w-5 h-5 text-white" />
					</div>
					<div>
						<p className="text-white text-sm font-medium">Admin</p>
						<p className="text-slate-400 text-xs">admin@system.com</p>
					</div>
				</div>
				<button
					onClick={handleSignOut}
					className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30"
				>
					<LogOut className="w-5 h-5" />
					<span className="font-medium text-sm">Sign Out</span>
				</button>
			</div>
		</aside>
	);
}
