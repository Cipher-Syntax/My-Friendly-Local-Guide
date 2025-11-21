import React from 'react';
import { X, Search, MapPin, Star, Plus, CheckCircle } from 'lucide-react';

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
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Manage Tour Guides</h3>
                        <p className="text-slate-400 text-sm mt-1">{currentSelectedBooking.name}</p>
                    </div>
                    <button
                        onClick={closeModal}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Booking Info */}
                <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Date</p>
                            <p className="text-white font-medium">{currentSelectedBooking.date}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Time</p>
                            <p className="text-white font-medium">{currentSelectedBooking.time}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Location</p>
                            <p className="text-white font-medium">{currentSelectedBooking.location}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Group Size</p>
                            <p className="text-white font-medium">{currentSelectedBooking.groupSize} people</p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                </div>

                {/* Guides List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {filteredGuides.map((guide) => {
                            const isAssigned = currentSelectedBooking.guideIds.includes(guide.id);
                            return (
                                <div
                                    key={guide.id}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        isAssigned
                                            ? 'bg-cyan-500/10 border-cyan-500/50'
                                            : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                                    }`}
                                    onClick={() => assignGuide(selectedBookingId, guide)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                                guide.available ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-slate-600'
                                            }`}>
                                                {guide.avatar}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-white font-semibold">{guide.name}</h4>
                                                    {guide.available && (
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    )}
                                                    {!guide.available && (
                                                        <span className="text-xs text-red-400">(Unavailable)</span>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-sm">{guide.specialty}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-slate-400 text-xs">{guide.rating} • {guide.tours} tours</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAssigned ? (
                                                <CheckCircle className="w-6 h-6 text-cyan-400" />
                                            ) : (
                                                <Plus className="w-6 h-6 text-slate-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                    <button
                        onClick={closeModal}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}