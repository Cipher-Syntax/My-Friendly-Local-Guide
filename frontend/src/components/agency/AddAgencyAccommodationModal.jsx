import React, { useState, useEffect, useCallback } from 'react';
import { X, Home, DollarSign, PhilippinePeso, MapPin, Bed, Car, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../../api/api';

export default function AddAgencyAccommodationModal({ isOpen, onClose, onAccommodationAdded, onAccommodationUpdated, editData }) {
    const [destinations, setDestinations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

    const [images, setImages] = useState({ photo: null, room: null, transport: null });
    const [previews, setPreviews] = useState({ photo: null, room: null, transport: null });

    const [formData, setFormData] = useState({
        title: '', description: '', location: '', price: '',
        accommodation_type: 'Hotel', room_type: 'Standard',
        offer_transportation: false, vehicle_type: '', transport_capacity: '',
        destination_id: '',
    });

    const [amenities, setAmenities] = useState({
        wifi: false, breakfast: false, ac: false, parking: false, pool: false
    });

    useEffect(() => {
        if (isOpen) {
            fetchDestinations();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && destinations.length > 0) {
            if (editData) populateEditData();
            else resetForm();
        }
    }, [isOpen, editData, destinations, populateEditData, resetForm]);

    const fetchDestinations = async () => {
        try {
            const response = await api.get('api/destinations/');
            setDestinations(response.data);
        } catch (err) {
            console.error("Failed to fetch destinations:", err);
            setError("Could not load destinations.");
        }
    };

    const resetForm = useCallback(() => {
        setFormData({
            title: '', description: '', location: '', price: '', accommodation_type: 'Hotel',
            room_type: 'Standard', offer_transportation: false, vehicle_type: '', transport_capacity: '', destination_id: destinations[0]?.id || ''
        });
        setAmenities({ wifi: false, breakfast: false, ac: false, parking: false, pool: false });
        setImages({ photo: null, room: null, transport: null });
        setPreviews({ photo: null, room: null, transport: null });
        setCurrentStep(1);
        setError('');
    }, [destinations]);

    const populateEditData = useCallback(() => {
        const destId = editData.destination_detail?.id || editData.destination || destinations[0]?.id || '';

        setFormData({
            title: editData.title || '',
            description: editData.description || '',
            location: editData.location || '',
            price: editData.price || '',
            accommodation_type: editData.accommodation_type || 'Hotel',
            room_type: editData.room_type || 'Standard',
            offer_transportation: editData.offer_transportation || false,
            vehicle_type: editData.vehicle_type || '',
            transport_capacity: editData.transport_capacity?.toString() || '',
            destination_id: destId,
        });

        setAmenities({
            wifi: editData.amenities?.wifi || false,
            breakfast: editData.amenities?.breakfast || false,
            ac: editData.amenities?.ac || false,
            parking: editData.amenities?.parking || false,
            pool: editData.amenities?.pool || false,
        });

        setPreviews({
            photo: editData.photo || null,
            room: editData.room_image || null,
            transport: editData.transport_image || null,
        });

        // Ensure new file uploads are cleared when editing starts
        setImages({ photo: null, room: null, transport: null });

        setCurrentStep(1);
        setError('');
    }, [
        destinations,
        editData?.title,
        editData?.description,
        editData?.location,
        editData?.price,
        editData?.accommodation_type,
        editData?.room_type,
        editData?.offer_transportation,
        editData?.vehicle_type,
        editData?.transport_capacity,
        editData?.destination,
        editData?.destination_detail?.id,
        editData?.amenities?.wifi,
        editData?.amenities?.breakfast,
        editData?.amenities?.ac,
        editData?.amenities?.parking,
        editData?.amenities?.pool,
        editData?.photo,
        editData?.room_image,
        editData?.transport_image
    ]);


    const handleImageChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            setImages(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
        }
    };

    const validateStep = (step) => {
        setError('');
        if (step === 1 && (!formData.title || !formData.location || !formData.price || !formData.destination_id)) {
            setError("Please fill in Title, Location, Destination, and Price.");
            return false;
        }
        // If creating new, require photo. If editing, they already have a photo so it's fine.
        if (step === 3 && !images.photo && !editData?.photo) {
            setError("A main Cover Photo is required to list an accommodation.");
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
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('location', formData.location);
            submitData.append('price', formData.price);
            submitData.append('accommodation_type', formData.accommodation_type);
            submitData.append('room_type', formData.room_type);
            submitData.append('destination_id', formData.destination_id);
            submitData.append('amenities', JSON.stringify(amenities));
            submitData.append('offer_transportation', formData.offer_transportation ? "true" : "false");

            if (formData.offer_transportation) {
                submitData.append('vehicle_type', formData.vehicle_type);
                submitData.append('transport_capacity', formData.transport_capacity || 0);
            }

            // Only append the files if the user actually uploaded new ones
            if (images.photo) submitData.append('photo', images.photo);
            if (images.room) submitData.append('room_image', images.room);
            if (formData.offer_transportation && images.transport) submitData.append('transport_image', images.transport);

            if (editData) {
                const response = await api.patch(`api/accommodations/${editData.id}/`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                onAccommodationUpdated(response.data);
            } else {
                const response = await api.post('api/accommodations/', submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                onAccommodationAdded(response.data);
            }

            onClose();
        } catch (err) {
            console.error("Failed to save accommodation:", err);
            setError(err.response?.data?.detail || "Failed to list accommodation. Please check inputs.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderStepIndicators = () => (
        <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map((step, idx) => (
                <React.Fragment key={step}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${currentStep >= step ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-700 dark:border-slate-600'}`}>
                        {step}
                    </div>
                    {idx < 2 && <div className={`w-12 h-1 transition-colors ${currentStep > step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">

                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Home className="w-5 h-5 text-blue-500" /> {editData ? 'Edit Accommodation' : 'List New Accommodation'}
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
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">The Basics</h4>
                                <p className="text-sm text-slate-500">Let's start with the essential details.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Listing Title *</label>
                                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="e.g., Sunset Beach Villa" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Linked Destination *</label>
                                    <select value={formData.destination_id} onChange={e => setFormData({ ...formData, destination_id: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                                        <option value="" disabled>Select Destination</option>
                                        {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> Exact Address *</label>
                                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="123 Beachfront Rd" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Property Type</label>
                                    <select value={formData.accommodation_type} onChange={e => setFormData({ ...formData, accommodation_type: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                                        <option value="Hotel">Hotel</option>
                                        <option value="Resort">Resort</option>
                                        <option value="Homestay">Homestay</option>
                                        <option value="Hostel">Hostel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1"><PhilippinePeso className="w-4 h-4 text-slate-400" /> Price per Night *</label>
                                    <input type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                    <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" placeholder="What makes your place special?"></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Room & Amenities</h4>
                                <p className="text-sm text-slate-500">What does the space offer?</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Room Arrangement</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Single', 'Double', 'Suite', 'Family'].map(type => (
                                        <button key={type} onClick={() => setFormData({ ...formData, room_type: type })} className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${formData.room_type === type ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Included Amenities</label>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.keys(amenities).map(key => (
                                        <button key={key} onClick={() => setAmenities({ ...amenities, [key]: !amenities[key] })} className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${amenities[key] ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                            {key.charAt(0).toUpperCase() + key.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Room Interior Photo</label>
                                <label className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 cursor-pointer overflow-hidden hover:bg-slate-100 transition-colors">
                                    {previews.room ? (
                                        <img src={previews.room} className="w-full h-full object-cover" alt="Room" />
                                    ) : (
                                        <div className="text-center">
                                            <Bed className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                                            <span className="text-sm font-bold text-slate-500">Upload Room Photo</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange('room', e)} />
                                </label>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Media & Logistics</h4>
                                <p className="text-sm text-slate-500">Final touches to make it stand out.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Main Cover Photo *</label>
                                <label className="w-full h-48 border-2 border-dashed border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-blue-100 transition-colors">
                                    {previews.photo ? (
                                        <img src={previews.photo} className="w-full h-full object-cover" alt="Cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                                            <span className="text-sm font-bold text-blue-600">Upload Cover Photo</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange('photo', e)} />
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <input type="checkbox" checked={formData.offer_transportation} onChange={e => setFormData({ ...formData, offer_transportation: e.target.checked })} className="w-5 h-5 text-blue-600 rounded border-slate-300" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Car className="w-4 h-4 text-emerald-500" /> Offer Transportation?</span>
                                        <span className="text-xs text-slate-500">Check this if you provide guest pickup/dropoff</span>
                                    </div>
                                </label>

                                {formData.offer_transportation && (
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Type</label>
                                            <input type="text" value={formData.vehicle_type} onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Van, Boat" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Max Capacity</label>
                                            <input type="number" min="1" value={formData.transport_capacity} onChange={e => setFormData({ ...formData, transport_capacity: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pax" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Photo</label>
                                            <label className="w-full h-[42px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 cursor-pointer overflow-hidden">
                                                {previews.transport ? <img src={previews.transport} className="w-full h-full object-cover" alt="Transport" /> : <span className="text-xs font-bold text-slate-500">Upload</span>}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange('transport', e)} />
                                            </label>
                                        </div>
                                    </div>
                                )}
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
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? 'Processing...' : (currentStep === 3 ? (editData ? 'Save Changes' : 'List Property') : 'Next Step')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}