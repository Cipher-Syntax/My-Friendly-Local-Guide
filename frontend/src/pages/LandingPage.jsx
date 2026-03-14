import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Map, Star, Shield, ArrowRight, Download, Globe2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import AppPreview from '../assets/app_preview.jpg';

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden transition-colors duration-300">
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <Globe2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500">
                                LocalLynk
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                to="/portal"
                                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Partner Portal
                            </Link>
                            <a
                                href="#download"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 dark:bg-blue-500 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
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
                    </div>
                </div>
            </nav>

            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-100/50 dark:from-slate-900 dark:to-slate-800/50 z-0 transition-colors duration-300" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">

                        <div className="lg:col-span-6 text-center lg:text-left mb-16 lg:mb-0">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 mb-6 font-semibold text-sm transition-colors duration-300">
                                <Star size={16} />
                                My Friendly Local Guide
                            </div>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
                                Discover the city <br className="hidden lg:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500">
                                    like a true local
                                </span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 transition-colors duration-300">
                                Connect with verified local guides, book authentic experiences, and explore hidden gems. Your ultimate travel companion is right in your pocket.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <a href="#download" className="w-full sm:w-auto px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2">
                                    <Smartphone size={24} />
                                    Download Now
                                </a>
                                <Link to="/portal" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-200 dark:hover:border-blue-500/50 transition-all shadow-sm flex items-center justify-center gap-2">
                                    Become a Partner
                                    <ArrowRight size={20} />
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-6 relative">
                            <div className="relative mx-auto w-[280px] sm:w-[320px] lg:w-[350px]">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-300 to-blue-500 dark:from-cyan-600/40 dark:to-blue-600/40 rounded-full blur-3xl opacity-30 z-0 animate-pulse transition-colors duration-300" />

                                <div className="relative z-10 bg-slate-900 dark:bg-black rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-900 dark:border-slate-800 transition-colors duration-300">
                                    <div className="overflow-hidden rounded-[2.25rem] bg-white dark:bg-slate-900 aspect-[9/19.5] relative">
                                        <img
                                            src={AppPreview}
                                            alt="LocalLynk App Preview"
                                            className="w-full h-full object-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl transition-colors duration-300">Why choose LocalLynk?</h2>
                        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 transition-colors duration-300">Experience travel differently with our unique platform features.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-cyan-900/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Map size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Authentic Experiences</h3>
                            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">Go beyond the tourist traps. Discover places only the locals know about through custom-curated tours.</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Verified Local Guides</h3>
                            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">Safety and quality guaranteed. All our partner agencies and freelance guides undergo a strict verification process.</p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-indigo-900/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Smartphone size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white transition-colors duration-300">Seamless Booking</h3>
                            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">Plan your entire itinerary, chat with guides, and manage payments all within our easy-to-use mobile application.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="download" className="py-24 relative overflow-hidden bg-slate-900 dark:bg-slate-950 text-white transition-colors duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 dark:from-blue-900/20 via-slate-900 dark:via-slate-950 to-black z-0 transition-colors duration-300" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to start exploring?</h2>
                    <p className="text-xl text-slate-300 dark:text-slate-400 mb-10 max-w-2xl mx-auto transition-colors duration-300">
                        Get the LocalLynk app today and unlock thousands of authentic local experiences at your fingertips.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="https://expo.dev/artifacts/eas/meyQJ61U5qqnpL9PhUpf1Q.apk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                        >
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a1.981 1.981 0 0 1-.585-1.42V3.234c0-.533.208-1.036.584-1.42zM15.207 13.414l3.415-3.414-3.415-3.414L4.316 2.52l10.891 10.894zM16.621 14.828l4.414-4.414a2 2 0 0 0 0-2.828l-4.414-4.414L5.73 1.815l10.891 10.893z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-xs font-normal leading-tight">Get The App</div> {/* GEIT IT ON */}
                                <div className="text-xl leading-tight">Download Here</div> {/* Google Play */}
                            </div>
                        </a>
                    </div>
                </div>
            </section>

            <footer className="bg-slate-50 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Globe2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">LocalLynk</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
                        © {new Date().getFullYear()} My Friendly Local Guide. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;