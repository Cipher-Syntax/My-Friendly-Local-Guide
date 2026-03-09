import React, { useState } from 'react';
import { X, Plus, User, Phone, Book, Languages, Loader2, AlertCircle } from 'lucide-react';

export default function AddGuideModal({
    isAddGuideModalOpen,
    closeAddGuideModal,
    newGuideForm,
    setNewGuideForm,
    filteredLanguages,
    handleAddLanguage,
    handleRemoveLanguage,
    handleSubmitNewGuide,
    availableSpecialties = [],
    // --- NEW PROPS ---
    agencyTier,
    totalGuidesCount
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(''); // New State for explicit errors

    const handleCreateProfile = async () => {
        // 1. Double check limit on frontend before even hitting the API
        if (agencyTier === 'free' && totalGuidesCount >= 2) {
            setErrorMessage("Free tier is limited to 2 guides. Please upgrade your plan to add more.");
            return;
        }

        setIsCreating(true);
        setErrorMessage(''); // Reset previous errors

        try {
            await handleSubmitNewGuide();
            // Assuming handleSubmitNewGuide automatically closes the modal on success
        } catch (error) {
            // 2. Catch the error from your API and display a specific message
            if (error.response?.data?.detail) {
                setErrorMessage(error.response.data.detail);
            } else if (error.message) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage("Failed to add guide. Please try again.");
            }
        } finally {
            setIsCreating(false);
        }
    };

    if (!isAddGuideModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        Add New Tour Guide
                    </h3>
                    <button onClick={closeAddGuideModal} disabled={isCreating} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* --- ERROR MESSAGE UI --- */}
                    {errorMessage && (
                        <div className="p-3 mb-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Full Name
                        </label>
                        <input
                            type="text"
                            disabled={isCreating}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500"
                            placeholder="e.g. Juan Dela Cruz"
                            value={newGuideForm.fullName}
                            onChange={(e) => setNewGuideForm({ ...newGuideForm, fullName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Phone
                            </label>
                            <input
                                type="tel"
                                disabled={isCreating}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500"
                                placeholder="09..."
                                value={newGuideForm.phone}
                                onChange={(e) => setNewGuideForm({ ...newGuideForm, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Book className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Specialty
                            </label>
                            <select
                                disabled={isCreating}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                value={newGuideForm.specialty}
                                onChange={(e) => setNewGuideForm({ ...newGuideForm, specialty: e.target.value })}
                            >
                                <option value="" disabled>Select a specialty...</option>
                                {availableSpecialties.map(spec => (
                                    <option key={spec} value={spec}>
                                        {spec}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Languages className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Languages
                        </label>
                        <div className={`flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[3rem] ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}>
                            {newGuideForm.languages.map(lang => (
                                <span key={lang} className="bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded text-xs flex items-center gap-1 border border-cyan-200 dark:border-cyan-500/30">
                                    {lang}
                                    <button onClick={() => handleRemoveLanguage(lang)} className="hover:text-cyan-900 dark:hover:text-white"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="bg-transparent outline-none text-slate-900 dark:text-white text-sm flex-1 min-w-[100px] placeholder-slate-400 dark:placeholder-slate-500"
                                placeholder="Type & select..."
                                value={newGuideForm.languageSearchTerm}
                                onFocus={() => setNewGuideForm(prev => ({ ...prev, showLanguageDropdown: true }))}
                                onChange={(e) => setNewGuideForm(prev => ({ ...prev, languageSearchTerm: e.target.value }))}
                            />
                        </div>

                        {newGuideForm.showLanguageDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 max-h-40 overflow-y-auto">
                                {filteredLanguages
                                    .filter(l => l.toLowerCase().includes((newGuideForm.languageSearchTerm || '').toLowerCase()))
                                    .map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                handleAddLanguage(lang);
                                                setNewGuideForm(prev => ({ ...prev, languageSearchTerm: '', showLanguageDropdown: false }));
                                            }}
                                            className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            {lang}
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-transparent rounded-b-2xl">
                    <button
                        onClick={closeAddGuideModal}
                        disabled={isCreating}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateProfile}
                        disabled={isCreating}
                        className={`px-6 py-2 font-medium rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isCreating
                            ? 'bg-cyan-500/50 text-white/70 cursor-not-allowed shadow-none'
                            : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/25'
                            }`}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Create Profile'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}