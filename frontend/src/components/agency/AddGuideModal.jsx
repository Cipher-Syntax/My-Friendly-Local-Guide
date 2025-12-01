import React from 'react';
import { X, Plus, User, Phone, Book, Languages } from 'lucide-react';

export default function AddGuideModal({ 
    isAddGuideModalOpen, 
    closeAddGuideModal, 
    newGuideForm, 
    setNewGuideForm, 
    filteredLanguages, 
    handleAddLanguage, 
    handleRemoveLanguage, 
    handleSubmitNewGuide 
}) {
    if (!isAddGuideModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-cyan-400" />
                        Add New Tour Guide
                    </h3>
                    <button onClick={closeAddGuideModal} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" /> Full Name
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            placeholder="e.g. Juan Dela Cruz"
                            value={newGuideForm.fullName}
                            onChange={(e) => setNewGuideForm({...newGuideForm, fullName: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-500" /> Phone
                            </label>
                            <input 
                                type="tel" 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="+63 9..."
                                value={newGuideForm.phone}
                                onChange={(e) => setNewGuideForm({...newGuideForm, phone: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Book className="w-4 h-4 text-slate-500" /> Specialty
                            </label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="e.g. Historical"
                                value={newGuideForm.specialty}
                                onChange={(e) => setNewGuideForm({...newGuideForm, specialty: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Languages className="w-4 h-4 text-slate-500" /> Languages
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/50 rounded-xl border border-slate-700 min-h-[3rem]">
                            {newGuideForm.languages.map(lang => (
                                <span key={lang} className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs flex items-center gap-1 border border-cyan-500/30">
                                    {lang}
                                    <button onClick={() => handleRemoveLanguage(lang)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            <input 
                                type="text" 
                                className="bg-transparent outline-none text-white text-sm flex-1 min-w-[100px]"
                                placeholder="Type & select..."
                                value={newGuideForm.languageSearchTerm}
                                onFocus={() => setNewGuideForm(prev => ({...prev, showLanguageDropdown: true}))}
                                onChange={(e) => setNewGuideForm(prev => ({...prev, languageSearchTerm: e.target.value}))}
                            />
                        </div>
                        
                        {newGuideForm.showLanguageDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-40 overflow-y-auto">
                                {filteredLanguages
                                    .filter(l => l.toLowerCase().includes((newGuideForm.languageSearchTerm || '').toLowerCase()))
                                    .map(lang => (
                                        <button 
                                            key={lang}
                                            onClick={() => {
                                                handleAddLanguage(lang);
                                                setNewGuideForm(prev => ({...prev, languageSearchTerm: '', showLanguageDropdown: false}));
                                            }}
                                            className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                        >
                                            {lang}
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                    <button onClick={closeAddGuideModal} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleSubmitNewGuide}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
                    >
                        Create Profile
                    </button>
                </div>
            </div>
        </div>
    );
}