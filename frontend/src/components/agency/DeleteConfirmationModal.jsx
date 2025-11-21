import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationModal({ isDeleteConfirmOpen, cancelDeleteGuide, confirmDeleteGuide }) {
    if (!isDeleteConfirmOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-700/50">
                    <h3 className="text-xl font-bold text-white">Remove Tour Guide</h3>
                </div>

                {/* Modal Content */}
                <div className="px-6 py-6 flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-slate-300 text-base">
                        Are you sure you want to remove this tour guide? This action cannot be undone.
                    </p>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                    <button
                        onClick={cancelDeleteGuide}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDeleteGuide}
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}