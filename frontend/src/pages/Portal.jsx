import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Briefcase, ChevronRight, Globe2 } from 'lucide-react';
import BackgroundImage from '../assets/background_image.png';

const Portal = () => {
    return (
        <div className="relative w-full min-h-screen overflow-hidden font-sans transition-colors duration-300">

            <div
                className="absolute inset-0 z-0 w-full h-full bg-cover bg-center scale-105"
                style={{ backgroundImage: `url(${BackgroundImage})` }}
            />

            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/80 via-white/70 to-slate-50/95 dark:from-black/80 dark:via-black/60 dark:to-slate-900/95 transition-colors duration-300" />

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center">

                <div className="mb-8 animate-fade-in-down">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/20 shadow-lg transition-colors duration-300">
                        <Globe2 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                        <span className="text-xs font-semibold tracking-wider text-blue-700 dark:text-cyan-100 uppercase transition-colors duration-300">
                            System Access
                        </span>
                    </div>
                </div>

                {/* Main Heading */}
                <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl drop-shadow-xl mb-6 transition-colors duration-300">
                    LocalLynk <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-blue-600">
                        Partner Portal
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-300 md:text-xl leading-relaxed mb-12 transition-colors duration-300">
                    Secure access for platform administrators and verified partner agencies to manage operations and bookings.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-2xl">

                    <Link to="/admin-signin" className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-white/10 p-6 hover:bg-white/90 dark:hover:bg-slate-800/60 hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 dark:from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">Admin Portal</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">System management & oversight</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                    <Link to="/agency-signin" className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-white/10 p-6 hover:bg-white/90 dark:hover:bg-slate-800/60 hover:border-green-400/50 dark:hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 dark:from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                                    <Briefcase size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-200 transition-colors">Agency Portal</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage guides & bookings</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                </div>

                <div className="absolute bottom-6 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    © {new Date().getFullYear()} LocalLynk Platform. Secure Access.
                </div>
            </div>
        </div>
    );
};

export default Portal;