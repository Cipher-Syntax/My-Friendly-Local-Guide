import React, { useState, useEffect } from 'react';
import { Map, Home, Users, BarChart3, AlertCircle, UserCheck, Globe, Flag } from 'lucide-react';
import api from '../../api/api'; 
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        agencies: [],
        guides: [],
        reports: [],
        destinations: [],
        users: [] 
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const [agenciesRes, guidesRes, reportsRes, destinationsRes] = await Promise.all([
                    api.get('api/agencies/'), 
                    api.get('api/admin/guide-reviews/'), 
                    api.get('api/review/'), 
                    api.get('api/destinations/'), 
                ]);

                setStats({
                    agencies: agenciesRes.data || [],
                    guides: guidesRes.data.results || guidesRes.data || [], 
                    reports: reportsRes.data || [],
                    destinations: destinationsRes.data || [],
                    users: []
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    
    const totalAgencies = stats.agencies.length;

    const approvedAgencies = stats.agencies.length; 
    
    const totalGuides = stats.guides.length;
    const pendingGuides = stats.guides.filter(g => g.guide_approved === false || g.status === 'Pending').length;
    const verifiedGuides = stats.guides.filter(g => g.guide_approved === true).length;

    const totalReports = stats.reports.length;

    const pendingReports = totalReports; 

    const totalDestinations = stats.destinations.length;
    const featuredDestinations = stats.destinations.filter(d => d.is_featured).length;

    const restrictedUsersCount = stats.reports.filter(r => r.reported_user_is_active === false).length;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Total Agencies</p>
                            <p className="text-3xl font-bold text-white mt-2">{totalAgencies}</p>
                        </div>
                        <Home className="w-10 h-10 text-blue-400 opacity-20" />
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Total Guides</p>
                            <p className="text-3xl font-bold text-white mt-2">{totalGuides}</p>
                        </div>
                        <Users className="w-10 h-10 text-green-400 opacity-20" />
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Destinations</p>
                            <p className="text-3xl font-bold text-white mt-2">{totalDestinations}</p>
                        </div>
                        <Map className="w-10 h-10 text-purple-400 opacity-20" />
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Active Reports</p>
                            <p className="text-3xl font-bold text-white mt-2">{totalReports}</p>
                        </div>
                        <Flag className="w-10 h-10 text-red-400 opacity-20" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-cyan-400" />
                        Status Overview
                    </h3>
                    <div className="space-y-6">
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <p className="text-slate-400 text-sm">Pending Guide Applications</p>
                                <p className="text-white font-semibold">{pendingGuides} / {totalGuides}</p>
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full"
                                    style={{ width: totalGuides > 0 ? `${(pendingGuides / totalGuides) * 100}%` : '0%' }}
                                ></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <p className="text-slate-400 text-sm">Verified Guides</p>
                                <p className="text-white font-semibold">{verifiedGuides} / {totalGuides}</p>
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                    style={{ width: totalGuides > 0 ? `${(verifiedGuides / totalGuides) * 100}%` : '0%' }}
                                ></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <p className="text-slate-400 text-sm">Restricted Users (Reported)</p>
                                <p className="text-white font-semibold">{restrictedUsersCount}</p>
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
                                    style={{ width: totalReports > 0 ? `${(restrictedUsersCount / totalReports) * 100}%` : '0%' }}
                                ></div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-400" />
                        Content Stats
                    </h3>
                    <div className="space-y-6">
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <p className="text-slate-400 text-sm">Featured Destinations</p>
                                <p className="text-white font-semibold">{featuredDestinations} / {totalDestinations}</p>
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full"
                                    style={{ width: totalDestinations > 0 ? `${(featuredDestinations / totalDestinations) * 100}%` : '0%' }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-4 border-t border-slate-700/50 mt-4">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Total Content</p>
                                <p className="text-white text-xl font-bold mt-1">{totalDestinations} Destinations</p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                                <Map className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-4 border-t border-slate-700/50">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider">Partners</p>
                                <p className="text-white text-xl font-bold mt-1">{totalAgencies} Agencies</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                <Home className="w-6 h-6" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}