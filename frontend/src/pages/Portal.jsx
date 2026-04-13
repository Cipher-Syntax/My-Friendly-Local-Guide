import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Briefcase, ChevronRight, Globe2, ArrowLeft } from 'lucide-react';
import BackgroundImage from '../assets/background_image.png';

const portalOptions = [
    {
        id: 'admin',
        destination: '/admin-signin',
        roleLabel: 'City Admin Access',
        title: 'Admin Portal',
        description: 'Handle approvals, compliance checks, and system-level tourism operations in one secure workspace.',
        icon: ShieldCheck,
        highlights: [
            'Review agency verification and activation requests',
            'Track payments, disputes, and booking escalations',
            'Monitor analytics, incidents, and platform health'
        ],
        quickActions: [
            { label: 'Review Agencies', to: '/admin-signin' },
            { label: 'View Payments', to: '/admin-signin' }
        ],
        trustNote: 'Authorized personnel only',
        badgeClasses: 'text-cyan-700 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/40',
        iconWrapClasses: 'bg-cyan-100 dark:bg-cyan-500/20',
        iconClasses: 'text-cyan-700 dark:text-cyan-200',
        overlayClasses: 'from-cyan-100/70 via-sky-100/50 to-transparent dark:from-cyan-500/20 dark:via-sky-500/10 dark:to-transparent',
        borderHoverClasses: 'hover:border-cyan-400/60 dark:hover:border-cyan-400/60',
        quickActionClasses: 'hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-200',
        ctaClasses: 'text-cyan-700 dark:text-cyan-200 hover:text-cyan-800 dark:hover:text-white',
        dotClasses: 'bg-cyan-500'
    },
    {
        id: 'agency',
        destination: '/agency-signin',
        roleLabel: 'Partner Agency Access',
        title: 'Agency Portal',
        description: 'Run bookings, guide assignments, and daily tour operations for your local travel team.',
        icon: Briefcase,
        highlights: [
            'Manage incoming booking requests and schedules',
            'Assign guides and monitor active itineraries',
            'Handle traveler messages and package updates'
        ],
        quickActions: [
            { label: 'Open Dashboard', to: '/agency-signin' },
            { label: 'Create Package', to: '/agency-signin' }
        ],
        trustNote: 'For registered and verified agencies',
        badgeClasses: 'text-orange-700 dark:text-orange-200 bg-orange-50 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/40',
        iconWrapClasses: 'bg-orange-100 dark:bg-orange-500/20',
        iconClasses: 'text-orange-700 dark:text-orange-200',
        overlayClasses: 'from-orange-100/75 via-amber-100/50 to-transparent dark:from-orange-500/20 dark:via-amber-500/10 dark:to-transparent',
        borderHoverClasses: 'hover:border-orange-400/60 dark:hover:border-orange-400/60',
        quickActionClasses: 'hover:border-orange-300 dark:hover:border-orange-500/40 hover:text-orange-700 dark:hover:text-orange-200',
        ctaClasses: 'text-orange-700 dark:text-orange-200 hover:text-orange-800 dark:hover:text-white',
        dotClasses: 'bg-orange-500'
    }
];

const Portal = () => {
    return (
        <div className="relative w-full min-h-[100dvh] overflow-hidden transition-colors duration-300 zam-shell">

            <Link
                to="/"
                className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/85 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-semibold">Back to Landing Page</span>
            </Link>

            <div
                className="absolute inset-0 z-0 w-full h-full bg-cover bg-center scale-105"
                style={{ backgroundImage: `url(${BackgroundImage})` }}
            />

            <div className="absolute inset-0 z-0 zam-vinta-overlay opacity-40" />
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/85 via-white/75 to-slate-50/95 dark:from-black/85 dark:via-black/70 dark:to-slate-900/95 transition-colors duration-300" />

            <div className="relative z-10 flex flex-col items-center min-h-[100dvh] px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">

                <div className="mb-8 zam-fade-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full zam-chip border border-slate-200 dark:border-white/20 shadow-lg transition-colors duration-300">
                        <Globe2 className="w-4 h-4 text-sky-700 dark:text-cyan-300" />
                        <span className="text-xs font-semibold tracking-wider text-sky-800 dark:text-cyan-100 uppercase transition-colors duration-300">
                            System Access
                        </span>
                    </div>
                </div>

                <h1 className="max-w-4xl text-5xl zam-title tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl drop-shadow-xl mb-6 transition-colors duration-300">
                    <span className="zam-accent-text">
                        Partner Portal
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-300 md:text-xl leading-relaxed mb-12 transition-colors duration-300">
                    Secure access for admins and partner agencies managing tours, bookings, and local experiences.
                </p>

                <p className="max-w-3xl text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-8">
                    Need help choosing? Use <span className="font-bold text-slate-900 dark:text-white">Admin Portal</span> for governance and approvals, or <span className="font-bold text-slate-900 dark:text-white">Agency Portal</span> for day-to-day operations and bookings.
                </p>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full max-w-6xl">
                    {portalOptions.map((option, index) => {
                        const Icon = option.icon;

                        return (
                            <article
                                key={option.id}
                                className={`group relative overflow-hidden rounded-3xl zam-card backdrop-blur-md p-6 sm:p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 dark:hover:bg-slate-800/60 shadow-xl ${option.borderHoverClasses} zam-fade-up`}
                                style={{ animationDelay: `${index * 120}ms` }}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${option.overlayClasses} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                <div className="relative z-10 flex h-full flex-col">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${option.badgeClasses}`}>
                                            {option.roleLabel}
                                        </span>
                                        <div className={`p-3 rounded-xl transition-colors duration-300 ${option.iconWrapClasses}`}>
                                            <Icon size={24} className={option.iconClasses} />
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                            {option.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {option.description}
                                        </p>
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/40 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">What You Can Do</p>
                                        <ul className="mt-3 space-y-2">
                                            {option.highlights.map((item) => (
                                                <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${option.dotClasses}`} />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        {option.quickActions.map((action) => (
                                            <Link
                                                key={action.label}
                                                to={action.to}
                                                className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/55 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors ${option.quickActionClasses}`}
                                            >
                                                {action.label}
                                            </Link>
                                        ))}
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {option.trustNote}
                                        </p>
                                        <Link
                                            to={option.destination}
                                            className={`inline-flex items-center gap-1 text-sm font-bold transition-colors ${option.ctaClasses}`}
                                        >
                                            Enter
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-10 space-y-1 text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        Need assistance choosing access? Contact your city tourism platform administrator.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">
                        © {new Date().getFullYear()} LocalLynk Zamboanga System. Secure Access.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Portal;