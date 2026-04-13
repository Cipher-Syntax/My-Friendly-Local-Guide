import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, UsersRound, Loader2, CheckCircle, AlertCircle, XCircle, AlertTriangle, DollarSign, Star, Clock, ShieldAlert, Settings, PhilippinePeso, Map, Home, MessageSquare, History, BarChart3 } from 'lucide-react';
import api from '../api/api';

import AgencySidebar from '../components/agency/AgencySidebar';
import AgencyDashboardContent from '../components/agency/AgencyDashboardContent';
import AgencyBookingsTable from '../components/agency/AgencyBookingsTable';
import AgencyTourGuideManagement from '../components/agency/AgencyTourGuideManagement';
import AgencyReviews from '../components/agency/AgencyReviews';
import AgencyEarnings from '../components/agency/AgencyEarnings';
import AgencySettings from '../components/agency/AgencySettings';
import AgencyMessages from '../components/agency/AgencyMessages';
import AddGuideModal from '../components/agency/AddGuideModal';
import ManageGuidesModal from '../components/agency/ManageGuidesModal';
import AgencyBookingHistory from '../components/agency/AgencyBookingHistory';
import AgencyReportsAnalytics from '../components/agency/AgencyReportsAnalytics';

// NEW IMPORTS
import AgencyTourPackages from '../components/agency/AgencyTourPackages';
import AgencyAccommodations from '../components/agency/AgencyAccommodations';

import { formatPHPhoneLocal, normalizePHPhone } from '../utils/phoneNumber';
import { NAME_REGEX, NAME_ERROR_MESSAGE, EMAIL_REGEX, EMAIL_ERROR_MESSAGE, PHONE_ERROR_MESSAGE } from '../utils/validation';

import { useAgencyDashboardData, availableLanguages } from '../hooks/useAgencyDashboardData';

export default function AgencyLayout() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    const [user, setUser] = useState(null);

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

    const [showSetupReminderModal, setShowSetupReminderModal] = useState(false);
    const [setupReminderDismissedForSession, setSetupReminderDismissedForSession] = useState(false);

    const { availableSpecialties } = useAgencyDashboardData();

    const [guides, setGuides] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [messageDraft, setMessageDraft] = useState(null);

    const [isAddGuideModalOpen, setIsAddGuideModalOpen] = useState(false);
    const [isManageGuidesModalOpen, setIsManageGuidesModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [editingGuideId, setEditingGuideId] = useState(null);

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


    const refreshUnreadMessages = useCallback(async () => {
        try {
            const response = await api.get('/api/conversations/');
            const payload = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : [];

            const partnerIdOf = (item) => Number(item?.id ?? item?.partner_id ?? item?.user_id);
            const unreadByServer = payload.reduce((sum, item) => sum + Number(item?.unread_count || 0), 0);

            let forcedUnreadBonus = 0;
            try {
                const rawPrefs = localStorage.getItem('agency_message_conversation_prefs_v1');
                if (rawPrefs) {
                    const parsedPrefs = JSON.parse(rawPrefs);
                    const forcedUnread = Array.isArray(parsedPrefs?.forceUnread)
                        ? parsedPrefs.forceUnread
                            .map((value) => Number(value))
                            .filter((value) => Number.isFinite(value) && value > 0)
                        : [];

                    const hasServerUnread = new Set(
                        payload
                            .filter((item) => Number(item?.unread_count || 0) > 0)
                            .map((item) => partnerIdOf(item))
                            .filter((id) => Number.isFinite(id) && id > 0)
                    );

                    forcedUnread.forEach((id) => {
                        if (!hasServerUnread.has(id)) {
                            forcedUnreadBonus += 1;
                        }
                    });
                }
            } catch {
                // Ignore local preference parsing issues.
            }

            setUnreadMessages(unreadByServer + forcedUnreadBonus);
        } catch {
            setUnreadMessages(0);
        }
    }, []);

    useEffect(() => {
        refreshUnreadMessages();

        const intervalId = setInterval(refreshUnreadMessages, 10000);
        return () => clearInterval(intervalId);
    }, [refreshUnreadMessages]);

    const fetchData = useCallback(async () => {
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

            if (userRes.data.agency_profile?.status) {
                const guidesRes = await api.get('api/agency/guides/');
                const bookingsRes = await api.get('api/bookings/');

                const formattedGuides = guidesRes.data.map(g => ({
                    ...g,
                    id: g.id,
                    name: `${g.first_name} ${g.last_name}`,
                    specialty: g.specialization,
                    languages: g.languages || [],
                    rating: 5.0,
                    tours: 0,
                    available: g.is_active,
                    phone: formatPHPhoneLocal(g.contact_number),
                    email: g.email || "contact@agency.com",
                    avatar: g.first_name.charAt(0)
                }));

                const formattedBookings = bookingsRes.data
                    .map(b => ({
                        ...b,
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
            }

        } catch (error) {
            console.error("Dashboard Load Error:", error);
            showToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


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

    const handleSaveGuide = async () => {
        try {
            const trimmedFullName = String(newGuideForm.fullName || '').trim();
            if (!NAME_REGEX.test(trimmedFullName)) {
                showToast(`Full Name: ${NAME_ERROR_MESSAGE}`, 'error');
                return;
            }

            const trimmedEmail = String(newGuideForm.email || '').trim();
            if (!EMAIL_REGEX.test(trimmedEmail)) {
                showToast(`Email: ${EMAIL_ERROR_MESSAGE}`, 'error');
                return;
            }

            const normalizedPhone = normalizePHPhone(newGuideForm.phone);
            if (!normalizedPhone) {
                showToast(`Phone: ${PHONE_ERROR_MESSAGE}`, 'error');
                return;
            }

            const nameParts = trimmedFullName.split(' ');
            const payload = {
                first_name: nameParts[0],
                last_name: nameParts.slice(1).join(' ') || '.',
                contact_number: normalizedPhone,
                email: trimmedEmail,
                specialization: newGuideForm.specialty,
                languages: newGuideForm.languages,
                is_active: true
            };

            if (editingGuideId) {
                await api.patch(`api/agency/guides/${editingGuideId}/`, payload);
                showToast("Guide updated successfully!");
            } else {
                await api.post('api/agency/guides/create/', payload);
                showToast("Guide added successfully!");
            }

            setIsAddGuideModalOpen(false);
            setEditingGuideId(null);
            setNewGuideForm({ fullName: '', specialty: '', languages: [], phone: '', email: '', languageSearchTerm: '', showLanguageDropdown: false });
            fetchData();
        } catch (error) {
            console.error("Save Guide Error:", error);
            showToast(editingGuideId ? "Failed to update guide." : "Failed to add guide.", "error");
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

    const updateBookingStatus = async (id, status, extraData = {}) => {
        if (status === 'accepted' && user?.guide_tier === 'free') {
            const acceptedBookingsCount = bookings.filter(b => b.status === 'accepted').length;
            if (acceptedBookingsCount >= config.bookingLimit) {
                showToast(`Free tier is limited to ${config.bookingLimit} accepted booking(s). Upgrade for unlimited bookings.`, "error");
                return;
            }
        }
        try {
            await api.patch(`api/bookings/${id}/status/`, {
                status: status === 'accepted' ? 'Accepted' : 'Declined',
                ...extraData
            });
            fetchData();
            showToast(`Booking ${status} successfully!`);
        } catch (error) {
            console.error("Update Status Error:", error);
            showToast("Failed to update status.", "error");
        }
    };

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

    const assignGuide = async (bookingId, guide) => {
        const booking = bookings.find(b => b.id === bookingId);
        const isAssigned = booking.guideIds.includes(guide.id);

        if (!isAssigned && !guide.available) {
            showToast("This guide is busy or unavailable for these dates.", "error");
            return;
        }

        let newGuideIds = isAssigned
            ? booking.guideIds.filter(id => id !== guide.id)
            : [...booking.guideIds, guide.id];

        await updateGuideAssignments(bookingId, newGuideIds);
    };

    const confirmPayment = async (bookingId) => {
        try {
            await api.post(`api/bookings/${bookingId}/mark_paid/`);
            setBookings(prev => prev.map(b =>
                b.id === bookingId
                    ? { ...b, status: 'completed', balance_due: 0, balance_paid_at: new Date().toISOString() }
                    : b
            ));
            showToast('Balance received. Booking marked as completed.', 'success');
            fetchData();
        } catch (error) {
            console.error('Confirm payment error:', error);
            showToast('Failed to confirm payment.', 'error');
        }
    };

    const getComputedGuides = () => {
        if (selectedBookingId && isManageGuidesModalOpen) {
            const currentBooking = bookings.find(b => b.id === selectedBookingId);
            if (!currentBooking || !currentBooking.check_in || !currentBooking.check_out) return guides;

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
                available: g.available && !busyGuideIds.has(g.id),
                availabilityReason: busyGuideIds.has(g.id) ? 'Booked' : (g.available ? 'Available' : 'Inactive')
            }));
        }
        return guides;
    };

    const computedGuides = getComputedGuides();
    const normalizedGuideSearch = String(searchTerm || '').trim().toLowerCase();
    const filteredGuides = computedGuides.filter((g) => {
        if (!normalizedGuideSearch) return true;

        const languageSearchBlob = Array.isArray(g.languages)
            ? g.languages.join(' ').toLowerCase()
            : '';

        return (
            g.name.toLowerCase().includes(normalizedGuideSearch) ||
            g.specialty?.toLowerCase().includes(normalizedGuideSearch) ||
            languageSearchBlob.includes(normalizedGuideSearch)
        );
    });

    const getGuideNames = (ids) => ids.map(id => guides.find(g => g.id === id)?.name).filter(Boolean);
    const getStatusBg = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-transparent';
            case 'accepted': return 'bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-transparent';
            case 'confirmed': return 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-transparent';
            case 'declined': return 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-transparent';
            case 'completed': return 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-transparent';
            case 'refunded': return 'bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-transparent';
            default: return 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent';
        }
    };

    const handleSignOut = () => {
        setConfirmModal({
            isOpen: true,
            title: "Confirm Sign Out",
            message: "Are you sure you want to sign out of the agency portal?",
            isDanger: true,
            actionLabel: "Sign Out",
            onConfirm: executeSignOut
        });
    };

    const openMessageWithTourist = (booking) => {
        const touristId = Number(booking?.tourist_id || booking?.tourist_detail?.id);
        if (!Number.isFinite(touristId) || touristId <= 0) {
            showToast('This booking has no tourist account attached.', 'error');
            return;
        }

        const tourist = booking?.tourist_detail || {};
        const nameFromProfile = [tourist?.first_name, tourist?.last_name].filter(Boolean).join(' ').trim();
        const displayName = nameFromProfile || booking?.tourist_username || tourist?.username || `Tourist #${touristId}`;

        setMessageDraft({
            id: touristId,
            name: displayName,
            username: tourist?.username || booking?.tourist_username || '',
            profile_picture: tourist?.profile_picture || null,
        });
        setActiveTab('messages');
    };

    const executeSignOut = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        localStorage.clear();
        navigate('/agency-signin');
    };

    const isApproved = user?.agency_profile?.status;
    const agencyProfile = user?.agency_profile || {};
    const logo = agencyProfile.logo || null;
    const businessName = agencyProfile.business_name || 'Agency Management';

    const hasLogo = Boolean(agencyProfile?.logo);
    const hasOperatingDays = Array.isArray(agencyProfile?.available_days) && agencyProfile.available_days.length > 0;
    const hasOperatingHours = Boolean(agencyProfile?.opening_time) && Boolean(agencyProfile?.closing_time);
    const hasVisibilityStatus = typeof agencyProfile?.is_guide_visible === 'boolean';

    const isAgencySetupComplete = hasLogo && hasOperatingDays && hasOperatingHours && hasVisibilityStatus;

    const setupChecklist = useMemo(() => ([
        { label: 'Agency logo uploaded', done: hasLogo },
        { label: 'Operating days selected', done: hasOperatingDays },
        { label: 'Opening and closing time set', done: hasOperatingHours },
        { label: 'Visibility status configured', done: hasVisibilityStatus },
    ]), [hasLogo, hasOperatingDays, hasOperatingHours, hasVisibilityStatus]);

    useEffect(() => {
        if (loading) return;

        if (isApproved !== 'Approved') {
            setShowSetupReminderModal(false);
            return;
        }

        if (isAgencySetupComplete) {
            setShowSetupReminderModal(false);
            return;
        }

        if (!setupReminderDismissedForSession) {
            setShowSetupReminderModal(true);
        }
    }, [loading, isApproved, isAgencySetupComplete, setupReminderDismissedForSession]);

    const openSettingsFromSetupReminder = () => {
        setShowSetupReminderModal(false);
        setSetupReminderDismissedForSession(true);
        setActiveTab('settings');
    };

    const dismissSetupReminder = () => {
        setShowSetupReminderModal(false);
        setSetupReminderDismissedForSession(true);
    };

    const filteredFormLanguages = useMemo(() => availableLanguages.filter(lang =>
        lang.toLowerCase().includes((newGuideForm.languageSearchTerm || '').toLowerCase()) &&
        !newGuideForm.languages.includes(lang)
    ), [newGuideForm.languageSearchTerm, newGuideForm.languages]);

    if (loading) {
        return (
            <div className="h-screen w-full zam-shell bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen zam-shell bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden relative transition-colors duration-300">

            {isApproved === 'Pending' && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/40 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-10 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden transition-colors duration-300">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full"></div>

                        <div className="relative z-10 space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-inner">
                                <Clock className="w-12 h-12 text-cyan-500 dark:text-cyan-400 animate-pulse" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Application Pending</h2>
                                <p className="text-orange-600 dark:text-orange-300 font-semibold uppercase tracking-widest text-xs">Review in Progress</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                <p className="mb-4">
                                    Thank you for submitting your business permit! Our administrators are currently verifying your agency credentials.
                                </p>
                                <p className="flex items-center justify-center gap-2 text-slate-800 dark:text-white font-medium">
                                    <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                    Estimated time: 3-5 Business Days
                                </p>
                            </div>

                            <div className="pt-4 space-y-4">
                                <p className="text-xs text-slate-500 italic">
                                    You will receive full access to the dashboard and management tools once your account is verified.
                                </p>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 group"
                                >
                                    <XCircle className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                    Sign Out & Check Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSetupReminderModal && (
                <div className="fixed inset-0 z-[10001] bg-slate-900/45 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-cyan-500" />
                                Complete Agency Setup
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Finish these required settings so your agency profile is fully ready.
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                {setupChecklist.map((item) => (
                                    <div key={item.label} className="flex items-center gap-3 text-sm">
                                        {item.done ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                        <span className={item.done ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-semibold'}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-700 dark:text-cyan-300">
                                If you choose Maybe Later, this reminder will appear again on your next login until setup is complete.
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/40">
                            <button
                                onClick={dismissSetupReminder}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Maybe Later
                            </button>
                            <button
                                onClick={openSettingsFromSetupReminder}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Setup Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className={`fixed top-6 right-6 z-[11000] px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success'
                    ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-400'
                    : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium text-slate-800 dark:text-white">{toast.message}</span>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <AgencySidebar activeTab={activeTab} setActiveTab={setActiveTab} handleSignOut={handleSignOut} logo={logo} unreadMessages={unreadMessages} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-10 transition-colors duration-300">
                    <div className={`relative h-48 overflow-hidden ${!logo ? '' : 'bg-cover bg-center'}`} style={logo ? { backgroundImage: `url(${logo})` } : { background: 'linear-gradient(120deg, var(--zam-deep-sea), var(--zam-sea))' }}>

                        {!logo && <div className="absolute inset-0 zam-vinta-overlay opacity-20"></div>}

                        {/* Intelligent Adaptive Overlay - Dims the image dynamically to ensure white text pops */}
                        <div className={`absolute inset-0 ${logo ? 'bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90 mix-blend-multiply' : 'opacity-20'}`}>
                            {!logo && (
                                <>
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-300 rounded-full blur-3xl"></div>
                                </>
                            )}
                        </div>

                        <div className="relative px-8 py-6 h-full flex flex-col justify-between">
                            <div className="flex items-start justify-between w-full">
                                {/* Adjusted top section containing Business Name */}
                                <h1 className="text-2xl md:text-3xl font-black zam-title text-white drop-shadow-lg tracking-tight">
                                    {businessName}
                                </h1>

                                {user?.guide_tier === 'free' ? (
                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-semibold text-white/90 mb-1">
                                            Tier: <span className="text-yellow-300">FREE (Limited)</span>
                                        </p>

                                        <div className="text-xs text-white/80 mb-3 flex flex-col items-end gap-1">
                                            <span className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-yellow-300" /> Max {config.bookingLimit} Active Booking{config.bookingLimit !== 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-yellow-300" /> Max {config.guideLimit} Tour Guides Allowed
                                            </span>
                                        </div>

                                        <button
                                            onClick={initiateSubscription}
                                            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-md"
                                        >
                                            <PhilippinePeso className="w-5 h-5" />
                                            Upgrade to Unlimited (₱{config.subscriptionPrice.toLocaleString('en-PH')}/yr)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <p className="text-sm font-semibold text-white/90 mb-1">
                                            Tier: <span className="text-green-300">PAID (Unlimited)</span>
                                        </p>
                                        <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-lg border border-green-500/40 mb-2">
                                            <span className="text-green-300 font-bold">PREMIUM</span>
                                            <CheckCircle className="w-5 h-5 text-green-300" />
                                        </div>

                                        <div className="text-xs text-white/90 flex flex-col items-end gap-1">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-400" /> Unlimited Bookings Allowed
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-400" /> Unlimited Tour Guides Access
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Moved original active tab title here, smaller and cleanly mapped to the bottom left */}
                            <div className="flex items-end justify-start w-full mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                                        {activeTab === 'dashboard' && <LayoutDashboard className="w-5 h-5 text-white" />}
                                        {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-white" />}
                                        {activeTab === 'bookings' && <BookOpen className="w-5 h-5 text-white" />}
                                        {activeTab === 'booking_history' && <History className="w-5 h-5 text-white" />}
                                        {activeTab === 'tours' && <Map className="w-5 h-5 text-white" />}
                                        {activeTab === 'accommodations' && <Home className="w-5 h-5 text-white" />}
                                        {activeTab === 'guides' && <UsersRound className="w-5 h-5 text-white" />}
                                        {activeTab === 'messages' && <MessageSquare className="w-5 h-5 text-white" />}
                                        {activeTab === 'reviews' && <Star className="w-5 h-5 text-white" />}
                                        {activeTab === 'earnings' && <DollarSign className="w-5 h-5 text-white" />}
                                        {activeTab === 'settings' && <Settings className="w-5 h-5 text-white" />}
                                    </div>
                                    <h2 className="text-lg md:text-xl font-bold text-white/90 drop-shadow-md">
                                        {activeTab === 'dashboard' ? 'Dashboard Overview' :
                                            activeTab === 'analytics' ? 'Reports & Analytics' :
                                            activeTab === 'bookings' ? 'Bookings Management' :
                                                activeTab === 'booking_history' ? 'Booking History' :
                                                activeTab === 'tours' ? 'My Tour Packages' :
                                                    activeTab === 'accommodations' ? 'My Accommodations' :
                                                        activeTab === 'guides' ? 'Tour Guide Management' :
                                                            activeTab === 'messages' ? 'Tourist Conversations' :
                                                            activeTab === 'reviews' ? 'Reviews & Ratings' :
                                                                activeTab === 'settings' ? 'Agency Settings' :
                                                                    'Earnings & Payments'}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={`flex-1 ${activeTab === 'messages' ? 'overflow-hidden p-0' : 'overflow-auto p-8'}`}>
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
                                    avgRating={user?.guide_rating ? parseFloat(user.guide_rating) : 0.0}
                                    tourGuides={guides}
                                    bookings={bookings}
                                    getStatusBg={getStatusBg}
                                />
                            )}
                            {activeTab === 'analytics' && (
                                <AgencyReportsAnalytics
                                    bookings={bookings}
                                    guides={guides}
                                />
                            )}
                            {activeTab === 'bookings' && (
                                <AgencyBookingsTable
                                    bookings={bookings}
                                    getGuideNames={getGuideNames}
                                    getStatusBg={getStatusBg}
                                    updateBookingStatus={updateBookingStatus}
                                    confirmPayment={confirmPayment}
                                    openMessageWithTourist={openMessageWithTourist}
                                    openManageGuidesModal={(id) => {
                                        setSelectedBookingId(id);
                                        setIsManageGuidesModalOpen(true);
                                    }}
                                    agencyTier={user?.guide_tier}
                                    freeBookingLimit={config.bookingLimit}
                                />
                            )}
                            {activeTab === 'booking_history' && (
                                <AgencyBookingHistory
                                    bookings={bookings}
                                    getStatusBg={getStatusBg}
                                />
                            )}
                            {activeTab === 'tours' && <AgencyTourPackages />}
                            {activeTab === 'accommodations' && <AgencyAccommodations />}
                            {activeTab === 'guides' && (
                                <AgencyTourGuideManagement
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filteredGuides={filteredGuides}
                                    openAddGuideModal={() => {
                                        setEditingGuideId(null);
                                        setNewGuideForm({ fullName: '', specialty: '', languages: [], phone: '', email: '', languageSearchTerm: '', showLanguageDropdown: false });
                                        setIsAddGuideModalOpen(true);
                                    }}
                                    openEditGuideModal={(guide) => {
                                        setEditingGuideId(guide.id);
                                        setNewGuideForm({
                                            fullName: guide.name,
                                            specialty: guide.specialty || '',
                                            languages: guide.languages || [],
                                            phone: guide.phone || '',
                                            email: guide.email || '',
                                            languageSearchTerm: '',
                                            showLanguageDropdown: false
                                        });
                                        setIsAddGuideModalOpen(true);
                                    }}
                                    handleRemoveGuide={initiateDeleteGuide}
                                    getStatusBg={getStatusBg}
                                    isPremium={user?.guide_tier !== 'free'}
                                    guideLimit={config.guideLimit}
                                    totalGuidesCount={guides.length}
                                />
                            )}
                            {activeTab === 'messages' && (
                                <AgencyMessages
                                    bookings={bookings}
                                    currentUserId={user?.id}
                                    preselectedPartner={messageDraft}
                                    onUnreadCountChange={setUnreadMessages}
                                />
                            )}
                            {activeTab === 'reviews' && <AgencyReviews />}
                            {activeTab === 'earnings' && <AgencyEarnings bookings={bookings} />}
                            {activeTab === 'settings' && <AgencySettings profileData={user?.agency_profile || {}} onUpdateSuccess={fetchData} />}
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
                assignGuide={assignGuide}
                updateGuideAssignments={updateGuideAssignments}
                selectedBookingId={selectedBookingId}
            />

            <AddGuideModal
                isAddGuideModalOpen={isAddGuideModalOpen}
                closeAddGuideModal={() => {
                    setIsAddGuideModalOpen(false);
                    setEditingGuideId(null);
                }}
                newGuideForm={newGuideForm}
                setNewGuideForm={setNewGuideForm}
                filteredLanguages={filteredFormLanguages}
                handleAddLanguage={(lang) => !newGuideForm.languages.includes(lang) && setNewGuideForm(prev => ({ ...prev, languages: [...prev.languages, lang] }))}
                handleRemoveLanguage={(lang) => setNewGuideForm(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }))}
                handleSubmitNewGuide={handleSaveGuide}
                availableSpecialties={availableSpecialties}
                isEditMode={!!editingGuideId}
            />

            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-colors duration-300">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl transition-colors duration-300">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`} />
                                {confirmModal.title}
                            </h3>
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 dark:text-slate-300">{confirmModal.message}</p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                            <button onClick={confirmModal.onConfirm} className={`px-4 py-2 font-medium rounded-lg transition-colors ${confirmModal.isDanger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-cyan-500 hover:bg-cyan-600 text-white'}`}>{confirmModal.actionLabel}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}