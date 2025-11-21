import React from 'react';
import { X, Check, Award } from 'lucide-react'; // Added Award for potential future use or consistency

export default function AddGuideModal({
    isAddGuideModalOpen,
    closeAddGuideModal,
    newGuideForm,
    setNewGuideForm,
    handleAddLanguage,
    handleRemoveLanguage,
    filteredLanguages,
    handleSubmitNewGuide,
}) {
    if (!isAddGuideModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Add New Tour Guide</h3>
                        <p className="text-slate-400 text-sm mt-1">Fill in the guide information</p>
                    </div>
                    <button
                        onClick={closeAddGuideModal}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-white text-base font-semibold mb-3">Full Name</label>
                            <input
                                type="text"
                                value={newGuideForm.fullName}
                                onChange={(e) => setNewGuideForm(prev => ({ ...prev, fullName: e.target.value }))}
                                placeholder="Enter full name"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                            />
                        </div>

                        {/* Specialty */}
                        <div>
                            <label className="block text-white text-base font-semibold mb-3">Specialty</label>
                            <input
                                type="text"
                                value={newGuideForm.specialty}
                                onChange={(e) => setNewGuideForm(prev => ({ ...prev, specialty: e.target.value }))}
                                placeholder="e.g., Historical Tours, Art & Culture"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                            />
                        </div>

                        {/* Languages */}
                        <div>
                            <label className="block text-white text-base font-semibold mb-3">Languages</label>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={newGuideForm.languageSearchTerm}
                                    onChange={(e) => setNewGuideForm(prev => ({ ...prev, languageSearchTerm: e.target.value, showLanguageDropdown: true }))}
                                    onFocus={() => setNewGuideForm(prev => ({ ...prev, showLanguageDropdown: true }))}
                                    placeholder="Search and select languages..."
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                />
                                {newGuideForm.showLanguageDropdown && filteredLanguages.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                        {filteredLanguages.map((lang, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    handleAddLanguage(lang);
                                                    setNewGuideForm(prev => ({ ...prev, showLanguageDropdown: false }));
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-cyan-500/20 text-white transition-colors hover:text-cyan-400 text-sm"
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {newGuideForm.languages.length > 0 ? (
                                    newGuideForm.languages.map((lang, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-cyan-400 text-sm font-medium"
                                        >
                                            {lang}
                                            <button
                                                onClick={() => handleRemoveLanguage(lang)}
                                                className="hover:text-cyan-300 transition-colors ml-1"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-slate-500 text-sm">No languages selected</span>
                                )}
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-white text-base font-semibold mb-3">Phone Number</label>
                            <input
                                type="tel"
                                value={newGuideForm.phone}
                                onChange={(e) => setNewGuideForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="e.g., +33 6 12 34 56 78"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-white text-base font-semibold mb-3">Email</label>
                            <input
                                type="email"
                                value={newGuideForm.email}
                                onChange={(e) => setNewGuideForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="e.g., guide@example.com"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                    <button
                        onClick={closeAddGuideModal}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmitNewGuide}
                        disabled={!newGuideForm.fullName || !newGuideForm.specialty || newGuideForm.languages.length === 0 || !newGuideForm.phone || !newGuideForm.email}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                        Add Guide
                    </button>
                </div>
            </div>
        </div>
    );
}