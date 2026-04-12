import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Star, Phone, Mail, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPHPhoneLocal } from '../../utils/phoneNumber';

export default function AgencyTourGuideManagement({
    searchTerm,
    setSearchTerm,
    filteredGuides,
    openAddGuideModal,
    openEditGuideModal, // Added edit handler prop
    handleRemoveGuide,
    isPremium,
    guideLimit,
    totalGuidesCount
}) {
    const isAddGuideDisabled = !isPremium && totalGuidesCount >= guideLimit;
    const [currentPage, setCurrentPage] = useState(1);
    const [guidesPerPage, setGuidesPerPage] = useState(6);

    const totalGuides = filteredGuides.length;
    const totalPages = Math.max(1, Math.ceil(totalGuides / guidesPerPage));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedGuides = useMemo(() => {
        const start = (currentPage - 1) * guidesPerPage;
        const end = start + guidesPerPage;
        return filteredGuides.slice(start, end);
    }, [filteredGuides, currentPage, guidesPerPage]);

    const startItem = totalGuides === 0 ? 0 : (currentPage - 1) * guidesPerPage + 1;
    const endItem = Math.min(currentPage * guidesPerPage, totalGuides);

    return (
        <div className="space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides by name, specialty, or language..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                    </div>
                </div>
                <button
                    onClick={openAddGuideModal}
                    disabled={isAddGuideDisabled}
                    title={isAddGuideDisabled ? `Free tier limit reached (${guideLimit} guides max). Upgrade to Premium to add more.` : "Add Guide"}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold ${isAddGuideDisabled
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                        }`}
                >
                    <Plus className="w-5 h-5" />
                    Add Guide
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    Showing {startItem}-{endItem} of {totalGuides} guide{totalGuides === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Per page</span>
                    <select
                        value={guidesPerPage}
                        onChange={(e) => {
                            setGuidesPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                        <option value={6}>6</option>
                        <option value={12}>12</option>
                        <option value={18}>18</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedGuides.map((guide) => (
                    <div key={guide.id} className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all relative group shadow-sm hover:shadow-md">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <button
                                onClick={() => openEditGuideModal(guide)}
                                className="p-2 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-200 dark:hover:border-transparent"
                                title="Edit guide"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleRemoveGuide(guide.id)}
                                className="p-2 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-500 dark:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-transparent"
                                title="Remove guide"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-sm ${guide.available ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-white border border-slate-200 dark:border-transparent'
                                    }`}>
                                    {guide.avatar}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-slate-900 dark:text-white font-bold">{guide.name}</h3>
                                        {guide.available && (
                                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                        )}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{guide.specialty}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                                <span className="text-slate-900 dark:text-white text-sm font-bold">{guide.rating}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">({guide.tours} tours)</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {guide.languages.map((lang, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-xs font-medium rounded border border-slate-200 dark:border-transparent">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium">
                                <Phone className="w-4 h-4" />
                                <span>{formatPHPhoneLocal(guide.phone) || guide.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium">
                                <Mail className="w-4 h-4" />
                                <span>{guide.email}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {totalGuides === 0 && (
                <div className="bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No guides found for your current search.
                </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
                <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1 || totalGuides === 0}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                    <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Page {totalGuides === 0 ? 0 : currentPage} of {totalGuides === 0 ? 0 : totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages || totalGuides === 0}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}