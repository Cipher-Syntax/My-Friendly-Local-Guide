import React from 'react';
import { X, Search, Check, Users, Sparkles, Tag } from 'lucide-react';

export default function ManageGuidesModal({
    isModalOpen,
    closeModal,
    currentSelectedBooking,
    searchTerm,
    setSearchTerm,
    filteredGuides,
    assignGuide,
    updateGuideAssignments,
    selectedBookingId
}) {
    if (!isModalOpen) return null;

    // SUPER-SAFE CATEGORY EXTRACTION
    const getBookingCategory = (booking) => {
        if (!booking) return 'General Tour';
        let cat = booking.destination_detail?.category || booking.category || 'General Tour';
        if (typeof cat === 'object' && cat !== null) {
            return cat.name || cat.title || 'General Tour';
        }
        return String(cat);
    };

    // SUPER-SAFE SPECIALTY EXTRACTION
    const getGuideSpecialty = (guide) => {
        if (!guide) return '';
        let spec = guide.specialization || guide.specialty || '';
        if (typeof spec === 'object' && spec !== null) {
            return spec.name || spec.title || '';
        }
        return String(spec);
    };

    const bookingCategory = getBookingCategory(currentSelectedBooking);

    // Helper for matching logic
    const isCategoryMatch = (catStr, specStr) => {
        if (!catStr || !specStr) return false;
        if (catStr === 'General Tour') return false;

        const cat = catStr.toLowerCase().trim();
        const spec = specStr.toLowerCase().trim();

        return cat.includes(spec) || spec.includes(cat);
    };

    // --- AUTOMATIC ASSIGNMENT LOGIC ---
    const handleAutoAssign = () => {
        if (!currentSelectedBooking) return;

        const numGuests = currentSelectedBooking.num_guests || currentSelectedBooking.groupSize || 1;
        const requiredGuidesCount = Math.ceil(numGuests / 10);

        const currentAssignedIds = currentSelectedBooking.guideIds || currentSelectedBooking.assigned_agency_guides || currentSelectedBooking.assigned_guides || [];
        let currentlyAssignedCount = currentAssignedIds.length;

        if (currentlyAssignedCount >= requiredGuidesCount) {
            return;
        }

        let availableGuides = filteredGuides.filter(guide =>
            (guide.available !== false && guide.is_active !== false) && !currentAssignedIds.includes(guide.id)
        );

        availableGuides.sort((a, b) => {
            const aSpec = getGuideSpecialty(a);
            const bSpec = getGuideSpecialty(b);

            const aMatch = isCategoryMatch(bookingCategory, aSpec);
            const bMatch = isCategoryMatch(bookingCategory, bSpec);

            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });

        const slotsToFill = requiredGuidesCount - currentlyAssignedCount;
        const guidesToAdd = availableGuides.slice(0, slotsToFill);

        if (guidesToAdd.length === 0) return;

        if (updateGuideAssignments) {
            const newGuideIds = [
                ...currentAssignedIds,
                ...guidesToAdd.map(g => g.id)
            ];
            updateGuideAssignments(selectedBookingId, newGuideIds);
        } else {
            guidesToAdd.forEach(g => assignGuide(selectedBookingId, g));
        }
    };

    const currentAssignedIds = currentSelectedBooking?.guideIds || currentSelectedBooking?.assigned_agency_guides || currentSelectedBooking?.assigned_guides || [];

    return (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl h-[80vh] flex flex-col transition-colors duration-300">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Assign Guides
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {currentSelectedBooking?.name || currentSelectedBooking?.destination_detail?.name || `Booking #${currentSelectedBooking?.id}`} • <span className="text-slate-900 dark:text-white font-semibold">{currentSelectedBooking?.num_guests || currentSelectedBooking?.groupSize || 1} Guests</span>
                            </p>
                            {bookingCategory && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    {bookingCategory}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAutoAssign}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors text-sm font-medium border border-emerald-200 dark:border-emerald-500/50"
                            title="Auto-assign guide(s) based on category"
                        >
                            <Sparkles className="w-4 h-4" />
                            Auto Assign
                        </button>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={closeModal} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search available guides..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredGuides.map(guide => {
                        const isAssigned = currentAssignedIds.includes(guide.id);
                        const guideSpec = getGuideSpecialty(guide);
                        const isRecommendedMatch = isCategoryMatch(bookingCategory, guideSpec);

                        return (
                            <div
                                key={guide.id}
                                onClick={() => assignGuide(selectedBookingId, guide)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isAssigned
                                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/50'
                                    : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* EXCLUSIVELY USES INITIALS NOW AS REQUESTED */}
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-white shrink-0 uppercase">
                                        {(guide.name || guide.full_name || guide.first_name || 'G').charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className={`font-medium ${isAssigned ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                                            {guide.name || guide.full_name || `${guide.first_name} ${guide.last_name}`}
                                        </h4>
                                        <div className="text-sm flex gap-2 items-center">
                                            <span className={isRecommendedMatch ? "text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1" : "text-slate-500 dark:text-slate-400"}>
                                                {guideSpec || 'General'}
                                                {isRecommendedMatch && <Sparkles className="w-3 h-3" title="Matches booking category!" />}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500">•</span>
                                            <span className={guide.available !== false && guide.is_active !== false ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                {guide.available !== false && guide.is_active !== false ? 'Available' : 'Busy'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isAssigned
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-slate-300 dark:border-slate-500'
                                    }`}>
                                    {isAssigned && <Check className="w-4 h-4 text-white" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {currentAssignedIds.length} guides selected
                    </span>
                    <button
                        onClick={closeModal}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}