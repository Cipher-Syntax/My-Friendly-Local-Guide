import React, { useState, useMemo } from 'react';
import { Calendar, Users, Star, TrendingUp, Clock, MapPin, User, Plus, Search, Phone, Mail, Award, CheckCircle, UserX, X, LayoutDashboard, BookOpen, UsersRound, Check, XCircle, Trash2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AgencyDashboard() {
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

    const availableLanguages = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
        'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
        'Dutch', 'Swedish', 'Polish', 'Greek', 'Turkish', 'Thai',
        'Vietnamese', 'Indonesian', 'Filipino', 'Hebrew', 'Danish', 'Norwegian'
    ].sort();

    const [bookings, setBookings] = useState([
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
    ]);

    const [tourGuides, setTourGuides] = useState([
        { id: 1, name: 'John Dubois', shortName: 'John D.', rating: 4.9, tours: 156, languages: ['English', 'French', 'Spanish'], specialty: 'Historical Tours', phone: '+33 6 12 34 56 78', email: 'john.d@tours.com', avatar: 'JD', available: true },
        { id: 2, name: 'Maria Santos', shortName: 'Maria S.', rating: 4.8, tours: 142, languages: ['English', 'Italian', 'Portuguese'], specialty: 'Art & Culture', phone: '+39 345 678 9012', email: 'maria.s@tours.com', avatar: 'MS', available: true },
        { id: 3, name: 'Paolo Bubboni', shortName: 'Paolo B.', rating: 4.7, tours: 98, languages: ['English', 'Italian'], specialty: 'Food & Wine', phone: '+39 320 123 4567', email: 'paolo.b@tours.com', avatar: 'PB', available: false },
        { id: 4, name: 'Sophie Laurent', shortName: 'Sophie L.', rating: 4.9, tours: 203, languages: ['English', 'French', 'German'], specialty: 'Architecture', phone: '+33 7 98 76 54 32', email: 'sophie.l@tours.com', avatar: 'SL', available: true },
        { id: 5, name: 'Carlos Rodriguez', shortName: 'Carlos R.', rating: 4.6, tours: 87, languages: ['English', 'Spanish', 'French'], specialty: 'Adventure Tours', phone: '+34 612 345 678', email: 'carlos.r@tours.com', avatar: 'CR', available: true }
    ]);

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

    const filteredLanguages = availableLanguages.filter(lang =>
        lang.toLowerCase().includes(newGuideForm.languageSearchTerm.toLowerCase()) &&
        !newGuideForm.languages.includes(lang)
    );

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
    const completedTours = 15;
    const avgRating = 4.8;

    const handleSignOut = () => {
        navigate('/agency-signin');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
                <div className="p-6 border-b border-slate-700/50">
                    <h1 className="text-xl font-bold text-white">Agency Administration</h1>
                    <p className="text-slate-400 text-sm mt-1">Tour Management</p>
                </div>

                <nav className="flex-1 p-4">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                            activeTab === 'dashboard' 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                        }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                            activeTab === 'bookings' 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                        }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        <span className="font-medium">Bookings Management</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('guides')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                            activeTab === 'guides' 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                        }`}
                    >
                        <UsersRound className="w-5 h-5" />
                        <span className="font-medium">Tour Guide Management</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 px-4 py-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">Admin User</p>
                            <p className="text-slate-400 text-xs">admin@agency.com</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all border border-transparent hover:border-cyan-500/30"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
                    <div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                        </div>
                        
                        {/* Header Content */}
                        <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-4">
                                {/* Icon for each tab */}
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                                    {activeTab === 'dashboard' && <LayoutDashboard className="w-8 h-8 text-white" />}
                                    {activeTab === 'bookings' && <BookOpen className="w-8 h-8 text-white" />}
                                    {activeTab === 'guides' && <UsersRound className="w-8 h-8 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white">
                                        {activeTab === 'dashboard' && 'Dashboard Overview'}
                                        {activeTab === 'bookings' && 'Bookings Management'}
                                        {activeTab === 'guides' && 'Tour Guide Management'}
                                    </h2>
                                    <p className="text-cyan-100 mt-1">
                                        {activeTab === 'dashboard' && 'Monitor your agency performance and statistics'}
                                        {activeTab === 'bookings' && 'Manage and assign tour guides to bookings'}
                                        {activeTab === 'guides' && 'View and manage your tour guide roster'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-sm font-medium">Total Bookings</h3>
                                        <Calendar className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <p className="text-4xl font-bold text-white mb-1">127</p>
                                    <p className="text-slate-500 text-sm">For this month</p>
                                </div>

                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-sm font-medium">Active Guides</h3>
                                        <Users className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <p className="text-4xl font-bold text-white mb-1">{activeGuides}</p>
                                    <p className="text-slate-500 text-sm">Total: {tourGuides.length} guides</p>
                                </div>

                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-sm font-medium">Completed Tours</h3>
                                        <MapPin className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <p className="text-4xl font-bold text-white mb-1">{completedTours}</p>
                                    <p className="text-slate-500 text-sm">This month</p>
                                </div>

                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-sm font-medium">Average Rating</h3>
                                        <Star className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <p className="text-4xl font-bold text-white mb-1">{avgRating}</p>
                                    <div className="flex gap-1 mt-2">
                                        {[1,2,3,4,5].map(i => (
                                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Booking Trends Chart */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-white text-lg font-semibold">Booking Trends</h3>
                                        <p className="text-slate-400 text-sm mt-1">Monthly bookings overview</p>
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                                </div>
                                
                                <div className="h-64 flex items-end justify-between gap-2">
                                    {[
                                        { month: 'Jan', value: 45, label: '45' },
                                        { month: 'Feb', value: 52, label: '52' },
                                        { month: 'Mar', value: 48, label: '48' },
                                        { month: 'Apr', value: 65, label: '65' },
                                        { month: 'May', value: 72, label: '72' },
                                        { month: 'Jun', value: 68, label: '68' },
                                        { month: 'Jul', value: 85, label: '85' },
                                        { month: 'Aug', value: 92, label: '92' },
                                        { month: 'Sep', value: 78, label: '78' },
                                        { month: 'Oct', value: 95, label: '95' },
                                        { month: 'Nov', value: 127, label: '127' },
                                        { month: 'Dec', value: 0, label: '0' }
                                    ].map((data, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="relative w-full flex flex-col items-center">
                                                <span className="text-white text-xs font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {data.label}
                                                </span>
                                                <div 
                                                    className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all hover:from-cyan-400 hover:to-blue-400"
                                                    style={{ height: `${(data.value / 127) * 100}%`, minHeight: data.value > 0 ? '8px' : '2px' }}
                                                ></div>
                                            </div>
                                            <span className="text-slate-500 text-xs font-medium">{data.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Guide Performance & Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Performing Guides */}
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white text-lg font-semibold">Top Performing Guides</h3>
                                        <Award className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div className="space-y-3">
                                        {tourGuides
                                            .sort((a, b) => b.rating - a.rating)
                                            .slice(0, 4)
                                            .map((guide, idx) => (
                                                <div key={guide.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {guide.avatar}
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{guide.name}</p>
                                                            <p className="text-slate-400 text-xs">{guide.tours} tours</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                        <span className="text-white text-sm font-semibold">{guide.rating}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Upcoming Tours */}
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white text-lg font-semibold">Upcoming Tours</h3>
                                        <Clock className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="space-y-3">
                                        {bookings
                                            .filter(b => b.status !== 'declined')
                                            .slice(0, 4)
                                            .map((booking) => (
                                                <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                            <MapPin className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium">{booking.name}</p>
                                                            <p className="text-slate-400 text-xs">{booking.date}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBg(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    

                    {/* Bookings Management Tab */}
                    {activeTab === 'bookings' && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Booking Name</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Date & Time</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Location</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Group Size</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Assigned Guides</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Action</th>
                                            <th className="text-left px-6 py-4 text-slate-400 font-medium text-sm">Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings.map((booking) => (
                                            <tr key={booking.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                                            <MapPin className="w-5 h-5 text-cyan-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{booking.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-white text-sm">{booking.date}</p>
                                                    <p className="text-slate-400 text-xs">{booking.time}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-white text-sm">{booking.location}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-white text-sm">{booking.groupSize} people</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {booking.guideIds.length > 0 ? (
                                                            getGuideNames(booking.guideIds).map((name, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                                    {name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-slate-500 text-sm">No guides assigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => openManageGuidesModal(booking.id)}
                                                        disabled={booking.status === 'declined'}
                                                        className={`px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                                                            booking.status === 'declined'
                                                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                                : 'bg-cyan-500 hover:bg-cyan-600'
                                                        }`}
                                                    >
                                                        Manage Guides
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                                            disabled={booking.status === 'declined'}
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                booking.status === 'accepted'
                                                                    ? 'bg-green-500 text-white'
                                                                    : booking.status === 'declined'
                                                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-green-400'
                                                            }`}
                                                            title={booking.status === 'declined' ? 'Cannot accept after declining' : 'Accept booking'}
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => updateBookingStatus(booking.id, 'declined')}
                                                            disabled={booking.status === 'accepted'}
                                                            className={`p-2 rounded-lg transition-colors ${
                                                                booking.status === 'declined'
                                                                    ? 'bg-red-500 text-white'
                                                                    : booking.status === 'accepted'
                                                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                                                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-red-400'
                                                            }`}
                                                            title={booking.status === 'accepted' ? 'Cannot decline after accepting' : 'Decline booking'}
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tour Guides Management Tab */}
                    {activeTab === 'guides' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search guides by name, specialty, or language..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={openAddGuideModal}
                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl transition-colors font-medium"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Guide
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredGuides.map((guide) => (
                                    <div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition-all relative group">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleRemoveGuide(guide.id)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                                title="Remove guide"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                                    guide.available ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-slate-600'
                                                }`}>
                                                    {guide.avatar}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-white font-semibold">{guide.name}</h3>
                                                        {guide.available && (
                                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-sm">{guide.specialty}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                <span className="text-white text-sm">{guide.rating}</span>
                                                <span className="text-slate-500 text-xs">({guide.tours} tours)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {guide.languages.map((lang, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                                                        {lang}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-slate-700/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <Phone className="w-4 h-4" />
                                                <span>{guide.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <Mail className="w-4 h-4" />
                                                <span>{guide.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Managing Guides */}
            {isModalOpen && currentSelectedBooking && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">Manage Tour Guides</h3>
                                <p className="text-slate-400 text-sm mt-1">{currentSelectedBooking.name}</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Booking Info */}
                        <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Date</p>
                                    <p className="text-white font-medium">{currentSelectedBooking.date}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Time</p>
                                    <p className="text-white font-medium">{currentSelectedBooking.time}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Location</p>
                                    <p className="text-white font-medium">{currentSelectedBooking.location}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Group Size</p>
                                    <p className="text-white font-medium">{currentSelectedBooking.groupSize} people</p>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4 border-b border-slate-700/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search guides..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>
                        </div>

                        {/* Guides List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {filteredGuides.map((guide) => {
                                    const isAssigned = currentSelectedBooking.guideIds.includes(guide.id);
                                    return (
                                        <div
                                            key={guide.id}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                                isAssigned
                                                    ? 'bg-cyan-500/10 border-cyan-500/50'
                                                    : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                                            }`}
                                            onClick={() => assignGuide(selectedBookingId, guide)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                                        guide.available ? 'bg-gradient-to-br from-cyan-500 to-blue-500' : 'bg-slate-600'
                                                    }`}>
                                                        {guide.avatar}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-white font-semibold">{guide.name}</h4>
                                                            {guide.available && (
                                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                            )}
                                                            {!guide.available && (
                                                                <span className="text-xs text-red-400">(Unavailable)</span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-400 text-sm">{guide.specialty}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                            <span className="text-slate-400 text-xs">{guide.rating} • {guide.tours} tours</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isAssigned ? (
                                                        <CheckCircle className="w-6 h-6 text-cyan-400" />
                                                    ) : (
                                                        <Plus className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Adding Tour Guide */}
            {isAddGuideModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">Add New Tour Guide</h3>
                                <p className="text-slate-400 text-sm mt-1">Fill in the guide information</p>
                            </div>
                            <button
                                onClick={closeAddGuideModal}
                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-white text-base font-semibold mb-3">Full Name</label>
                                    <input
                                        type="text"
                                        value={newGuideForm.fullName}
                                        onChange={(e) => setNewGuideForm(prev => ({ ...prev, fullName: e.target.value }))}
                                        placeholder="Enter full name"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                    />
                                </div>

                                {/* Specialty */}
                                <div>
                                    <label className="block text-white text-base font-semibold mb-3">Specialty</label>
                                    <input
                                        type="text"
                                        value={newGuideForm.specialty}
                                        onChange={(e) => setNewGuideForm(prev => ({ ...prev, specialty: e.target.value }))}
                                        placeholder="e.g., Historical Tours, Art & Culture"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                    />
                                </div>

                                {/* Languages */}
                                <div>
                                    <label className="block text-white text-base font-semibold mb-3">Languages</label>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            value={newGuideForm.languageSearchTerm}
                                            onChange={(e) => setNewGuideForm(prev => ({ ...prev, languageSearchTerm: e.target.value, showLanguageDropdown: true }))}
                                            onFocus={() => setNewGuideForm(prev => ({ ...prev, showLanguageDropdown: true }))}
                                            placeholder="Search and select languages..."
                                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                        />
                                        {newGuideForm.showLanguageDropdown && filteredLanguages.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                                {filteredLanguages.map((lang, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            handleAddLanguage(lang);
                                                            setNewGuideForm(prev => ({ ...prev, showLanguageDropdown: false }));
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-cyan-500/20 text-white transition-colors hover:text-cyan-400 text-sm"
                                                    >
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {newGuideForm.languages.length > 0 ? (
                                            newGuideForm.languages.map((lang, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-cyan-400 text-sm font-medium"
                                                >
                                                    {lang}
                                                    <button
                                                        onClick={() => handleRemoveLanguage(lang)}
                                                        className="hover:text-cyan-300 transition-colors ml-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-slate-500 text-sm">No languages selected</span>
                                        )}
                                    </div>
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-white text-base font-semibold mb-3">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={newGuideForm.phone}
                                        onChange={(e) => setNewGuideForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="e.g., +33 6 12 34 56 78"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-white text-base font-semibold mb-3">Email</label>
                                    <input
                                        type="email"
                                        value={newGuideForm.email}
                                        onChange={(e) => setNewGuideForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="e.g., guide@example.com"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-base"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button
                                onClick={closeAddGuideModal}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitNewGuide}
                                disabled={!newGuideForm.fullName || !newGuideForm.specialty || newGuideForm.languages.length === 0 || !newGuideForm.phone || !newGuideForm.email}
                                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                            >
                                Add Guide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700/50">
                            <h3 className="text-xl font-bold text-white">Remove Tour Guide</h3>
                        </div>

                        {/* Modal Content */}
                        <div className="px-6 py-6">
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
            )}
        </div>
    );
}