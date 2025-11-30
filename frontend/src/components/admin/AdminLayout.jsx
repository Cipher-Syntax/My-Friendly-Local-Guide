import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { BarChart3, Map, Users, Home, AlertCircle, Settings } from 'lucide-react';

export default function AdminLayout() {
    const location = useLocation();

    const getPageHeader = () => {
        const path = location.pathname;


        if (path === '/admin' || path === '/admin/') {
            return { 
                title: 'Dashboard', 
                icon: BarChart3, 
                subtitle: 'Platform Overview & Statistics' 
            };
        }
        if (path.includes('/admin/agency')) {
            return { 
                title: 'Agency Management', 
                icon: Map, 
                subtitle: 'Manage Partner Agencies & Approvals' 
            };
        }
        if (path.includes('/admin/guides')) {
            return { 
                title: 'Tour Guides', 
                icon: Users, 
                subtitle: 'Verify & Manage Guide Applications' 
            };
        }
        if (path.includes('/admin/content')) {
            return { 
                title: 'Content Management', 
                icon: Home, 
                subtitle: 'Curate Destinations & Attractions' 
            };
        }
        if (path.includes('/admin/reports')) {
            return { 
                title: 'Reports & Analysis', 
                icon: AlertCircle, 
                subtitle: 'Safety Alerts & User Moderation' 
            };
        }
        if (path.includes('/admin/settings')) {
            return { 
                title: 'Settings', 
                icon: Settings, 
                subtitle: 'System Configuration & Preferences' 
            };
        }

        return { 
            title: 'Admin Portal', 
            icon: BarChart3, 
            subtitle: 'System Management' 
        };
    };

    const { title, icon: Icon, subtitle } = getPageHeader();

    return (
        <div className="flex h-screen bg-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
                    <div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                        </div>

                        <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
                                    <Icon className="w-8 h-8 text-white" />
                                </div>
                                
                                <div>
                                    <h1 className="text-3xl font-bold text-white tracking-tight">
                                        {title}
                                    </h1>
                                    <p className="text-cyan-100 text-sm font-medium mt-1 opacity-90">
                                        {subtitle}
                                    </p>
                                </div>
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