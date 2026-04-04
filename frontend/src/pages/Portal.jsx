import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Briefcase, ChevronRight, Globe2 } from 'lucide-react';
import BackgroundImage from '../assets/background_image.png';

const Portal = () => {
    return (
        <div className="relative w-full min-h-screen overflow-hidden transition-colors duration-300 zam-shell">

            <div
                className="absolute inset-0 z-0 w-full h-full bg-cover bg-center scale-105"
                style={{ backgroundImage: `url(${BackgroundImage})` }}
            />

            <div className="absolute inset-0 z-0 zam-vinta-overlay opacity-40" />
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/85 via-white/75 to-slate-50/95 dark:from-black/85 dark:via-black/70 dark:to-slate-900/95 transition-colors duration-300" />

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center">

                <div className="mb-8 animate-fade-in-down">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full zam-chip border border-slate-200 dark:border-white/20 shadow-lg transition-colors duration-300">
                        <Globe2 className="w-4 h-4 text-sky-700 dark:text-cyan-300" />
                        <span className="text-xs font-semibold tracking-wider text-sky-800 dark:text-cyan-100 uppercase transition-colors duration-300">
                            System Access
                        </span>
                    </div>
                </div>

                <h1 className="max-w-4xl text-5xl zam-title tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl drop-shadow-xl mb-6 transition-colors duration-300">
                    {/* <br /> */}
                    <span className="zam-accent-text">
                        Partner Portal
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-300 md:text-xl leading-relaxed mb-12 transition-colors duration-300">
                    Secure access for admins and partner agencies managing tours, bookings, and local experiences.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-2xl">

                    <Link to="/admin-signin" className="group relative overflow-hidden rounded-2xl zam-card backdrop-blur-md p-6 hover:bg-white/90 dark:hover:bg-slate-800/60 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/50 dark:from-cyan-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">Admin Portal</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Citywide management and approvals</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                    <Link to="/agency-signin" className="group relative overflow-hidden rounded-2xl zam-card backdrop-blur-md p-6 hover:bg-white/90 dark:hover:bg-slate-800/60 hover:border-orange-400/50 dark:hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/50 dark:from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                    <Briefcase size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-200 transition-colors">Agency Portal</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Operate tours, guides, and schedules</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-orange-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                </div>

                <div className="absolute bottom-6 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    © {new Date().getFullYear()} LocalLynk Zamboanga System. Secure Access.
                </div>
            </div>
        </div>
    );
};

export default Portal;