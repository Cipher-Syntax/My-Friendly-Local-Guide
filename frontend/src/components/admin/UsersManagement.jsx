import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Users, ShieldCheck, Filter, MoreHorizontal, Eye, UserX, UserCheck, Trash2, X } from 'lucide-react';
import api from '../../api/api';

const ROLE_TOURIST = 'tourist';
const ROLE_GUIDE = 'guide';
const ROLE_PENDING_GUIDE = 'pending_guide';
const ROLE_AGENCY = 'agency';
const ROLE_PENDING_AGENCY = 'pending_agency';
const ROLE_ADMIN = 'admin';
const ROLE_ALL = 'all';

const getAgencyStatus = (user) => String(user?.agency_profile?.status || '').toLowerCase();
const hasPendingGuideApplication = (user) => {
    if (typeof user?.has_pending_application === 'boolean') {
        return user.has_pending_application;
    }

    const isReviewed = user?.guide_application?.is_reviewed;
    if (typeof isReviewed === 'boolean') {
        return !isReviewed;
    }

    return false;
};

const getUserRole = (user) => {
    if (user.is_superuser) return ROLE_ADMIN;
    if (user.agency_profile || user.is_staff) {
        const agencyStatus = getAgencyStatus(user);
        if (!user.agency_profile || agencyStatus === 'pending') return ROLE_PENDING_AGENCY;
        return ROLE_AGENCY;
    }
    if (user.is_local_guide && !user.guide_approved && hasPendingGuideApplication(user)) return ROLE_PENDING_GUIDE;
    if (user.is_local_guide && user.guide_approved) return ROLE_GUIDE;
    return ROLE_TOURIST;
};

const normalizeArrayResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
};

const formatPackageType = (tourPackage) => {
    if (tourPackage?.duration) return tourPackage.duration;
    if (tourPackage?.duration_days) return `${tourPackage.duration_days}-day`;
    return 'N/A';
};

const getPackageDurationDays = (tourPackage) => {
    const explicitDays = Number.parseInt(tourPackage?.duration_days, 10);
    if (Number.isFinite(explicitDays) && explicitDays > 0) return explicitDays;

    const durationText = String(tourPackage?.duration || '');
    const matchedDays = durationText.match(/\d+/);
    if (matchedDays?.[0]) {
        const parsedDays = Number.parseInt(matchedDays[0], 10);
        if (Number.isFinite(parsedDays) && parsedDays > 0) return parsedDays;
    }

    return 1;
};

const parseTimelineInput = (timelineInput) => {
    if (Array.isArray(timelineInput)) return timelineInput;
    if (typeof timelineInput !== 'string') return [];

    try {
        const parsed = JSON.parse(timelineInput);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const extractTimelineLabels = (entry) => {
    const labels = [];
    const pushLabel = (value) => {
        if (typeof value !== 'string') return;
        const normalized = value.trim();
        if (normalized) labels.push(normalized);
    };

    if (typeof entry === 'string') {
        pushLabel(entry);
        return labels;
    }

    if (!entry || typeof entry !== 'object') return labels;

    if (Array.isArray(entry.activities)) {
        entry.activities.forEach((item) => {
            if (typeof item === 'string') {
                pushLabel(item);
            } else if (item && typeof item === 'object') {
                pushLabel(item.activityName);
                pushLabel(item.title);
                pushLabel(item.name);
                pushLabel(item.activity);
                pushLabel(item.location);
            }
        });
    }

    pushLabel(entry.activityName);
    pushLabel(entry.title);
    pushLabel(entry.name);
    pushLabel(entry.activity);
    pushLabel(entry.location);

    return labels;
};

const getTimelineByDay = (tourPackage) => {
    const timelineEntries = parseTimelineInput(tourPackage?.itinerary_timeline);
    const timelineByDay = new Map();

    timelineEntries.forEach((entry) => {
        const parsedDay = Number.parseInt(entry?.day, 10);
        const day = Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : 1;

        const labels = extractTimelineLabels(entry);
        if (!timelineByDay.has(day)) {
            timelineByDay.set(day, []);
        }

        labels.forEach((label) => {
            timelineByDay.get(day).push(label);
        });
    });

    timelineByDay.forEach((labels, day) => {
        timelineByDay.set(day, [...new Set(labels)]);
    });

    return timelineByDay;
};

const getTimelineSearchText = (tourPackage) => {
    const timelineByDay = getTimelineByDay(tourPackage);
    return Array.from(timelineByDay.values()).flat();
};

const getRoleBadge = (user) => {
    const role = getUserRole(user);
    if (role === ROLE_ADMIN) {
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Admin</span>;
    }
    if (role === ROLE_AGENCY) {
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">Agency</span>;
    }
    if (role === ROLE_PENDING_AGENCY) {
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">Pending Agency</span>;
    }
    if (role === ROLE_GUIDE) {
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">Tour Guide</span>;
    }
    if (role === ROLE_PENDING_GUIDE) {
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">Pending Guide</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30">Tourist</span>;
};

function RoleFilterButtons({ activeRole, onChange }) {
    const roleButtons = [
        { key: ROLE_ALL, label: 'All' },
        { key: ROLE_TOURIST, label: 'Tourists' },
        { key: ROLE_GUIDE, label: 'Tour Guides' },
        { key: ROLE_PENDING_GUIDE, label: 'Pending Guides' },
        { key: ROLE_AGENCY, label: 'Agencies' },
        { key: ROLE_PENDING_AGENCY, label: 'Pending Agencies' },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {roleButtons.map((role) => {
                const isActive = activeRole === role.key;
                return (
                    <button
                        key={role.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onChange(role.key)}
                        className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                            isActive
                                ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/20'
                                : 'bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {role.label}
                    </button>
                );
            })}
        </div>
    );
}

function UserActionMenu({ user, onView, onDeactivate, onReactivate, onDelete }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const role = getUserRole(user);
    const canViewDetails = role === ROLE_GUIDE || role === ROLE_PENDING_GUIDE || role === ROLE_AGENCY || role === ROLE_PENDING_AGENCY;

    useEffect(() => {
        if (!open) return undefined;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const closeThen = (handler) => () => {
        setOpen(false);
        handler(user);
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Open actions for ${user.username}`}
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
                >
                    {canViewDetails && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={closeThen(onView)}
                            className="w-full px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            View Profile / Details
                        </button>
                    )}
                    {user.is_active ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={closeThen(onDeactivate)}
                            className="w-full px-3 py-2.5 text-left text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2"
                        >
                            <UserX className="w-4 h-4" />
                            Deactivate Account
                        </button>
                    ) : (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={closeThen(onReactivate)}
                            className="w-full px-3 py-2.5 text-left text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center gap-2"
                        >
                            <UserCheck className="w-4 h-4" />
                            Reactivate Account
                        </button>
                    )}
                    <button
                        type="button"
                        role="menuitem"
                        onClick={closeThen(onDelete)}
                        className="w-full px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                    </button>
                </div>
            )}
        </div>
    );
}

function UserDetailModal({ isOpen, user, activeTab, onTabChange, onClose, loading, error, details }) {
    const [tourSearchTerm, setTourSearchTerm] = useState('');
    const [tourDestinationFilter, setTourDestinationFilter] = useState('All');
    const [accommodationSearchTerm, setAccommodationSearchTerm] = useState('');
    const [accommodationTypeFilter, setAccommodationTypeFilter] = useState('All');
    const [selectedTourDays, setSelectedTourDays] = useState({});

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        setTourSearchTerm('');
        setTourDestinationFilter('All');
        setAccommodationSearchTerm('');
        setAccommodationTypeFilter('All');
        setSelectedTourDays({});
    }, [isOpen, user?.id]);

    const role = user ? getUserRole(user) : ROLE_TOURIST;
    const roleLabel = role === ROLE_GUIDE
        ? 'Tour Guide'
        : role === ROLE_PENDING_GUIDE
            ? 'Pending Tour Guide'
            : role === ROLE_PENDING_AGENCY
                ? 'Pending Agency'
                : 'Agency';
    const tourPackages = details?.tourPackages || [];
    const accommodations = details?.accommodations || [];

    const destinationOptions = useMemo(() => {
        const uniqueDestinations = [...new Set(tourPackages.map((tourPackage) => tourPackage.destination_name).filter(Boolean))];
        return ['All', ...uniqueDestinations];
    }, [tourPackages]);

    const accommodationTypeOptions = useMemo(() => {
        const uniqueTypes = [...new Set(accommodations.map((accommodation) => accommodation.accommodation_type).filter(Boolean))];
        return ['All', ...uniqueTypes];
    }, [accommodations]);

    const filteredTourPackages = useMemo(() => {
        return tourPackages.filter((tourPackage) => {
            const searchableText = [
                tourPackage.name,
                tourPackage.destination_name,
                formatPackageType(tourPackage),
                ...(Array.isArray(tourPackage.stops) ? tourPackage.stops.map((stop) => stop?.name) : []),
                ...getTimelineSearchText(tourPackage),
            ].join(' ').toLowerCase();

            const matchesSearch = searchableText.includes(tourSearchTerm.toLowerCase());
            const matchesDestination = tourDestinationFilter === 'All' || tourPackage.destination_name === tourDestinationFilter;
            return matchesSearch && matchesDestination;
        });
    }, [tourPackages, tourSearchTerm, tourDestinationFilter]);

    const filteredAccommodations = useMemo(() => {
        return accommodations.filter((accommodation) => {
            const searchableText = [
                accommodation.title,
                accommodation.location,
                accommodation.accommodation_type,
            ].join(' ').toLowerCase();

            const matchesSearch = searchableText.includes(accommodationSearchTerm.toLowerCase());
            const matchesType = accommodationTypeFilter === 'All' || accommodation.accommodation_type === accommodationTypeFilter;
            return matchesSearch && matchesType;
        });
    }, [accommodations, accommodationSearchTerm, accommodationTypeFilter]);

    if (!isOpen || !user) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
                <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.username} Details</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel} data snapshot</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Close details"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 pt-4">
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => onTabChange('tourPackages')}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                activeTab === 'tourPackages'
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                            }`}
                        >
                            Tour Packages
                        </button>
                        <button
                            type="button"
                            onClick={() => onTabChange('accommodations')}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                activeTab === 'accommodations'
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                            }`}
                        >
                            Accommodation
                        </button>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto max-h-[65vh]">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            {activeTab === 'tourPackages' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="relative md:col-span-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={tourSearchTerm}
                                                onChange={(event) => setTourSearchTerm(event.target.value)}
                                                placeholder="Search package, destination, or stop..."
                                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <select
                                            value={tourDestinationFilter}
                                            onChange={(event) => setTourDestinationFilter(event.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-white"
                                        >
                                            {destinationOptions.map((destination) => (
                                                <option key={destination} value={destination}>{destination}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {filteredTourPackages.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No tour packages found for this user.</p>
                                    ) : (
                                        filteredTourPackages.map((tourPackage) => {
                                            const durationDays = getPackageDurationDays(tourPackage);
                                            const sortedStops = Array.isArray(tourPackage.stops)
                                                ? [...tourPackage.stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                                : [];
                                            const timelineByDay = getTimelineByDay(tourPackage);
                                            const selectedDay = Math.min(
                                                selectedTourDays[tourPackage.id] || 1,
                                                durationDays
                                            );
                                            const selectedDayTimeline = timelineByDay.get(selectedDay) || [];

                                            return (
                                                <div key={tourPackage.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">{tourPackage.name}</h4>
                                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {formatPackageType(tourPackage)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                                        Destination: <span className="font-medium">{tourPackage.destination_name || 'N/A'}</span>
                                                    </p>
                                                    <div className="mt-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Day Itinerary View</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Array.from({ length: durationDays }, (_, index) => {
                                                                    const day = index + 1;
                                                                    const isActive = selectedDay === day;
                                                                    return (
                                                                        <button
                                                                            key={`${tourPackage.id}-day-${day}`}
                                                                            type="button"
                                                                            onClick={() => setSelectedTourDays((prev) => ({ ...prev, [tourPackage.id]: day }))}
                                                                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                                                                isActive
                                                                                    ? 'bg-cyan-500 text-white border-cyan-500'
                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                            }`}
                                                                        >
                                                                            Day {day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-3">
                                                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Day {selectedDay} Activities</p>
                                                            {selectedDayTimeline.length > 0 ? (
                                                                <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200 list-disc pl-5">
                                                                    {selectedDayTimeline.map((activity, index) => (
                                                                        <li key={`${tourPackage.id}-day-${selectedDay}-activity-${index}`}>{activity}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No activities scheduled for Day {selectedDay}.</p>
                                                            )}
                                                        </div>

                                                        <p className="mt-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">All Uploaded Stops</p>
                                                        {sortedStops.length > 0 ? (
                                                            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200 list-disc pl-5">
                                                                {sortedStops.map((stop) => (
                                                                    <li key={stop.id || `${tourPackage.id}-${stop.name}`}>{stop.name}</li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No stops provided.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {activeTab === 'accommodations' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="relative md:col-span-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={accommodationSearchTerm}
                                                onChange={(event) => setAccommodationSearchTerm(event.target.value)}
                                                placeholder="Search accommodation title or location..."
                                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <select
                                            value={accommodationTypeFilter}
                                            onChange={(event) => setAccommodationTypeFilter(event.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-900 dark:text-white"
                                        >
                                            {accommodationTypeOptions.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {filteredAccommodations.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No accommodations found for this user.</p>
                                    ) : (
                                        filteredAccommodations.map((accommodation) => (
                                            <div key={accommodation.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                                                <h4 className="font-semibold text-slate-900 dark:text-white">{accommodation.title}</h4>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{accommodation.location}</p>
                                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                    <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                                        {accommodation.accommodation_type || 'General'}
                                                    </span>
                                                    <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                                        PHP {Number(accommodation.price || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UsersManagement() {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(ROLE_ALL);
    const [statusFilter, setStatusFilter] = useState('All');

    // Actions + Feedback
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        actionType: null,
        user: null,
        submitting: false,
    });

    // Detail modal
    const [detailModalUser, setDetailModalUser] = useState(null);
    const [detailTab, setDetailTab] = useState('tourPackages');
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [detailData, setDetailData] = useState({ tourPackages: [], accommodations: [] });
    const detailCacheRef = useRef(new Map());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('api/admin/all-users/');
            if (Array.isArray(response.data)) {
                setAllUsers(response.data);
            } else if (response.data && Array.isArray(response.data.results)) {
                setAllUsers(response.data.results);
            }
        } catch (error) {
            console.error("Failed to fetch all users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    }, []);

    const closeConfirmModal = useCallback(() => {
        setConfirmModal({ open: false, actionType: null, user: null, submitting: false });
    }, []);

    const fetchTourPackagesForUser = useCallback(async (user) => {
        const role = getUserRole(user);

        if (role === ROLE_GUIDE || role === ROLE_PENDING_GUIDE) {
            const response = await api.get(`api/guides/${user.id}/tours/`);
            return normalizeArrayResponse(response.data);
        }

        if (role === ROLE_AGENCY || role === ROLE_PENDING_AGENCY) {
            const destinationsResponse = await api.get('api/destinations/');
            const destinations = normalizeArrayResponse(destinationsResponse.data);
            if (destinations.length === 0) return [];

            const destinationTourCalls = destinations.map((destination) =>
                api.get(`api/destinations/${destination.id}/tours/`)
            );

            const results = await Promise.allSettled(destinationTourCalls);
            const mergedTours = [];

            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    mergedTours.push(...normalizeArrayResponse(result.value.data));
                }
            });

            const filtered = mergedTours.filter((tourPackage) => Number(tourPackage?.agency_user_id) === Number(user.id));

            const dedupedById = new Map();
            filtered.forEach((tourPackage) => dedupedById.set(tourPackage.id, tourPackage));
            return Array.from(dedupedById.values());
        }

        return [];
    }, []);

    const fetchAccommodationsForUser = useCallback(async (user) => {
        const role = getUserRole(user);
        if (role === ROLE_GUIDE || role === ROLE_PENDING_GUIDE) {
            const response = await api.get(`api/accommodations/?host_id=${user.id}`);
            return normalizeArrayResponse(response.data);
        }

        if (role === ROLE_AGENCY || role === ROLE_PENDING_AGENCY) {
            const agencyId = user?.agency_profile?.id;
            if (!agencyId) return [];
            const response = await api.get(`api/accommodations/?agency_id=${agencyId}`);
            return normalizeArrayResponse(response.data);
        }

        return [];
    }, []);

    const openDetails = useCallback(async (user) => {
        setDetailModalUser(user);
        setDetailTab('tourPackages');
        setDetailError('');

        const cachedData = detailCacheRef.current.get(user.id);
        if (cachedData) {
            setDetailData(cachedData);
            setDetailLoading(false);
            return;
        }

        setDetailLoading(true);

        const [tourPackagesRes, accommodationsRes] = await Promise.allSettled([
            fetchTourPackagesForUser(user),
            fetchAccommodationsForUser(user),
        ]);

        const nextData = {
            tourPackages: tourPackagesRes.status === 'fulfilled' ? tourPackagesRes.value : [],
            accommodations: accommodationsRes.status === 'fulfilled' ? accommodationsRes.value : [],
        };

        if (tourPackagesRes.status === 'rejected' || accommodationsRes.status === 'rejected') {
            setDetailError('Some data could not be loaded. Showing available information.');
        }

        detailCacheRef.current.set(user.id, nextData);
        setDetailData(nextData);
        setDetailLoading(false);
    }, [fetchTourPackagesForUser, fetchAccommodationsForUser]);

    const closeDetails = useCallback(() => {
        setDetailModalUser(null);
        setDetailData({ tourPackages: [], accommodations: [] });
        setDetailError('');
        setDetailLoading(false);
    }, []);

    const deactivateUser = useCallback((user) => {
        if (!user.is_active) {
            showToast('User is already deactivated.', 'error');
            return;
        }

        setConfirmModal({
            open: true,
            actionType: 'deactivate',
            user,
            submitting: false,
        });
    }, [showToast]);

    const reactivateUser = useCallback((user) => {
        if (user.is_active) {
            showToast('User is already active.', 'error');
            return;
        }

        setConfirmModal({
            open: true,
            actionType: 'reactivate',
            user,
            submitting: false,
        });
    }, [showToast]);

    const deleteUser = useCallback((user) => {
        setConfirmModal({
            open: true,
            actionType: 'delete',
            user,
            submitting: false,
        });
    }, []);

    const confirmUserAction = useCallback(async () => {
        const { actionType, user } = confirmModal;
        if (!actionType || !user) return;

        setConfirmModal((prev) => ({ ...prev, submitting: true }));

        try {
            if (actionType === 'deactivate') {
                await api.patch(`api/admin/users/${user.id}/`, { is_active: false });
                setAllUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, is_active: false } : item)));
                setDetailModalUser((prev) => (prev?.id === user.id ? { ...prev, is_active: false } : prev));
                showToast('Account deactivated successfully.', 'success');
            }

            if (actionType === 'reactivate') {
                await api.patch(`api/admin/users/${user.id}/`, { is_active: true });
                setAllUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, is_active: true } : item)));
                setDetailModalUser((prev) => (prev?.id === user.id ? { ...prev, is_active: true } : prev));
                showToast('Account reactivated successfully.', 'success');
            }

            if (actionType === 'delete') {
                await api.delete(`api/admin/users/${user.id}/`);
                setAllUsers((prev) => prev.filter((item) => item.id !== user.id));
                detailCacheRef.current.delete(user.id);
                if (detailModalUser?.id === user.id) closeDetails();
                showToast('Account deleted successfully.', 'success');
            }

            closeConfirmModal();
        } catch (error) {
            console.error('Failed to apply account action:', error);
            showToast(
                actionType === 'delete'
                    ? 'Failed to delete account.'
                    : actionType === 'reactivate'
                        ? 'Failed to reactivate account.'
                        : 'Failed to deactivate account.',
                'error'
            );
            setConfirmModal((prev) => ({ ...prev, submitting: false }));
        }
    }, [closeConfirmModal, closeDetails, confirmModal, detailModalUser?.id, showToast]);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

            const role = getUserRole(u);
            const matchesRole = roleFilter === ROLE_ALL ? true : role === roleFilter;

            // Status Filtering
            let matchesStatus = true;
            if (statusFilter === 'Active') {
                matchesStatus = u.is_active === true;
            } else if (statusFilter === 'Deactivated') {
                matchesStatus = u.is_active === false;
            }

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [allUsers, searchTerm, roleFilter, statusFilter]);

    // Reset to page 1 when any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter]);

    useEffect(() => {
        if (!confirmModal.open) return undefined;

        const handleEscape = (event) => {
            if (event.key === 'Escape' && !confirmModal.submitting) {
                closeConfirmModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeConfirmModal, confirmModal.open, confirmModal.submitting]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPages = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    return (
        <div className="space-y-4 relative">

            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-lg shadow-xl border flex items-center gap-3 ${toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    <span className="text-sm font-semibold">{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => setToast((prev) => ({ ...prev, show: false }))}
                        className="text-current opacity-70 hover:opacity-100"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {confirmModal.open && confirmModal.user && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !confirmModal.submitting) {
                            closeConfirmModal();
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-5">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {confirmModal.actionType === 'delete'
                                ? 'Delete Account?'
                                : confirmModal.actionType === 'reactivate'
                                    ? 'Reactivate Account?'
                                    : 'Deactivate Account?'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {confirmModal.actionType === 'delete'
                                ? `This will permanently delete ${confirmModal.user.username}'s account. This action cannot be undone.`
                                : confirmModal.actionType === 'reactivate'
                                    ? `This will restore ${confirmModal.user.username}'s account access.`
                                    : `This will deactivate ${confirmModal.user.username}'s account and disable access.`}
                        </p>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeConfirmModal}
                                disabled={confirmModal.submitting}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmUserAction}
                                disabled={confirmModal.submitting}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                                    confirmModal.actionType === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : confirmModal.actionType === 'reactivate'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {confirmModal.submitting
                                    ? 'Processing...'
                                    : confirmModal.actionType === 'delete'
                                        ? 'Delete Account'
                                        : confirmModal.actionType === 'reactivate'
                                            ? 'Reactivate Account'
                                            : 'Deactivate Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters Bar */}
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
                <div className="mb-4">
                    <RoleFilterButtons activeRole={roleFilter} onChange={setRoleFilter} />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users by username or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative min-w-[160px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors appearance-none text-sm font-medium"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Deactivated">Deactivated</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No users found matching your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Username</th>
                                        <th className="px-6 py-4 font-semibold">Email</th>
                                        <th className="px-6 py-4 font-semibold">Role</th>
                                        <th className="px-6 py-4 font-semibold">Account Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                    {paginatedPages.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.username}</td>
                                            <td className="px-6 py-4">{user.email}</td>
                                            <td className="px-6 py-4">{getRoleBadge(user)}</td>
                                            <td className="px-6 py-4">
                                                {user.is_active ? (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold"><ShieldCheck className="w-4 h-4" /> Active</span>
                                                ) : (
                                                    <span className="text-red-500 text-xs font-bold uppercase">Deactivated</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {getUserRole(user) === ROLE_ADMIN ? (
                                                    <span className="text-xs text-slate-400">N/A</span>
                                                ) : (
                                                    <UserActionMenu
                                                        user={user}
                                                        onView={openDetails}
                                                        onDeactivate={deactivateUser}
                                                        onReactivate={reactivateUser}
                                                        onDelete={deleteUser}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 0 && (
                                <div className="flex justify-center items-center gap-3 border-t border-slate-200 dark:border-slate-700/50 py-4 bg-slate-50 dark:bg-slate-900/30">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Page {currentPage} of {totalPages}</span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <UserDetailModal
                isOpen={Boolean(detailModalUser)}
                user={detailModalUser}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                onClose={closeDetails}
                loading={detailLoading}
                error={detailError}
                details={detailData}
            />
        </div>
    );
}