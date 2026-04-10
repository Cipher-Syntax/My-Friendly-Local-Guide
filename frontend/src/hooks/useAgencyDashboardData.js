import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export const availableLanguages = [
    'English', 'Tagalog', 'Chavacano', 'Cebuano', 'Ilocano', 
    'Hiligaynon', 'Waray', 'Tausug', 'Kapampangan', 'Pangasinan', 
    'Bikolano', 'Maranao', 'Maguindanao', 'Yakan', 'Surigaonon'
].sort();

export const useAgencyDashboardData = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [guideToDelete, setGuideToDelete] = useState(null);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [newGuideForm, setNewGuideForm] = useState({
        fullName: '',
        specialty: '', 
        languages: [],
        phone: '',
        email: '',
        languageSearchTerm: '',
        showLanguageDropdown: false
    });

    const [bookings, setBookings] = useState([]);
    const [tourGuides, setTourGuides] = useState([]);
    const [availableSpecialties, setAvailableSpecialties] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    
    const [downPaymentPercentage, setDownPaymentPercentage] = useState(30);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const [bookingsRes, guidesRes, categoriesRes, profileRes] = await Promise.all([
                    api.get('api/bookings/'),
                    api.get('api/guides/'),
                    api.get('api/categories/'),
                    api.get('api/agency/profile/').catch(() => ({ data: null }))
                ]);
                
                setBookings(bookingsRes.data.results || bookingsRes.data || []);
                setTourGuides(guidesRes.data.results || guidesRes.data || []);
                setAvailableSpecialties(categoriesRes.data || []); 

                if (profileRes && profileRes.data) {
                    setDownPaymentPercentage(profileRes.data.down_payment_percentage || 30);
                }
                
            } catch (error) {
                console.error("Error fetching agency dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleUpdateDownPayment = async (newPercentage) => {
        try {
            setIsSavingSettings(true);
            await api.patch(`api/agency/profile/`, { down_payment_percentage: newPercentage });
            setDownPaymentPercentage(newPercentage);
            alert("Downpayment percentage updated successfully!");
        } catch (error) {
            console.error("Error updating settings:", error);
            alert("Failed to update settings.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const getStatusBg = (status) => {
        const lowerStatus = status?.toLowerCase();
        switch (lowerStatus) {
            case 'accepted': 
            case 'confirmed': 
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'pending': 
            case 'pending_payment':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'declined': 
            case 'cancelled': 
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: 
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getGuideNames = useMemo(() => (ids) => {
        if (!ids || !Array.isArray(ids)) return ['N/A'];
        return ids.map(id => {
            const guide = tourGuides.find(g => g.id === id);
            return guide ? (guide.shortName || guide.name || guide.full_name || guide.first_name) : 'N/A';
        });
    }, [tourGuides]);

    const filteredGuides = useMemo(() => tourGuides.filter(guide => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (guide.name || guide.full_name || guide.first_name || '').toLowerCase().includes(searchLower);
        const specialtyMatch = (guide.specialty || guide.specialization || '').toLowerCase().includes(searchLower);
        const langMatch = (guide.languages || []).some(lang => lang.toLowerCase().includes(searchLower));
        return nameMatch || specialtyMatch || langMatch;
    }), [tourGuides, searchTerm]);

    const currentSelectedBooking = useMemo(() =>
        bookings.find(b => b.id === selectedBookingId)
        , [bookings, selectedBookingId]);

    const assignGuide = async (bookingId, guide) => {
        const targetBooking = bookings.find(b => b.id === bookingId);
        if (!targetBooking) return;

        const currentGuideIds = targetBooking.guideIds || targetBooking.assigned_agency_guides || targetBooking.assigned_guides || [];
        const isAssigned = currentGuideIds.includes(guide.id);
        let newGuideIds;

        if (isAssigned) {
            newGuideIds = currentGuideIds.filter(id => id !== guide.id);
        } else {
            newGuideIds = [...currentGuideIds, guide.id];
        }

        const currentStatus = targetBooking.status;

        setBookings(prevBookings => prevBookings.map(booking => {
            if (booking.id !== bookingId) return booking;
            return {
                ...booking,
                guideIds: newGuideIds,
                assigned_guides: newGuideIds,
                assigned_agency_guides: newGuideIds,
                status: currentStatus 
            };
        }));

        try {
            await api.patch(`api/bookings/${bookingId}/`, {
                assigned_agency_guides: newGuideIds,
            });
            console.log(`Successfully saved guide assignment for booking ${bookingId}`);
        } catch (error) {
            console.error("Failed to save guide assignment to database:", error);
        }
    };

    const updateGuideAssignments = async (bookingId, newGuideIds) => {
        const targetBooking = bookings.find(b => b.id === bookingId);
        if (!targetBooking) return;
        
        // FIX: Keep the current status so the Accept button doesn't disappear
        const currentStatus = targetBooking.status;

        setBookings(prevBookings => prevBookings.map(booking => {
            if (booking.id !== bookingId) return booking;
            return {
                ...booking,
                guideIds: newGuideIds,
                assigned_guides: newGuideIds,
                assigned_agency_guides: newGuideIds,
                status: currentStatus
            };
        }));

        try {
            await api.patch(`api/bookings/${bookingId}/`, {
                assigned_agency_guides: newGuideIds,
            });
            console.log(`Successfully Auto-Assigned guides to booking ${bookingId}`);
        } catch (error) {
            console.error("Failed to auto-assign guides to database:", error);
        }
    };

    const updateBookingStatus = async (bookingId, newStatus, extraData = {}) => {
        setBookings(prevBookings => prevBookings.map(booking => {
            if (booking.id === bookingId) {
                return { ...booking, status: newStatus, ...extraData };
            }
            return booking;
        }));

        try {
            const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
            await api.patch(`api/bookings/${bookingId}/`, {
                status: capitalizedStatus,
                ...extraData
            });
            console.log(`Successfully updated booking ${bookingId} status to ${capitalizedStatus}`);
        } catch (error) {
            console.error("Failed to update booking status in database:", error);
        }
    };

    // FIX FOR PAYMENT: Uses the dedicated mark_paid endpoint on the backend
    const confirmPayment = async (bookingId) => {
        setBookings(prevBookings => prevBookings.map(booking => {
            if (booking.id === bookingId) {
                return { ...booking, status: 'Completed', balance_due: 0 };
            }
            return booking;
        }));

        try {
            await api.post(`api/bookings/${bookingId}/mark_paid/`);
            console.log(`Successfully marked booking ${bookingId} as paid`);
        } catch (error) {
            console.error("Failed to mark booking as paid:", error);
        }
    };

    const openManageGuidesModal = (bookingId) => {
        setSelectedBookingId(bookingId);
        setIsModalOpen(true);
        setSearchTerm('');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBookingId(null);
        setSearchTerm('');
    };

    const openAddGuideModal = () => {
        setIsAddGuideModalOpen(true);
        setNewGuideForm({
            fullName: '',
            specialty: '',
            languages: [],
            phone: '',
            email: '',
            languageSearchTerm: '',
            showLanguageDropdown: false
        });
    };

    const closeAddGuideModal = () => {
        setIsAddGuideModalOpen(false);
        setNewGuideForm({
            fullName: '',
            specialty: '',
            languages: [],
            phone: '',
            email: '',
            languageSearchTerm: '',
            showLanguageDropdown: false
        });
    };

    const handleAddLanguage = (language) => {
        if (!newGuideForm.languages.includes(language)) {
            setNewGuideForm(prev => ({
                ...prev,
                languages: [...prev.languages, language],
                languageSearchTerm: ''
            }));
        }
    };

    const handleRemoveLanguage = (language) => {
        setNewGuideForm(prev => ({
            ...prev,
            languages: prev.languages.filter(lang => lang !== language)
        }));
    };

    const filteredFormLanguages = useMemo(() => availableLanguages.filter(lang =>
        lang.toLowerCase().includes(newGuideForm.languageSearchTerm.toLowerCase()) &&
        !newGuideForm.languages.includes(lang)
    ), [newGuideForm.languageSearchTerm, newGuideForm.languages]);

    const handleSubmitNewGuide = async () => {
        if (newGuideForm.fullName && newGuideForm.specialty && newGuideForm.languages.length > 0 && newGuideForm.phone && newGuideForm.email) {
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const newGuide = {
                id: tourGuides.length + 1,
                name: newGuideForm.fullName,
                shortName: newGuideForm.fullName.split(' ').map(n => n[0]).join('').slice(0, 2),
                rating: 0,
                tours: 0,
                languages: newGuideForm.languages,
                specialty: newGuideForm.specialty,
                phone: newGuideForm.phone,
                email: newGuideForm.email,
                avatar: newGuideForm.fullName.split(' ').map(n => n[0]).join('').slice(0, 2),
                available: true
            };
            setTourGuides([...tourGuides, newGuide]);
            closeAddGuideModal();
        }
    };

    const handleRemoveGuide = (guideId) => {
        setGuideToDelete(guideId);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteGuide = async () => {
        if (guideToDelete) {
            setTourGuides(tourGuides.filter(guide => guide.id !== guideToDelete));
            setIsDeleteConfirmOpen(false);
            setGuideToDelete(null);
        }
    };

    const cancelDeleteGuide = () => {
        setIsDeleteConfirmOpen(false);
        setGuideToDelete(null);
    };

    const activeGuides = tourGuides.filter(g => g.available || g.is_active).length;
    const completedTours = bookings.filter(b => b.status === 'Completed').length; 
    const avgRating = tourGuides.length > 0 
        ? tourGuides.reduce((acc, guide) => acc + (guide.rating || guide.average_rating || 0), 0) / tourGuides.length 
        : 0;

    const handleSignOut = () => {
        localStorage.removeItem('ACCESS_TOKEN'); 
        localStorage.removeItem('REFRESH_TOKEN');
        navigate('/agency-signin');
    };

    return {
        activeTab,
        setActiveTab,
        isModalOpen,
        setIsModalOpen,
        isAddGuideModalOpen,
        setIsAddGuideModalOpen,
        isDeleteConfirmOpen,
        setIsDeleteConfirmOpen,
        guideToDelete,
        setGuideToDelete,
        selectedBookingId,
        setSelectedBookingId,
        searchTerm,
        setSearchTerm,
        newGuideForm,
        setNewGuideForm,
        bookings,
        setBookings,
        tourGuides,
        setTourGuides,
        isLoading,
        downPaymentPercentage,
        setDownPaymentPercentage,
        isSavingSettings,

        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        filteredFormLanguages,
        availableSpecialties,
        activeGuides,
        completedTours,
        avgRating,

        getStatusBg,
        assignGuide,
        updateGuideAssignments,
        updateBookingStatus,
        confirmPayment,
        openManageGuidesModal,
        closeModal,
        openAddGuideModal,
        closeAddGuideModal,
        handleAddLanguage,
        handleRemoveLanguage,
        handleSubmitNewGuide,
        handleRemoveGuide,
        confirmDeleteGuide,
        cancelDeleteGuide,
        handleSignOut,
        handleUpdateDownPayment,
        availableLanguages,
    };
};