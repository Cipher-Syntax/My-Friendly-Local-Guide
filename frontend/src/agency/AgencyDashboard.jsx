import React, { useState, useMemo } from 'react';
import { Calendar, Users, Star, TrendingUp, Clock, MapPin, User, Plus, Search, Phone, Mail, Award, CheckCircle, UserX } from 'lucide-react';
import { DashboardStats, BookingsList, TourGuideList } from '../components/agency';
import AgencyHeader from '../assets/agencyHeader.png';
import { Link } from 'react-router-dom';

export default function AgencyDashboard() {
    // --- State & Data Setup ---
    const [bookings, setBookings] = useState([
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
    ]);

    const [tourGuides] = useState([
        { id: 1, name: 'John Dubois', shortName: 'John D.', rating: 4.9, tours: 156, languages: ['English', 'French', 'Spanish'], specialty: 'Historical Tours', phone: '+33 6 12 34 56 78', email: 'john.d@tours.com', avatar: 'JD', available: true },
        { id: 2, name: 'Maria Santos', shortName: 'Maria S.', rating: 4.8, tours: 142, languages: ['English', 'Italian', 'Portuguese'], specialty: 'Art & Culture', phone: '+39 345 678 9012', email: 'maria.s@tours.com', avatar: 'MS', available: true },
        { id: 3, name: 'Paolo Bubboni', shortName: 'Paolo B.', rating: 4.7, tours: 98, languages: ['English', 'Italian'], specialty: 'Food & Wine', phone: '+39 320 123 4567', email: 'paolo.b@tours.com', avatar: 'PB', available: false },
        { id: 4, name: 'Sophie Laurent', shortName: 'Sophie L.', rating: 4.9, tours: 203, languages: ['English', 'French', 'German'], specialty: 'Architecture', phone: '+33 7 98 76 54 32', email: 'sophie.l@tours.com', avatar: 'SL', available: true },
        { id: 5, name: 'Carlos Rodriguez', shortName: 'Carlos R.', rating: 4.6, tours: 87, languages: ['English', 'Spanish', 'French'], specialty: 'Adventure Tours', phone: '+34 612 345 678', email: 'carlos.r@tours.com', avatar: 'CR', available: true }
    ]);

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

    // --- R,ender ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <Link to="/agency-draft">Agency Draft</Link>
            <header className='w-[100%]'>
                <div className="w-[100%] mx-auto px-6 py-4" style={{
                    backgroundImage: `url(${AgencyHeader})`,
                    objectFit: "cover",
                    backgroundRepeat: "no-repeat"
                }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Agency Dashboard</h1>
                            <p className="text-slate-400 text-sm mt-1">Manage your tour bookings and guides</p>
                        </div>
                        {/* <div className="flex items-center gap-4">
                            <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                                New Booking
                            </button>
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                        </div> */}
                    </div>
                </div>
            </header >

            {/* Hero Banner */}
            <div className="relative h-32 text-center overflow-hidden flex items-center justify-center">
                <div className="relative max-w-[1800px] mx-auto px-6 h-full flex items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">TOUR GUIDES & BOOKINGS</h2>
                        <p className="text-white/80">Overview of all activities</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto px-6 py-8">
                {/* Stats Grid - CALLING DashboardStats */}
                <DashboardStats tourGuides={tourGuides} />

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Bookings Section - CALLING BookingsList */}
                    <BookingsList
                        bookings={bookings}
                        selectedBookingId={selectedBookingId}
                        setSelectedBookingId={setSelectedBookingId}
                        getGuideNames={getGuideNames}
                        getStatusBg={getStatusBg}
                        getStatusColor={getStatusColor}
                    />

                    {/* Tour Guides Section - CALLING TourGuideList */}
                    <TourGuideList
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredGuides={filteredGuides}
                        currentSelectedBooking={currentSelectedBooking}
                        selectedBookingId={selectedBookingId}
                        assignGuide={assignGuide}
                    />
                </div>
            </div>
        </div >
    );
}