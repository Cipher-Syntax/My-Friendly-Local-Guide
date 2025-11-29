import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Briefcase, ChevronRight, Globe2 } from 'lucide-react';
import BackgroundImage from '../assets/background_image.png';

const LandingPage = () => {
    return (
        <div className="relative w-full min-h-screen overflow-hidden font-sans">
            
            {/* 1. Background Image with Parallax-like feel */}
            <div 
                className="absolute inset-0 z-0 w-full h-full bg-cover bg-center scale-105"
                style={{ backgroundImage: `url(${BackgroundImage})` }}
            />

            {/* 2. Professional Gradient Overlay */}
            {/* This ensures text is readable regardless of the image brightness */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900/90" />

            {/* 3. Main Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center">
                
                {/* Brand Badge (Optional but looks pro) */}
                <div className="mb-8 animate-fade-in-down">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                        <Globe2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold tracking-wider text-cyan-100 uppercase">
                            Official Portal
                        </span>
                    </div>
                </div>

                {/* Hero Headline */}
                <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl drop-shadow-xl mb-6">
                    Discover with <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        Locals
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="max-w-2xl mx-auto text-lg text-slate-300 md:text-xl leading-relaxed mb-12">
                    Your gateway to authentic journeys. Connect with verified local guides and agencies to experience the world like never before.
                </p>

                {/* --- ACTION CARDS (Instead of just buttons) --- */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-2xl">
                    
                    {/* Admin Card */}
                    <Link to="/admin-signin" className="group relative overflow-hidden rounded-2xl bg-slate-800/40 backdrop-blur-md border border-white/10 p-6 hover:bg-slate-800/60 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">Admin Portal</h3>
                                    <p className="text-xs text-slate-400">System management & oversight</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                    {/* Agency Card */}
                    <Link to="/agency-signin" className="group relative overflow-hidden rounded-2xl bg-slate-800/40 backdrop-blur-md border border-white/10 p-6 hover:bg-slate-800/60 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                                    <Briefcase size={28} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white group-hover:text-green-200 transition-colors">Agency Portal</h3>
                                    <p className="text-xs text-slate-400">Manage guides & bookings</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </Link>

                </div>

                {/* Footer / Copyright */}
                <div className="absolute bottom-6 text-xs text-slate-500">
                    © {new Date().getFullYear()} LocalLynk Platform. Secure Access.
                </div>
            </div>
        </div>
    );
};

export default LandingPage;