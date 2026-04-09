import React, { useState, useEffect, useCallback } from 'react';
import { X, Map, DollarSign, Users, Clock, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import api from '../../api/api';

export default function AddAgencyTourModal({ isOpen, onClose, onTourAdded, onTourUpdated, editData }) {
    const [destinations, setDestinations] = useState([]);
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '', description: '', duration: '', durationDays: '1',
        maxGroupSize: '', whatToBring: '', pricePerDay: '',
        soloPricePerDay: '', additionalPerHeadPerDay: '0', destination_id: '',
    });

    const [stops, setStops] = useState([{ file: null, preview: null, name: '' }]);
    const [timeline, setTimeline] = useState([]);
    const [currentDayTab, setCurrentDayTab] = useState(1);

    const [tempTimeline, setTempTimeline] = useState({
        startTime: '', endTime: '', selectedActivity: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);



    const fetchInitialData = async () => {
        try {
            const [destRes, accomRes] = await Promise.all([
                api.get('api/destinations/'),
                api.get('api/accommodations/')
            ]);
            setDestinations(destRes.data);
            setAccommodations(accomRes.data);
        } catch (err) {
            console.error("Failed to fetch initial data:", err);
            setError("Could not load destinations or accommodations.");
        }
    };

    const resetForm = useCallback(() => {
        setFormData({
            name: '', description: '', duration: '', durationDays: '1', maxGroupSize: '',
            whatToBring: '', pricePerDay: '', soloPricePerDay: '', additionalPerHeadPerDay: '0', destination_id: destinations[0]?.id || ''
        });
        setStops([{ file: null, preview: null, name: '' }]);
        setTimeline([]);
        setCurrentStep(1);
        setCurrentDayTab(1);
        setError('');
    },[destinations]);

    const populateEditData = useCallback(() => {
        setFormData({
            name: editData.name || '',
            description: editData.description || '',
            duration: editData.duration || '',
            durationDays: editData.duration_days?.toString() || '1',
            maxGroupSize: editData.max_group_size?.toString() || '',
            whatToBring: editData.what_to_bring || '',
            pricePerDay: editData.price_per_day || '',
            soloPricePerDay: editData.solo_price || '',
            additionalPerHeadPerDay: editData.additional_fee_per_head || '0',
            destination_id: editData.main_destination || destinations[0]?.id || '',
        });

        if (editData.stops && editData.stops.length > 0) {
            setStops(editData.stops.map(s => ({ file: null, preview: s.image, name: s.name })));
        } else {
            setStops([{ file: null, preview: null, name: '' }]);
        }

        let parsedTimeline = [];
        try {
            parsedTimeline = typeof editData.itinerary_timeline === 'string'
                ? JSON.parse(editData.itinerary_timeline)
                : editData.itinerary_timeline;
        } catch (e) { console.warn("Failed to parse timeline", e); }

        setTimeline(parsedTimeline || []);
        setCurrentStep(1);
        setCurrentDayTab(1);
        setError('');
    }, [
        destinations,
        editData
    ]);

    useEffect(() => {
        if (isOpen && destinations.length > 0) {
            if (editData) populateEditData();
            else resetForm();
        }
    }, [isOpen, editData, destinations, populateEditData, resetForm]);

    const handleStopImageChange = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            const newStops = [...stops];
            newStops[index].file = file;
            newStops[index].preview = URL.createObjectURL(file);
            setStops(newStops);
        }
    };

    const handleStopNameChange = (index, value) => {
        const newStops = [...stops];
        newStops[index].name = value;
        setStops(newStops);
    };

    const addStop = () => setStops([...stops, { file: null, preview: null, name: '' }]);
    const removeStop = (index) => setStops(stops.filter((_, i) => i !== index));

    const handleTimelineAdd = () => {
        if (!tempTimeline.startTime || !tempTimeline.endTime || !tempTimeline.selectedActivity) {
            setError("Please fill Start Time, End Time, and Activity.");
            setTimeout(() => setError(''), 3000);
            return;
        }

        const [type, index] = tempTimeline.selectedActivity.split('|');
        let activityName = '';
        let activityId = null;

        if (type === 'stop') activityName = stops[parseInt(index)]?.name || `Stop ${parseInt(index) + 1}`;
        else if (type === 'accom') {
            const accom = accommodations[parseInt(index)];
            activityName = accom?.title;
            activityId = accom?.id;
        }

        setTimeline([...timeline, {
            day: currentDayTab, startTime: tempTimeline.startTime, endTime: tempTimeline.endTime,
            activityName, type, refId: activityId
        }]);
        setTempTimeline({ startTime: '', endTime: '', selectedActivity: '' });
    };

    const validateStep = (step) => {
        setError('');
        if (step === 1) {
            const parsedMaxGuests = parseInt(formData.maxGroupSize, 10);
            if (!formData.destination_id || !formData.name || !formData.description) {
                setError("Please fill in the Destination, Tour Name, and Description.");
                return false;
            }
            if (!Number.isFinite(parsedMaxGuests) || parsedMaxGuests < 1) {
                setError("Please set a valid Max Guests value (at least 1).");
                return false;
            }
        }
        if (step === 3 && (!formData.pricePerDay || timeline.length === 0)) {
            setError("Please set a base price and add at least one item to the itinerary.");
            return false;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) setCurrentStep(prev => prev + 1);
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return;
        setIsLoading(true);

        try {
            const parsedMaxGuests = parseInt(formData.maxGroupSize, 10);
            const submitData = new FormData();
            submitData.append('destination_id', formData.destination_id);
            submitData.append('name', formData.name);
            submitData.append('description', formData.description);
            submitData.append('duration', formData.duration);
            submitData.append('duration_days', parseInt(formData.durationDays) || 1);
            submitData.append('max_group_size', String(parsedMaxGuests));
            submitData.append('what_to_bring', formData.whatToBring);
            submitData.append('price_per_day', formData.pricePerDay);
            submitData.append('solo_price', formData.soloPricePerDay);
            submitData.append('additional_fee_per_head', formData.additionalPerHeadPerDay || 0);
            submitData.append('itinerary_timeline', JSON.stringify(timeline));

            stops.forEach((stop, index) => {
                submitData.append('stops_names', stop.name || `Stop ${index + 1}`);

                if (stop.file) {
                    // They uploaded a brand new file
                    submitData.append('stops_images', stop.file);
                    submitData.append('existing_images_urls', '');
                } else if (stop.preview && !stop.preview.startsWith('blob:')) {
                    // They kept the existing image from the database!
                    submitData.append('existing_images_urls', stop.preview);
                } else {
                    // No image for this stop
                    submitData.append('existing_images_urls', '');
                }
            });

            if (editData) {
                const response = await api.patch(`api/tours/${editData.id}/`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                onTourUpdated(response.data);
            } else {
                const response = await api.post('api/create/', submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                onTourAdded(response.data);
            }

            onClose();
        } catch (err) {
            console.error("Failed to save tour:", err);
            setError(err.response?.data?.detail || "Failed to save tour. Please check your inputs.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderStepIndicators = () => (
        <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map((step, idx) => (
                <React.Fragment key={step}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep >= step ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-700 dark:border-slate-600'}`}>
                        {step}
                    </div>
                    {idx < 2 && <div className={`w-12 h-1 transition-colors ${currentStep > step ? 'bg-cyan-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">

                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Map className="w-5 h-5 text-cyan-500" /> {editData ? 'Edit Tour Package' : 'Create Tour Package'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {renderStepIndicators()}

                    {error && (
                        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="space-y-5 animate-in slide-in-from-right-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">The Essentials</h4>
                                <p className="text-sm text-slate-500">Where are you taking them?</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Destination *</label>
                                    <select value={formData.destination_id} onChange={e => setFormData({ ...formData, destination_id: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white">
                                        <option value="" disabled>Select Destination</option>
                                        {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tour Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white" placeholder="Grand Island Hopping" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                                    <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white resize-none" placeholder="Describe the experience..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Duration Label</label>
                                    <input type="text" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white" placeholder="e.g. 8 Hours" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Package Days</label>
                                    <input type="number" min="1" value={formData.durationDays} onChange={e => setFormData({ ...formData, durationDays: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Max Guests *</label>
                                    <input type="number" min="1" required value={formData.maxGroupSize} onChange={e => setFormData({ ...formData, maxGroupSize: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-5 animate-in slide-in-from-right-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Stops & Requirements</h4>
                                <p className="text-sm text-slate-500">Upload photos of the locations.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {stops.map((stop, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 relative group">
                                        <label className="cursor-pointer h-24 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                                            {stop.preview ? <img src={stop.preview} className="w-full h-full object-cover" alt="stop" /> : <ImageIcon className="w-6 h-6 text-slate-400" />}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStopImageChange(idx, e)} />
                                        </label>
                                        <input type="text" value={stop.name} onChange={(e) => handleStopNameChange(idx, e.target.value)} placeholder={`Stop ${idx + 1}`} className="w-full text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-center pb-1 dark:text-white" />
                                        {stops.length > 1 && (
                                            <button onClick={() => removeStop(idx)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={addStop} className="border-2 border-dashed border-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-xl h-full min-h-[140px] flex flex-col items-center justify-center hover:bg-cyan-100 transition-colors">
                                    <Plus className="w-8 h-8 mb-1" />
                                    <span className="text-sm font-bold">Add Stop</span>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">What to Bring</label>
                                <input type="text" value={formData.whatToBring} onChange={e => setFormData({ ...formData, whatToBring: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white" placeholder="Sunblock, Extra Clothes..." />
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Pricing & Schedule</h4>
                                <p className="text-sm text-slate-500">Set your rates and build the itinerary.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Base Price/Day *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₱</span>
                                        <input type="number" value={formData.pricePerDay} onChange={e => setFormData({ ...formData, pricePerDay: e.target.value })} className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Solo Price/Day</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₱</span>
                                        <input type="number" value={formData.soloPricePerDay} onChange={e => setFormData({ ...formData, soloPricePerDay: e.target.value })} className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Extra Pax Fee</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₱</span>
                                        <input type="number" value={formData.additionalPerHeadPerDay} onChange={e => setFormData({ ...formData, additionalPerHeadPerDay: e.target.value })} className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 font-bold" />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto">
                                    {Array.from({ length: parseInt(formData.durationDays) || 1 }).map((_, i) => (
                                        <button key={i} onClick={() => setCurrentDayTab(i + 1)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${currentDayTab === i + 1 ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                            Day {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900">
                                    <div className="flex flex-wrap gap-3 items-end mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Start Time</label>
                                            <input type="time" value={tempTimeline.startTime} onChange={e => setTempTimeline({ ...tempTimeline, startTime: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
                                        </div>
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">End Time</label>
                                            <input type="time" value={tempTimeline.endTime} onChange={e => setTempTimeline({ ...tempTimeline, endTime: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800" />
                                        </div>
                                        <div className="flex-[2] min-w-[200px]">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Activity / Stop</label>
                                            <select value={tempTimeline.selectedActivity} onChange={e => setTempTimeline({ ...tempTimeline, selectedActivity: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800">
                                                <option value="" disabled>Select Activity</option>
                                                <optgroup label="Tour Stops">
                                                    {stops.map((stop, i) => <option key={`stop-${i}`} value={`stop|${i}`}>📍 {stop.name || `Stop ${i + 1}`}</option>)}
                                                </optgroup>
                                                {accommodations.length > 0 && (
                                                    <optgroup label="Accommodations">
                                                        {accommodations.map((acc, i) => <option key={`acc-${i}`} value={`accom|${i}`}>🏨 {acc.title}</option>)}
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>
                                        <button onClick={handleTimelineAdd} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold flex items-center gap-1">
                                            <Plus className="w-4 h-4" /> Add
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {timeline.filter(t => t.day === currentDayTab).length === 0 ? (
                                            <p className="text-center text-sm text-slate-400 italic py-4">No activities scheduled for Day {currentDayTab}.</p>
                                        ) : (
                                            timeline.filter(t => t.day === currentDayTab).map((item, idx) => (
                                                <div key={idx} className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg">
                                                    <div className="w-24 text-center border-r border-slate-200 dark:border-slate-600 mr-4">
                                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.startTime}</div>
                                                        <div className="text-[10px] text-slate-400">to</div>
                                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.endTime}</div>
                                                    </div>
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <span className="text-lg">{item.type === 'stop' ? '📍' : '🏨'}</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.activityName}</span>
                                                    </div>
                                                    <button onClick={() => setTimeline(timeline.filter(t => t !== item))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
                    {currentStep > 1 ? (
                        <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            Back
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-3">
                        {currentStep === 1 && (
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={currentStep === 3 ? handleSubmit : nextStep}
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? 'Processing...' : (currentStep === 3 ? (editData ? 'Save Changes' : 'Publish Tour') : 'Next Step')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}