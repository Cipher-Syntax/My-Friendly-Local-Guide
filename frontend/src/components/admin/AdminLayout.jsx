import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AdminLayout() {
	return (
		<div className="flex h-screen bg-slate-900">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header will eventually go here, similar to the Admindraft.jsx structure */}
				<header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
					<div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
						<div className="absolute inset-0 opacity-20">
							<div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
							<div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
						</div>
						<div className="relative px-8 py-6 h-full flex flex-col justify-center">
								<div className="flex items-center gap-4">
								{/* Icons and titles will be dynamically rendered based on the active route */}
								</div>
						</div>
					</div>
				</header>
				<div className="flex-1 overflow-auto p-8">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
