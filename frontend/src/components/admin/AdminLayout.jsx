import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { BarChart3, Map, Users, Home, AlertCircle, Settings, Calendar, FileText } from 'lucide-react';

export default function AdminLayout() {
    const location = useLocation();

    const getPageHeader = () => {
        const path = location.pathname;

        if (path === '/admin' || path === '/admin/') {
            return {
                title: 'Dashboard',
                icon: BarChart3,
                subtitle: 'System Overview & Statistics'
            };
        }
        if (path.includes('/admin/users')) {
            return {
                title: 'User Management',
                icon: Users,
                subtitle: 'Manage Tourists, Guides, and Agencies'
            };
        }
        if (path.includes('/admin/bookings')) {
            return {
                title: 'Global Booking Registry',
                icon: Calendar,
                subtitle: 'Citywide Oversight & Management'
            };
        }
        if (path.includes('/admin/agency')) {
            return {
                title: 'Agency Approvals',
                icon: Map,
                subtitle: 'Manage Partner Agency Applications'
            };
        }
        if (path.includes('/admin/guides')) {
            return {
                title: 'Guide Applications',
                icon: FileText,
                subtitle: 'Verify & Manage Pending Applications'
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
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-10 transition-colors duration-300">
                    <div className="relative h-48 overflow-hidden" style={{ background: 'linear-gradient(120deg, var(--zam-deep-sea), var(--zam-sea))' }}>
                        <div className="absolute inset-0 zam-vinta-overlay opacity-20"></div>
                        <div className="absolute inset-0 opacity-30">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-300 rounded-full blur-3xl"></div>
                        </div>

                        <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
                                    <Icon className="w-8 h-8 text-white" />
                                </div>

                                <div>
                                    <h1 className="text-3xl zam-title text-white tracking-tight">
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

                <div className="flex-1 overflow-auto p-8 scroll-smooth" style={{ scrollbarWidth: "thin" }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}