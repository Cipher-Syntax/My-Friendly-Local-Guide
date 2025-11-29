import React from 'react';
import { X, Search, MapPin, Star, Plus, CheckCircle, User } from 'lucide-react';

export default function ManageGuidesModal({ 
    isModalOpen, 
    closeModal, 
    currentSelectedBooking, 
    searchTerm, 
    setSearchTerm, 
    filteredGuides, 
    assignGuide, 
    selectedBookingId 
}) {
    if (!isModalOpen || !currentSelectedBooking) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800">
                    <div>
                        <h3 className="text-xl font-bold text-white">Assign Guides</h3>
                        <p className="text-slate-400 text-sm mt-1">Booking: {currentSelectedBooking.name}</p>
                    </div>
                    <button onClick={closeModal} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Info Bar */}
                <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-700/50 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        {currentSelectedBooking.location}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-4 h-4 text-blue-400" />
                        {currentSelectedBooking.groupSize} Guests
                    </div>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides by name or specialty..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="space-y-3">
                        {filteredGuides.length === 0 && (
                            <p className="text-center text-slate-500 py-10">No active guides found.</p>
                        )}
                        
                        {filteredGuides.map((guide) => {
                            const isAssigned = currentSelectedBooking.guideIds.includes(guide.id);
                            return (
                                <div
                                    key={guide.id}
                                    onClick={() => assignGuide(selectedBookingId, guide)}
                                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                        isAssigned
                                            ? 'bg-cyan-500/10 border-cyan-500/50'
                                            : 'bg-slate-800 border-slate-700 hover:bg-slate-700/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {guide.avatar}
                                        </div>
                                        <div>
                                            <h4 className={`font-semibold ${isAssigned ? 'text-cyan-400' : 'text-white'}`}>
                                                {guide.name}
                                            </h4>
                                            <p className="text-slate-400 text-sm">{guide.specialty}</p>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                        isAssigned 
                                            ? 'bg-cyan-500 border-cyan-500 text-white' 
                                            : 'border-slate-600 text-slate-600'
                                    }`}>
                                        {isAssigned ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/30 flex justify-end">
                    <button onClick={closeModal} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}