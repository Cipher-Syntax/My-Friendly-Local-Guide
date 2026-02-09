import React from 'react';
import { X, Search, Check, Users, Sparkles } from 'lucide-react';

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

    // --- AUTOMATIC ASSIGNMENT LOGIC ---
    const handleAutoAssign = () => {
        if (!currentSelectedBooking) return;

        const numGuests = currentSelectedBooking.groupSize || 1;
        const requiredGuidesCount = Math.ceil(numGuests / 10);

        const currentAssignedIds = currentSelectedBooking.guideIds || [];
        let currentlyAssignedCount = currentAssignedIds.length;

        if (currentlyAssignedCount >= requiredGuidesCount) return;

        const availableGuides = filteredGuides.filter(guide =>
            guide.available === true && !currentAssignedIds.includes(guide.id)
        );

        const slotsToFill = requiredGuidesCount - currentlyAssignedCount;
        const guidesToAdd = availableGuides.slice(0, slotsToFill);

        if (guidesToAdd.length === 0) return;

        const newGuideIds = [
            ...currentAssignedIds,
            ...guidesToAdd.map(g => g.id)
        ];

        updateGuideAssignments(selectedBookingId, newGuideIds);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl h-[80vh] flex flex-col">

                {/* Header with Auto Assign Button on the Right */}
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            Assign Guides
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {currentSelectedBooking?.name} • <span className="text-white font-semibold">{currentSelectedBooking?.groupSize || 1} Guests</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Auto Assign Button Moved Here */}
                        <button
                            onClick={handleAutoAssign}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-sm font-medium border border-emerald-500/50"
                            title={`Auto-assign ${Math.ceil((currentSelectedBooking?.groupSize || 1) / 10)} guide(s)`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Auto Assign
                        </button>

                        <div className="h-8 w-px bg-slate-700 mx-1"></div>

                        <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search available guides..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Guides List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredGuides.map(guide => {
                        const isAssigned = currentSelectedBooking?.guideIds?.includes(guide.id);
                        return (
                            <div
                                key={guide.id}
                                onClick={() => assignGuide(selectedBookingId, guide)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isAssigned
                                        ? 'bg-blue-500/10 border-blue-500/50'
                                        : 'bg-slate-700/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-lg font-bold text-white">
                                        {guide.avatar}
                                    </div>
                                    <div>
                                        <h4 className={`font-medium ${isAssigned ? 'text-blue-400' : 'text-white'}`}>
                                            {guide.name}
                                        </h4>
                                        <div className="text-sm text-slate-400 flex gap-2">
                                            <span>{guide.specialty}</span>
                                            <span>•</span>
                                            <span className={guide.available ? 'text-green-400' : 'text-red-400'}>
                                                {guide.available ? 'Available' : 'Busy'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isAssigned
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-slate-500'
                                    }`}>
                                    {isAssigned && <Check className="w-4 h-4 text-white" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer (Simplified) */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm text-slate-400">
                        {currentSelectedBooking?.guideIds?.length || 0} guides selected
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