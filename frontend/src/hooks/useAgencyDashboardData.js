import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export const availableLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
    'Dutch', 'Swedish', 'Polish', 'Greek', 'Turkish', 'Thai',
    'Vietnamese', 'Indonesian', 'Filipino', 'Hebrew', 'Danish', 'Norwegian'
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

    // Replace mock data with live state
    const [bookings, setBookings] = useState([]);
    const [tourGuides, setTourGuides] = useState([]);
    const [availableSpecialties, setAvailableSpecialties] = useState([]); // NEW: State for backend categories
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data from backend API
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                // NEW: Added the categories fetch to the Promise.all
                const [bookingsRes, guidesRes, categoriesRes] = await Promise.all([
                    api.get('api/bookings/'),
                    api.get('api/guides/'),
                    api.get('api/categories/') // Adjust this URL if your base route is different (e.g., 'api/destinations_and_attractions/categories/')
                ]);
                
                setBookings(bookingsRes.data.results || bookingsRes.data || []);
                setTourGuides(guidesRes.data.results || guidesRes.data || []);
                setAvailableSpecialties(categoriesRes.data || []); // Automatically populate the dropdown choices
                
            } catch (error) {
                console.error("Error fetching agency dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // --- Helper Functions ---
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
            return guide ? (guide.shortName || guide.name || guide.first_name) : 'N/A';
        });
    }, [tourGuides]);

    const filteredGuides = useMemo(() => tourGuides.filter(guide => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (guide.name || guide.first_name || '').toLowerCase().includes(searchLower);
        const specialtyMatch = (guide.specialty || '').toLowerCase().includes(searchLower);
        const langMatch = (guide.languages || []).some(lang => lang.toLowerCase().includes(searchLower));
        return nameMatch || specialtyMatch || langMatch;
    }), [tourGuides, searchTerm]);

    const currentSelectedBooking = useMemo(() =>
        bookings.find(b => b.id === selectedBookingId)
        , [bookings, selectedBookingId]);

    const assignGuide = async (bookingId, guide) => {
        setBookings(bookings.map(booking => {
            if (booking.id !== bookingId) {
                return booking;
            }

            const currentGuideIds = booking.guideIds || booking.assigned_guides || [];
            const isAssigned = currentGuideIds.includes(guide.id);
            let newGuideIds;

            if (isAssigned) {
                newGuideIds = currentGuideIds.filter(id => id !== guide.id);
            } else {
                newGuideIds = [...currentGuideIds, guide.id];
            }

            const newStatus = newGuideIds.length > 0 ? 'Accepted' : 'Pending_Payment';

            return {
                ...booking,
                guideIds: newGuideIds,
                assigned_guides: newGuideIds,
                status: newStatus
            };
        }));
    };

    const updateBookingStatus = async (bookingId, newStatus) => {
        setBookings(bookings.map(booking => {
            if (booking.id === bookingId) {
                return { ...booking, status: newStatus };
            }
            return booking;
        }));
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
        // State
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

        // Computed values
        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        filteredFormLanguages,
        availableSpecialties, // Now successfully coming from your Django backend!
        activeGuides,
        completedTours,
        avgRating,

        // Actions
        getStatusBg,
        assignGuide,
        updateBookingStatus,
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
        availableLanguages,
    };
};