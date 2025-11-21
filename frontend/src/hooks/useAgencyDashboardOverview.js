import { useState, useMemo } from 'react';
import { MapPin, User } from 'lucide-react'; // Example icons, adjust as needed

// Initial Data (Moved from AgencyDashboard.jsx)
const initialBookings = [
    {
        id: 1,
        name: 'French Versailles (Group)',
        guideIds: [], // Now an array of guide IDs
        status: 'pending',
        progress: 65,
        date: '2024-11-15',
        time: '09:00 AM',
        location: 'Versailles, France',
        groupSize: 18, // Added group size for context
    },
    {
        id: 2,
        name: 'Sistine Tours (Small)',
        guideIds: [2], // Guide ID 2 (Maria Santos) is assigned
        status: 'confirmed',
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
        status: 'cancelled',
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

export const useAgencyDashboardOverview = () => {
    const [bookings, setBookings] = useState(initialBookings);
    const [tourGuides] = useState(initialTourGuides); // Assuming tour guides are static for now
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    // --- Helper Functions ---
    const getStatusBg = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500/10 text-green-500';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500';
            case 'cancelled': return 'bg-red-500/10 text-red-500';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500';
            case 'pending': return 'bg-yellow-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    // Memoized helper to get guide short names by ID
    const getGuideNames = useMemo(() => (ids) => {
        return ids.map(id => {
            const guide = tourGuides.find(g => g.id === id);
            return guide ? guide.shortName : 'N/A';
        });
    }, [tourGuides]);

    // Memoized guide filtering
    const filteredGuides = useMemo(() => tourGuides.filter(guide =>
        guide.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.languages.some(lang => lang.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [tourGuides, searchTerm]);

    // Memoized current selected booking object
    const currentSelectedBooking = useMemo(() =>
        bookings.find(b => b.id === selectedBookingId)
        , [bookings, selectedBookingId]);

    // --- Action Handler ---
    const assignGuide = (bookingId, guide) => {
        setBookings(bookings.map(booking => {
            if (booking.id !== bookingId) {
                return booking;
            }

            const isAssigned = booking.guideIds.includes(guide.id);
            let newGuideIds;

            if (isAssigned) {
                // Remove guide (Deselect)
                newGuideIds = booking.guideIds.filter(id => id !== guide.id);
            } else {
                // Add guide (Select)
                newGuideIds = [...booking.guideIds, guide.id];
            }

            // Auto-confirm if at least one guide is assigned
            const newStatus = newGuideIds.length > 0 ? 'confirmed' : 'pending';

            return {
                ...booking,
                guideIds: newGuideIds,
                status: newStatus
            };
        }));
    };

    return {
        bookings,
        tourGuides,
        searchTerm,
        setSearchTerm,
        selectedBookingId,
        setSelectedBookingId,
        getStatusBg,
        getStatusColor,
        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        assignGuide,
    };
};
