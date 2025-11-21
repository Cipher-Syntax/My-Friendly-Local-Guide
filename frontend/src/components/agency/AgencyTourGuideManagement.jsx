import React from 'react';
import { Search, Plus, Star, Phone, Mail, Trash2 } from 'lucide-react';

export default function AgencyTourGuideManagement({ searchTerm, setSearchTerm, filteredGuides, openAddGuideModal, handleRemoveGuide, getStatusBg }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search guides by name, specialty, or language..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                </div>
                <button
                    onClick={openAddGuideModal}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Guide
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGuides.map((guide) => (
                    <div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition-all relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleRemoveGuide(guide.id)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                title="Remove guide"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                    guide.available ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-slate-600'
                                }`}>
                                    {guide.avatar}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-semibold">{guide.name}</h3>
                                        {guide.available && (
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-sm">{guide.specialty}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-white text-sm">{guide.rating}</span>
                                <span className="text-slate-500 text-xs">({guide.tours} tours)</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {guide.languages.map((lang, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Phone className="w-4 h-4" />
                                <span>{guide.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Mail className="w-4 h-4" />
                                <span>{guide.email}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}