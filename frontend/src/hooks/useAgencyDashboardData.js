import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const availableLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
    'Dutch', 'Swedish', 'Polish', 'Greek', 'Turkish', 'Thai',
    'Vietnamese', 'Indonesian', 'Filipino', 'Hebrew', 'Danish', 'Norwegian'
].sort();

const initialBookings = [
    {
        id: 1,
        name: 'French Versailles (Group)',
        guideIds: [],
        status: 'pending',
        progress: 65,
        date: '2024-11-15',
        time: '09:00 AM',
        location: 'Versailles, France',
        groupSize: 18,
    },
    {
        id: 2,
        name: 'Sistine Tours (Small)',
        guideIds: [2],
        status: 'accepted',
        progress: 45,
        date: '2024-11-16',
        time: '02:00 PM',
        location: 'Vatican City',
        groupSize: 5,
    },
    {
        id: 3,
        name: 'Paolo Bubboni (Solo)',
        guideIds: [3],
        status: 'declined',
        progress: 0,
        date: '2024-11-14',
        time: '11:30 AM',
        location: 'Rome, Italy',
        groupSize: 1,
    }
];

const initialTourGuides = [
    { id: 1, name: 'John Dubois', shortName: 'John D.', rating: 4.9, tours: 156, languages: ['English', 'French', 'Spanish'], specialty: 'Historical Tours', phone: '+33 6 12 34 56 78', email: 'john.d@tours.com', avatar: 'JD', available: true },
    { id: 2, name: 'Maria Santos', shortName: 'Maria S.', rating: 4.8, tours: 142, languages: ['English', 'Italian', 'Portuguese'], specialty: 'Art & Culture', phone: '+39 345 678 9012', email: 'maria.s@tours.com', avatar: 'MS', available: true },
    { id: 3, name: 'Paolo Bubboni', shortName: 'Paolo B.', rating: 4.7, tours: 98, languages: ['English', 'Italian'], specialty: 'Food & Wine', phone: '+39 320 123 4567', email: 'paolo.b@tours.com', avatar: 'PB', available: false },
    { id: 4, name: 'Sophie Laurent', shortName: 'Sophie L.', rating: 4.9, tours: 203, languages: ['English', 'French', 'German'], specialty: 'Architecture', phone: '+33 7 98 76 54 32', email: 'sophie.l@tours.com', avatar: 'SL', available: true },
    { id: 5, name: 'Carlos Rodriguez', shortName: 'Carlos R.', rating: 4.6, tours: 87, languages: ['English', 'Spanish', 'French'], specialty: 'Adventure Tours', phone: '+34 612 345 678', email: 'carlos.r@tours.com', avatar: 'CR', available: true }
];

export const useAgencyDashboardData = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false); // For Manage Guides Modal
    const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [guideToDelete, setGuideToDelete] = useState(null);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // For guide search in modal
    const [newGuideForm, setNewGuideForm] = useState({
        fullName: '',
        specialty: '',
        languages: [],
        phone: '',
        email: '',
        languageSearchTerm: '',
        showLanguageDropdown: false
    });

    const [bookings, setBookings] = useState(initialBookings);
    const [tourGuides, setTourGuides] = useState(initialTourGuides);

    // --- Helper Functions ---
    const getStatusBg = (status) => {
        switch (status) {
            case 'accepted': return 'bg-green-500/10 text-green-500';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500';
            case 'declined': return 'bg-red-500/10 text-red-500';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    const getGuideNames = useMemo(() => (ids) => {
        return ids.map(id => {
            const guide = tourGuides.find(g => g.id === id);
            return guide ? guide.shortName : 'N/A';
        });
    }, [tourGuides]);

    const filteredGuides = useMemo(() => tourGuides.filter(guide =>
        guide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.languages.some(lang => lang.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [tourGuides, searchTerm]);

    const currentSelectedBooking = useMemo(() =>
        bookings.find(b => b.id === selectedBookingId)
        , [bookings, selectedBookingId]);

    const assignGuide = (bookingId, guide) => {
        setBookings(bookings.map(booking => {
            if (booking.id !== bookingId) {
                return booking;
            }

            const isAssigned = booking.guideIds.includes(guide.id);
            let newGuideIds;

            if (isAssigned) {
                newGuideIds = booking.guideIds.filter(id => id !== guide.id);
            } else {
                newGuideIds = [...booking.guideIds, guide.id];
            }

            const newStatus = newGuideIds.length > 0 ? 'accepted' : 'pending';

            return {
                ...booking,
                guideIds: newGuideIds,
                status: newStatus
            };
        }));
    };

    const updateBookingStatus = (bookingId, newStatus) => {
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

    const handleSubmitNewGuide = () => {
        if (newGuideForm.fullName && newGuideForm.specialty && newGuideForm.languages.length > 0 && newGuideForm.phone && newGuideForm.email) {
            const newGuide = {
                id: tourGuides.length + 1,
                name: newGuideForm.fullName,
                shortName: newGuideForm.fullName.split(' ').map(n => n[0]).join('').slice(0, 2),
                rating: 4.5,
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

    const confirmDeleteGuide = () => {
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

    const activeGuides = tourGuides.filter(g => g.available).length;
    const completedTours = 15; // Mock data for now
    const avgRating = 4.8; // Mock data for now

    const handleSignOut = () => {
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

        // Computed values
        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        filteredFormLanguages,
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
    };
};