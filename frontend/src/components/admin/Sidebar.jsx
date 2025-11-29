import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Map, Users, User, Home, AlertCircle, Settings, LogOut } from 'lucide-react';
// import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants/constants';

const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', path: '/admin' },
    { id: 'agency', icon: Map, label: 'Agency', path: '/admin/agency' },
    { id: 'guides', icon: Users, label: 'Tour Guides', path: '/admin/guides' },
    // { id: 'users', icon: User, label: 'User Management', path: '/admin/users' },
    { id: 'content', icon: Home, label: 'Content Management', path: '/admin/content' },
    { id: 'reports', icon: AlertCircle, label: 'Report & Analysis', path: '/admin/reports' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    
    // Default state
    const [adminUser, setAdminUser] = useState({
        username: 'Admin',
        email: 'admin@system.com'
    });

    useEffect(() => {
        // 1. Retrieve the info we saved during Login
        const storedUsername = localStorage.getItem('admin_username');
        const storedEmail = localStorage.getItem('admin_email');

        // 2. Update state if data exists
        if (storedUsername || storedEmail) {
            setAdminUser({
                username: storedUsername || 'Admin',
                email: storedEmail || 'admin@system.com'
            });
        }
    }, []);

    const handleSignOut = () => {
        // 3. Clear ALL auth data on logout
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        localStorage.removeItem('admin_username'); // Clear specific user data
        localStorage.removeItem('admin_email');    // Clear specific user data
        
        navigate('/admin-signin');
    };

    return (
        <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-y-auto h-screen">
            <div className="p-6 border-b border-slate-700/50">
                <h1 className="text-xl font-bold text-white">Admin Portal</h1>
                <p className="text-slate-400 text-sm mt-1">System Management</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        end={item.path === '/admin'} 
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
                    <div className="overflow-hidden">
                        {/* Display Dynamic Data */}
                        <p className="text-white text-sm font-medium truncate">
                            {adminUser.username}
                        </p>
                        <p className="text-slate-400 text-xs truncate" title={adminUser.email}>
                            {adminUser.email}
                        </p>
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