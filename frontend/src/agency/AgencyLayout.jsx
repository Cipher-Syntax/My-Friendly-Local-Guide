import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, UsersRound, Loader2, CheckCircle, AlertCircle, XCircle, AlertTriangle, DollarSign, Star } from 'lucide-react';
import api from '../api/api';

import AgencySidebar from '../components/agency/AgencySidebar';
import AgencyDashboardContent from '../components/agency/AgencyDashboardContent';
import AgencyBookingsTable from '../components/agency/AgencyBookingsTable';
import AgencyTourGuideManagement from '../components/agency/AgencyTourGuideManagement';
import AgencyReviews from '../components/agency/AgencyReviews';
import AddGuideModal from '../components/agency/AddGuideModal';
import ManageGuidesModal from '../components/agency/ManageGuidesModal';

export default function AgencyLayout() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    const [user, setUser] = useState({ guide_tier: 'free', guide_rating: 0 });

    const [config, setConfig] = useState({
        subscriptionPrice: 3000,
        guideLimit: 2,
        bookingLimit: 1
    });

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isPollingPayment, setIsPollingPayment] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDanger: false,
        actionLabel: 'Confirm'
    });

    const [guides, setGuides] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
    const [isManageGuidesModalOpen, setIsManageGuidesModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    const [newGuideForm, setNewGuideForm] = useState({
        fullName: '', specialty: '', languages: [], phone: '', email: '',
        languageSearchTerm: '', showLanguageDropdown: false
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const configRes = await api.get('api/payments/subscription-price/');
            if (configRes.data) {
                setConfig({
                    subscriptionPrice: parseFloat(configRes.data.price) || 3000,
                    guideLimit: configRes.data.guide_limit || 2,
                    bookingLimit: configRes.data.booking_limit || 1
                });
            }

            const userRes = await api.get('api/profile/');
            setUser(userRes.data);

            const guidesRes = await api.get('api/agency/guides/');
            const bookingsRes = await api.get('api/bookings/');

            const formattedGuides = guidesRes.data.map(g => ({
                id: g.id,
                name: `${g.first_name} ${g.last_name}`,
                specialty: g.specialization,
                languages: g.languages || [],
                rating: 5.0,
                tours: 0,
                available: g.is_active, // Base availability
                phone: g.contact_number,
                email: "contact@agency.com",
                avatar: g.first_name.charAt(0)
            }));

            const formattedBookings = bookingsRes.data
                .map(b => ({
                    id: b.id,
                    name: `Booking #${b.id} - ${b.tourist_username}`,
                    check_in: b.check_in,
                    check_out: b.check_out,
                    location: b.destination_detail?.name || b.accommodation_detail?.title || "General Booking",
                    groupSize: b.num_guests,
                    status: b.status.toLowerCase(),
                    guideIds: b.assigned_agency_guides || []
                }));

            setGuides(formattedGuides);
            setBookings(formattedBookings);

        } catch (error) {
            console.error("Dashboard Load Error:", error);
            showToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    };

    const initiateSubscription = () => {
        setConfirmModal({
            isOpen: true,
            title: "Confirm Subscription Upgrade",
            message: `You are about to upgrade to the UNLIMITED tier for ₱${config.subscriptionPrice.toLocaleString('en-PH')}/year. Proceed to payment?`,
            isDanger: false,
            actionLabel: "Proceed to Payment",
            onConfirm: executeSubscription,
        });
    };

    const executeSubscription = async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await api.post('api/payments/initiate/', {
                payment_type: 'YearlySubscription',
                final_amount: config.subscriptionPrice
            });
            const { checkout_url, payment_id } = res.data;
            window.open(checkout_url, '_blank');
            showToast("Redirecting to payment provider...", "info");
            startPolling(payment_id);
        } catch (error) {
            console.error("Subscription initiation failed:", error);
            showToast("Failed to initiate subscription.", "error");
        }
    };

    const startPolling = (paymentId) => {
        setIsPollingPayment(true);
        const pollInterval = setInterval(async () => {
            try {
                const res = await api.get(`api/payments/status/${paymentId}/`);
                const status = res.data.status;
                if (status === 'succeeded') {
                    clearInterval(pollInterval);
                    setIsPollingPayment(false);
                    showToast("Payment Successful! Tier Upgraded.", "success");
                    fetchData();
                } else if (status === 'failed' || status === 'cancelled') {
                    clearInterval(pollInterval);
                    setIsPollingPayment(false);
                    showToast("Payment failed or was cancelled.", "error");
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 3000);
        setTimeout(() => {
            clearInterval(pollInterval);
            if (isPollingPayment) {
                setIsPollingPayment(false);
                showToast("Payment verification timed out. Please refresh.", "error");
            }
        }, 300000);
    };

    const handleAddGuide = async () => {
        try {
            const nameParts = newGuideForm.fullName.split(' ');
            const payload = {
                first_name: nameParts[0],
                last_name: nameParts.slice(1).join(' ') || '.',
                contact_number: newGuideForm.phone,
                specialization: newGuideForm.specialty,
                languages: newGuideForm.languages,
                is_active: true
            };
            await api.post('api/agency/guides/create/', payload);
            setIsAddGuideModalOpen(false);
            setNewGuideForm({ fullName: '', specialty: '', languages: [], phone: '', email: '', languageSearchTerm: '', showLanguageDropdown: false });
            fetchData();
            showToast("Guide added successfully!");
        } catch (error) {
            console.error("Add Guide Error:", error);
            showToast("Failed to add guide.", "error");
        }
    };

    const initiateDeleteGuide = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "Remove Guide",
            message: "Are you sure you want to remove this tour guide? This action cannot be undone.",
            isDanger: true,
            actionLabel: "Remove",
            onConfirm: () => executeDeleteGuide(id)
        });
    };

    const executeDeleteGuide = async (id) => {
        try {
            await api.delete(`api/agency/guides/${id}/`);
            setGuides(prev => prev.filter(g => g.id !== id));
            showToast("Guide removed successfully.");
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error("Delete Guide Error:", error);
            showToast("Failed to delete guide.", "error");
        }
    };

    const updateBookingStatus = async (id, status) => {
        if (status === 'accepted' && user.guide_tier === 'free') {
            const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
            if (acceptedBookingsCount >= config.bookingLimit) {
                showToast(`Free tier is limited to ${config.bookingLimit} accepted booking(s). Upgrade for unlimited bookings.`, "error");
                return;
            }
        }
        try {
            await api.patch(`api/bookings/${id}/status/`, { status: status === 'accepted' ? 'Accepted' : 'Declined' });
            fetchData();
            showToast(`Booking ${status} successfully!`);
        } catch (error) {
            console.error("Update Status Error:", error);
            showToast("Failed to update status.", "error");
        }
    };

    // [UPDATED] Core function to handle BOTH single and bulk assignments
    const updateGuideAssignments = async (bookingId, newGuideIds) => {
        try {
            await api.patch(`api/bookings/${bookingId}/assign-guides/`, {
                agency_guide_ids: newGuideIds
            });

            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, guideIds: newGuideIds } : b
            ));

            showToast("Guides assigned successfully.");
        } catch (error) {
            console.error("Assign Guide Error:", error);
            showToast("Failed to update assignment.", "error");
        }
    };

    // [UPDATED] Wrapper for manual toggling (Single Click)
    const assignGuide = async (bookingId, guide) => {
        const booking = bookings.find(b => b.id === bookingId);
        const isAssigned = booking.guideIds.includes(guide.id);

        // Prevent manual assignment of booked guides
        if (!isAssigned && !guide.available) {
            showToast("This guide is busy or unavailable for these dates.", "error");
            return;
        }

        let newGuideIds = isAssigned
            ? booking.guideIds.filter(id => id !== guide.id)
            : [...booking.guideIds, guide.id];

        await updateGuideAssignments(bookingId, newGuideIds);
    };

    // --- SMART AVAILABILITY LOGIC ---
    const getComputedGuides = () => {
        if (selectedBookingId && isManageGuidesModalOpen) {
            const currentBooking = bookings.find(b => b.id === selectedBookingId);

            if (!currentBooking || !currentBooking.check_in || !currentBooking.check_out) {
                return guides;
            }

            const targetStart = new Date(currentBooking.check_in);
            const targetEnd = new Date(currentBooking.check_out);
            const busyGuideIds = new Set();

            bookings.forEach(b => {
                if (b.id === currentBooking.id) return;
                if (['cancelled', 'declined', 'refunded', 'pending_payment'].includes(b.status)) return;

                const bookStart = new Date(b.check_in);
                const bookEnd = new Date(b.check_out);

                if (targetStart <= bookEnd && targetEnd >= bookStart) {
                    b.guideIds.forEach(gid => busyGuideIds.add(gid));
                }
            });

            return guides.map(g => ({
                ...g,
                // STRICT availability: Must be Active (is_active) AND Not Busy
                available: g.available && !busyGuideIds.has(g.id),
                availabilityReason: busyGuideIds.has(g.id) ? 'Booked' : (g.available ? 'Available' : 'Inactive')
            }));
        }
        return guides;
    };

    const computedGuides = getComputedGuides();

    const filteredGuides = computedGuides.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getGuideNames = (ids) => ids.map(id => guides.find(g => g.id === id)?.name).filter(Boolean);
    const getStatusBg = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'accepted': return 'bg-green-500/20 text-green-400';
            case 'declined': return 'bg-red-500/20 text-red-400';
            case 'completed': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const handleSignOut = () => {
        localStorage.clear();
        navigate('/agency-signin');
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden relative">
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                        ? 'bg-slate-800 border-green-500/50 text-green-400'
                        : 'bg-slate-800 border-red-500/50 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <AgencySidebar activeTab={activeTab} setActiveTab={setActiveTab} handleSignOut={handleSignOut} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
                    {/* ... Header Content ... */}
                    <div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                        </div>
                        <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                                        {activeTab === 'dashboard' && <LayoutDashboard className="w-8 h-8 text-white" />}
                                        {activeTab === 'bookings' && <BookOpen className="w-8 h-8 text-white" />}
                                        {activeTab === 'guides' && <UsersRound className="w-8 h-8 text-white" />}
                                        {activeTab === 'reviews' && <Star className="w-8 h-8 text-white" />}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold text-white">
                                            {activeTab === 'dashboard' ? 'Dashboard Overview' :
                                                activeTab === 'bookings' ? 'Bookings Management' :
                                                    activeTab === 'guides' ? 'Tour Guide Management' :
                                                        'Reviews & Ratings'}
                                        </h2>
                                    </div>
                                </div>

                                {user.guide_tier === 'free' ? (
                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-semibold text-white/70 mb-1">
                                            Tier: <span className="text-yellow-400">FREE (Limited)</span>
                                        </p>
                                        <button
                                            onClick={initiateSubscription}
                                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors flex items-center gap-2 font-medium shadow-md"
                                        >
                                            <DollarSign className="w-5 h-5" />
                                            Upgrade to Unlimited (₱{config.subscriptionPrice.toLocaleString('en-PH')}/yr)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-semibold text-white/70 mb-1">
                                            Tier: <span className="text-green-400">PAID (Unlimited)</span>
                                        </p>
                                        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/30">
                                            <span className="text-green-400 font-bold">PREMIUM</span>
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && (
                                <AgencyDashboardContent
                                    activeGuides={guides.filter(g => g.available).length}
                                    completedTours={bookings.filter(b => b.status === 'completed').length}
                                    avgRating={user.guide_rating ? parseFloat(user.guide_rating) : 0.0}
                                    tourGuides={guides}
                                    bookings={bookings}
                                    getStatusBg={getStatusBg}
                                />
                            )}
                            {activeTab === 'bookings' && (
                                <AgencyBookingsTable
                                    bookings={bookings}
                                    getGuideNames={getGuideNames}
                                    getStatusBg={getStatusBg}
                                    updateBookingStatus={updateBookingStatus}
                                    openManageGuidesModal={(id) => {
                                        setSelectedBookingId(id);
                                        setIsManageGuidesModalOpen(true);
                                    }}
                                    agencyTier={user.guide_tier}
                                    freeBookingLimit={config.bookingLimit}
                                />
                            )}
                            {activeTab === 'guides' && (
                                <AgencyTourGuideManagement
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filteredGuides={filteredGuides}
                                    openAddGuideModal={() => setIsAddGuideModalOpen(true)}
                                    handleRemoveGuide={initiateDeleteGuide}
                                    getStatusBg={getStatusBg}
                                />
                            )}
                            {activeTab === 'reviews' && <AgencyReviews />}
                        </>
                    )}
                </main>
            </div>

            <ManageGuidesModal
                isModalOpen={isManageGuidesModalOpen}
                closeModal={() => setIsManageGuidesModalOpen(false)}
                currentSelectedBooking={bookings.find(b => b.id === selectedBookingId)}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filteredGuides={filteredGuides}
                assignGuide={assignGuide} // For manual click
                updateGuideAssignments={updateGuideAssignments} // For bulk auto-assign
                selectedBookingId={selectedBookingId}
            />

            <AddGuideModal
                isAddGuideModalOpen={isAddGuideModalOpen}
                closeAddGuideModal={() => setIsAddGuideModalOpen(false)}
                newGuideForm={newGuideForm}
                setNewGuideForm={setNewGuideForm}
                filteredLanguages={['English', 'Tagalog', 'Spanish', 'Mandarin']}
                handleAddLanguage={(lang) => !newGuideForm.languages.includes(lang) && setNewGuideForm(prev => ({ ...prev, languages: [...prev.languages, lang] }))}
                handleRemoveLanguage={(lang) => setNewGuideForm(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }))}
                handleSubmitNewGuide={handleAddGuide}
            />

            {confirmModal.isOpen && (
                // ... Confirm Modal ...
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-red-400' : 'text-amber-400'}`} />
                                {confirmModal.title}
                            </h3>
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300">{confirmModal.message}</p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={confirmModal.onConfirm} className={`px-4 py-2 font-medium rounded-lg transition-colors ${confirmModal.isDanger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`}>{confirmModal.actionLabel}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}