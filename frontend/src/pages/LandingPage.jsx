import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Map, Star, Shield, ArrowRight, Download, Globe2, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import AppPreview from '../assets/app_preview.jpg';
import Vinta from '../assets/vinta.jpg';
import Coastal from '../assets/coastal.jpg';
import Cultural from '../assets/cultural.jpg';
import Island from '../assets/island.jpg';

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    // This switch remembers if our mobile menu is open (true) or closed (false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const marqueeImages = [
        {
            src: Vinta,
            alt: 'Vinta-inspired seascape placeholder'
        },
        {
            src: Coastal,
            alt: 'Coastal destination placeholder'
        },
        {
            src: Cultural,
            alt: 'Cultural district placeholder'
        },
        {
            src: Island,
            alt: 'Island and beach placeholder'
        }
    ];

    const marqueeFacts = [
        'Vinta-inspired Journeys',
        'Chavacano Cultural Routes',
        'Sunset Walks at Paseo del Mar',
        'Fort Pilar Heritage Trails',
        'Sta. Cruz Pink Sand Escapes',
        'Curated Food and Market Tours'
    ];

    return (
        <div className="min-h-screen zam-shell text-slate-900 dark:text-slate-50 overflow-x-hidden transition-colors duration-300">
            <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo Area */}
                        <div className="flex items-center gap-2">
                            <Globe2 className="w-6 h-6 text-sky-700 dark:text-cyan-300" />
                            <span className="text-xl font-bold zam-title zam-accent-text">
                                LocaLynk
                            </span>
                        </div>

                        {/* Desktop Menu (Hidden on small screens) */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                to="/portal"
                                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-300 transition-colors"
                            >
                                Partner Portal
                            </Link>
                            <a
                                href="#download"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-full transition-all shadow-md hover:shadow-lg"
                                style={{ background: 'linear-gradient(90deg, var(--zam-sunset), var(--zam-coral))' }}
                            >
                                <Download size={16} />
                                Get the App
                            </a>

                            {/* Theme Toggle Button */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                                aria-label="Toggle Dark Mode"
                            >
                                {theme === 'dark' ? (
                                    <Sun size={20} className="text-amber-400" />
                                ) : (
                                    <Moon size={20} className="text-slate-600" />
                                )}
                            </button>
                        </div>

                        {/* Mobile Menu Controls (Visible only on small screens) */}
                        <div className="flex md:hidden items-center gap-2">
                            {/* We keep the theme toggle visible on mobile so it is easy to reach */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
                                aria-label="Toggle Dark Mode"
                            >
                                {theme === 'dark' ? (
                                    <Sun size={20} className="text-amber-400" />
                                ) : (
                                    <Moon size={20} className="text-slate-600" />
                                )}
                            </button>

                            {/* Hamburger Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown Drawer */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg px-4 py-4 flex flex-col gap-4">
                        <Link
                            to="/portal"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-base font-semibold text-slate-700 dark:text-slate-300 text-center py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                        >
                            Partner Portal
                        </Link>
                        <a
                            href="#download"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-base font-bold text-white rounded-full transition-all shadow-md"
                            style={{ background: 'linear-gradient(90deg, var(--zam-sunset), var(--zam-coral))' }}
                        >
                            <Download size={20} />
                            Get the App
                        </a>
                    </div>
                )}
            </nav>

            <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden zam-section-wave">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 zam-vinta-overlay opacity-65" />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-cyan-50/70 to-blue-100/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">

                        <div className="lg:col-span-7 text-center lg:text-left mb-16 lg:mb-0 zam-fade-up">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full zam-chip text-cyan-700 dark:text-cyan-200 mb-6 font-semibold text-sm transition-colors duration-300">
                                <Star size={16} />
                                My Friendly Local Guide: Zamboanga Edition
                            </div>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl zam-title tracking-tight mb-6 text-slate-900 dark:text-white">
                                Explore Zamboanga <br className="hidden lg:block" />
                                <span className="zam-accent-text">
                                    with Vinta spirit
                                </span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0 transition-colors duration-300">
                                Connect with trusted guides, discover iconic heritage, and book vibrant coastal adventures inspired by Zamboanga's colorful Vinta culture.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <a href="#download" className="w-full sm:w-auto px-8 py-4 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg, var(--zam-sea), var(--zam-coral))' }}>
                                    <Smartphone size={24} />
                                    Download Now
                                </a>
                                <Link to="/portal" className="w-full sm:w-auto px-8 py-4 bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all shadow-sm flex items-center justify-center gap-2">
                                    Become a Partner
                                    <ArrowRight size={20} />
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-5 relative zam-fade-up" style={{ animationDelay: '120ms' }}>
                            {/* Adjusted widths to be max-width responsive so it shrinks nicely on tiny screens */}
                            <div className="relative mx-auto w-full max-w-[290px] sm:max-w-[340px] lg:max-w-[360px]">
                                <div className="absolute -top-8 -right-4 sm:-right-7 p-3 text-xs font-bold text-white rounded-xl shadow-xl z-20" style={{ background: 'linear-gradient(90deg, var(--zam-sunset), var(--zam-coral))' }}>
                                    Vinta Vibes
                                </div>

                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-300 to-orange-400 dark:from-cyan-600/40 dark:to-orange-600/40 rounded-full blur-3xl opacity-30 z-0 transition-colors duration-300" />

                                <div className="relative z-10 bg-slate-900 dark:bg-black rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-900 dark:border-slate-800 transition-colors duration-300">
                                    <div className="overflow-hidden rounded-[2.25rem] bg-white dark:bg-slate-900 aspect-[9/19.5] relative">
                                        <img
                                            src={AppPreview}
                                            alt="Zamboanga LocaLynk app preview placeholder"
                                            className="w-full h-full object-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <section id="gallery" className="py-8 sm:py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl zam-title text-slate-900 dark:text-white">Zamboanga Visual Stream</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-300">Endless highlights inspired by city colors, coastlines, and culture.</p>
                    </div>

                    <div className="zam-marquee rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40">
                        <div className="zam-marquee-track py-4">
                            {[...marqueeImages, ...marqueeImages].map((item, index) => (
                                <div key={`${item.alt}-${index}`} className="mx-3 w-[260px] sm:w-[320px] shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 zam-card">
                                    <img src={item.src} alt={item.alt} className="h-40 w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="zam-marquee rounded-full border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40">
                        <div className="zam-marquee-track zam-marquee-fast py-3">
                            {[...marqueeFacts, ...marqueeFacts].map((fact, index) => (
                                <div key={`${fact}-${index}`} className="mx-2 rounded-full px-4 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-100" style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}>
                                    {fact}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white/65 dark:bg-slate-900/70 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl zam-title text-slate-900 dark:text-white sm:text-4xl transition-colors duration-300">Why Choose LocaLynk?</h2>
                        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 transition-colors duration-300">Built to bring local stories, trusted guides, and smooth bookings in one place.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="text-center p-6 rounded-2xl zam-card transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Map size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Local-First Experiences</h3>
                            <p className="text-slate-600 dark:text-slate-300 transition-colors duration-300">From Vinta-inspired bay walks to cultural districts, experience routes curated by people who actually live there.</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl zam-card transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Verified Partner Network</h3>
                            <p className="text-slate-600 dark:text-slate-300 transition-colors duration-300">Admin-reviewed agencies and guides give tourists trusted options while keeping local businesses visible.</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl zam-card transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Fast Booking Flow</h3>
                            <p className="text-slate-600 dark:text-slate-300 transition-colors duration-300">Book tours, chat, and manage payments with a clear flow tailored for city explorers and agencies.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="download" className="py-24 relative overflow-hidden text-white transition-colors duration-300" style={{ background: 'linear-gradient(125deg, var(--zam-deep-sea), #082f49)' }}>
                <div className="absolute inset-0 zam-vinta-overlay opacity-20" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl sm:text-5xl zam-title mb-6">Ready to explore Zamboanga?</h2>
                    <p className="text-xl text-slate-200 mb-10 max-w-2xl mx-auto transition-colors duration-300">
                        Download the app and unlock guided experiences with a true Zamboanga City identity.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="https://expo.dev/artifacts/eas/jP5dZEHvSuWwQCj5GDUbNN.apk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                        >
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a1.981 1.981 0 0 1-.585-1.42V3.234c0-.533.208-1.036.584-1.42zM15.207 13.414l3.415-3.414-3.415-3.414L4.316 2.52l10.891 10.894zM16.621 14.828l4.414-4.414a2 2 0 0 0 0-2.828l-4.414-4.414L5.73 1.815l10.891 10.893z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs font-normal leading-tight">Get The App</div>
                                <div className="text-xl leading-tight">Download Here</div>
                            </div>
                        </a>
                    </div>
                </div>
            </section>

            <footer className="bg-slate-50/90 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Globe2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">LocaLynk System</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
                        © {new Date().getFullYear()} My Friendly Local Guide. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <a href="#" className="hover:text-orange-500 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-orange-500 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;