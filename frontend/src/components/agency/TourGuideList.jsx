import React from 'react';
import { Search, Star, Award, Phone, Mail, CheckCircle, UserX } from 'lucide-react';

export default function TourGuideList({ searchTerm, setSearchTerm, filteredGuides, currentSelectedBooking, selectedBookingId, assignGuide }) {

    return (
        <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden sticky top-6">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">TOUR GUIDES</h3>
                    {selectedBookingId && (
                        <div className='mb-3 p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 rounded-lg text-sm font-medium'>
                            <p>Click guides below to assign/unassign from **{currentSelectedBooking?.name}**</p>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>

                <div className="p-4 h-[800px] overflow-y-auto">
                    <div className="space-y-3">
                        {filteredGuides.map((guide) => {
                            const isAssignedToSelectedBooking = currentSelectedBooking && currentSelectedBooking.guideIds.includes(guide.id);
                            const canBeInteractedWith = selectedBookingId && guide.available;

                            return (
                                <div
                                    key={guide.id}
                                    className={`bg-slate-900/50 rounded-xl p-4 border transition-all 
                                        ${canBeInteractedWith
                                            ? 'hover:border-cyan-500 cursor-pointer'
                                            : 'border-slate-700'
                                        }
                                        ${isAssignedToSelectedBooking ? 'border-2 border-cyan-500 ring-4 ring-cyan-500/30' : ''}
                                    `}
                                    onClick={() => canBeInteractedWith && assignGuide(selectedBookingId, guide)}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${guide.available
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                                            }`}>
                                            {guide.avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-semibold truncate">{guide.name}</h4>
                                                {guide.available && (
                                                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Available" />
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-xs">{guide.specialty}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                                <span className="text-yellow-500 text-xs font-medium">{guide.rating}</span>
                                                <span className="text-slate-500 text-xs">({guide.tours} tours)</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Award className="w-3 h-3" />
                                            <span className="truncate">{guide.languages.join(', ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Phone className="w-3 h-3" />
                                            <span className="truncate">{guide.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Mail className="w-3 h-3" />
                                            <span className="truncate">{guide.email}</span>
                                        </div>
                                    </div>

                                    {selectedBookingId && guide.available && (
                                        <button className={`w-full mt-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2
                                            ${isAssignedToSelectedBooking
                                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                                                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                            }`}>
                                            {isAssignedToSelectedBooking ? (
                                                <><UserX className="w-4 h-4" /> Unassign Guide</>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4" /> Select Guide</>
                                            )}
                                        </button>
                                    )}

                                    {!guide.available && (
                                        <div className="mt-3 px-3 py-2 bg-gray-500/10 text-gray-500 rounded-lg text-center text-xs font-medium">
                                            Currently Unavailable
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}