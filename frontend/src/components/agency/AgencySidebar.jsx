import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, UsersRound, User, LogOut, Star, Sun, Moon, Wallet, Settings } from 'lucide-react';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/constants';
import { useTheme } from '../../context/ThemeContext';

export default function AgencySidebar({ activeTab, setActiveTab, handleSignOut }) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const [agencyUser, setAgencyUser] = useState({
        username: 'Agency Staff',
        email: ''
    });

    useEffect(() => {
        const storedUsername = localStorage.getItem('agency_username');
        const storedEmail = localStorage.getItem('agency_email');

        if (storedUsername) {
            setAgencyUser({
                username: storedUsername,
                email: storedEmail || 'agency@localynk.com'
            });
        }
    }, []);

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'bookings', icon: BookOpen, label: 'Bookings Management' },
        { id: 'guides', icon: UsersRound, label: 'Tour Guide Management' },
        { id: 'reviews', icon: Star, label: 'Reviews & Ratings' },
        { id: 'earnings', icon: Wallet, label: 'Earnings & Payments' },
        { id: 'settings', icon: Settings, label: 'Agency Settings' },
    ];

    return (
        <aside className="w-70 bg-white/90 dark:bg-slate-800/50 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700/50 flex flex-col h-screen transition-colors duration-300">

            {/* Clean, simple header without the logo or background image */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex flex-col justify-center">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Agency Portal
                </h1>
                <p className="text-sm mt-1 font-medium text-slate-500 dark:text-slate-400">
                    Management System
                </p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                            ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/30 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 mb-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/30 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all border border-transparent"
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700/30">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                            {agencyUser.username}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate" title={agencyUser.email}>
                            {agencyUser.email}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}