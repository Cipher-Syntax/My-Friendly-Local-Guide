import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, UsersRound, User, LogOut } from 'lucide-react';

export default function AgencySidebar({ activeTab, setActiveTab, handleSignOut }) {
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'bookings', icon: BookOpen, label: 'Bookings Management' },
        { id: 'guides', icon: UsersRound, label: 'Tour Guide Management' },
    ];

    return (
        <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
            <div className="p-6 border-b border-slate-700/50">
                <h1 className="text-xl font-bold text-white">Agency Administration</h1>
                <p className="text-slate-400 text-sm mt-1">Tour Management</p>
            </div>

            <nav className="flex-1 p-4">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                            activeTab === item.id 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                        }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700/50">
                <div className="flex items-center gap-3 px-4 py-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white text-sm font-medium">Admin User</p>
                        <p className="text-slate-400 text-xs">admin@agency.com</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all border border-transparent hover:border-cyan-500/30"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}