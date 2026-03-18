import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">

            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-md w-full text-center space-y-8 relative z-10">
                {/* Illustration / Icon Area */}
                <div className="relative flex justify-center items-center mb-8">
                    <div className="absolute w-32 h-32 bg-cyan-500/20 dark:bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative bg-white dark:bg-slate-800 p-6 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 animate-[bounce_3s_ease-in-out_infinite]">
                        <Compass className="w-16 h-16 text-cyan-500" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-blue-600 tracking-tight">
                        404
                    </h1>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                        Looks like you're lost!
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                        We can't seem to find the destination you're looking for. The page might have been moved, deleted, or perhaps it never existed.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="w-full sm:w-auto px-6 py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                        <Home className="w-5 h-5" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;