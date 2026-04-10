import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare, MoreHorizontal, Pin, RefreshCw, Search, Send, Trash2, UserRound, CircleUserRound } from 'lucide-react';
import api from '../../api/api';

const normalizeConversationList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.conversations)) return payload.conversations;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const normalizeDisplayName = (partner) => {
    const direct = String(partner?.display_name || partner?.full_name || '').trim();
    if (direct) return direct;

    const username = String(partner?.username || '').trim();
    if (!username) return 'User';

    if (username.includes('@')) {
        const local = username.split('@', 1)[0].replace(/[._-]+/g, ' ').trim();
        if (local) {
            return local
                .split(' ')
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ');
        }
    }

    return username;
};

const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
};

const buildImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (String(imagePath).startsWith('http')) return imagePath;

    const base = api?.defaults?.baseURL || '';
    if (!base) return imagePath;

    return `${base}${imagePath}`;
};

const sanitizeOutgoingMessage = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?\d[- .]*){10,11}/g;

    const sanitized = text.replace(emailRegex, '[REDACTED]').replace(phoneRegex, '[REDACTED]');
    return {
        content: sanitized,
        redacted: sanitized !== text,
    };
};

const DELETE_UNDO_MS = 5000;
const PREFS_KEY = 'agency_message_conversation_prefs_v1';

const DEFAULT_PREFS = {
    pinned: [],
    muted: [],
    archived: [],
    forceUnread: [],
};

export default function AgencyMessages({
    bookings = [],
    currentUserId,
    preselectedPartner,
    onUnreadCountChange = () => { },
}) {
    const [conversations, setConversations] = useState([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [conversationsError, setConversationsError] = useState('');

    const [selectedPartnerId, setSelectedPartnerId] = useState(null);

    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [composerText, setComposerText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendNotice, setSendNotice] = useState('');
    const [prefs, setPrefs] = useState(DEFAULT_PREFS);
    const [brokenImagePartnerIds, setBrokenImagePartnerIds] = useState({});
    const [busyConversationDeleteId, setBusyConversationDeleteId] = useState(null);
    const [busyMessageDeleteId, setBusyMessageDeleteId] = useState(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState({ open: false, type: null, target: null });
    const [conversationActionTarget, setConversationActionTarget] = useState(null);
    const [messageActionTarget, setMessageActionTarget] = useState(null);
    const [pendingUndo, setPendingUndo] = useState(null);

    const threadBottomRef = useRef(null);
    const pendingDeleteTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pendingDeleteTimerRef.current) {
                clearTimeout(pendingDeleteTimerRef.current);
                pendingDeleteTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            const normalizeIds = (values) => (
                Array.isArray(values)
                    ? values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
                    : []
            );

            setPrefs({
                pinned: normalizeIds(parsed?.pinned),
                muted: normalizeIds(parsed?.muted),
                archived: normalizeIds(parsed?.archived),
                forceUnread: normalizeIds(parsed?.forceUnread),
            });
        } catch {
            setPrefs(DEFAULT_PREFS);
        }
    }, []);

    const persistPrefs = useCallback((nextPrefs) => {
        setPrefs(nextPrefs);
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(nextPrefs));
        } catch {
            // Ignore preference persistence failures.
        }
    }, []);

    const togglePref = useCallback((key, id) => {
        const targetId = Number(id);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        const list = prefs[key] || [];
        const next = {
            ...prefs,
            [key]: list.includes(targetId)
                ? list.filter((itemId) => Number(itemId) !== targetId)
                : [...list, targetId],
        };

        persistPrefs(next);
    }, [persistPrefs, prefs]);

    const setReadState = useCallback((id, forceUnread) => {
        const targetId = Number(id);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        const list = prefs.forceUnread || [];
        const next = {
            ...prefs,
            forceUnread: forceUnread
                ? Array.from(new Set([...list, targetId]))
                : list.filter((itemId) => Number(itemId) !== targetId),
        };

        persistPrefs(next);
    }, [persistPrefs, prefs]);

    const effectiveUnreadCount = useCallback((item) => {
        const id = Number(item?.id ?? item?.partner_id ?? item?.user_id);
        const serverUnread = Number(item?.unread_count || 0);
        const hasForcedUnread = (prefs.forceUnread || []).includes(id);
        return hasForcedUnread ? Math.max(serverUnread, 1) : serverUnread;
    }, [prefs.forceUnread]);

    const markPartnerImageBroken = useCallback((partnerId) => {
        const id = Number(partnerId);
        if (!Number.isFinite(id) || id <= 0) return;
        setBrokenImagePartnerIds((prev) => ({ ...prev, [id]: true }));
    }, []);

    const canRenderPartnerImage = useCallback((partner) => {
        const id = Number(partner?.id);
        if (!partner?.profile_picture) return false;
        if (Number.isFinite(id) && brokenImagePartnerIds[id]) return false;
        return true;
    }, [brokenImagePartnerIds]);

    const touristContacts = useMemo(() => {
        const contactMap = new Map();

        bookings.forEach((booking) => {
            const touristId = Number(booking?.tourist_id || booking?.tourist_detail?.id);
            if (!Number.isFinite(touristId) || touristId <= 0) return;

            const touristDetail = booking?.tourist_detail || {};
            const fullName = [touristDetail?.first_name, touristDetail?.last_name].filter(Boolean).join(' ').trim();
            const displayName = fullName || booking?.tourist_username || touristDetail?.username || `Tourist #${touristId}`;

            const preview =
                booking?.destination_detail?.name ||
                booking?.accommodation_detail?.title ||
                booking?.name ||
                `Booking #${booking?.id}`;

            const existing = contactMap.get(touristId) || {
                id: touristId,
                username: touristDetail?.username || booking?.tourist_username || '',
                display_name: displayName,
                full_name: fullName,
                profile_picture: touristDetail?.profile_picture || null,
                last_message: '',
                last_message_timestamp: null,
                last_message_ts: 0,
                unread_count: 0,
                booking_count: 0,
                booking_preview: preview,
            };

            existing.booking_count += 1;

            if (!existing.profile_picture && touristDetail?.profile_picture) {
                existing.profile_picture = touristDetail.profile_picture;
            }

            if (!existing.booking_preview && preview) {
                existing.booking_preview = preview;
            }

            contactMap.set(touristId, existing);
        });

        return Array.from(contactMap.values());
    }, [bookings]);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await api.get('/api/conversations/');
            const normalized = normalizeConversationList(response.data).map((item) => ({
                ...item,
                id: Number(item.id ?? item.partner_id ?? item.user_id),
                unread_count: Number(item.unread_count || 0),
                last_message_ts: Number(item.last_message_ts || 0),
            })).filter((item) => Number.isFinite(item.id) && item.id > 0);

            setConversations(normalized);
            setConversationsError('');
        } catch (error) {
            const detail =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                'Could not load conversations.';
            setConversationsError(String(detail));
            setConversations([]);
        } finally {
            setConversationsLoading(false);
        }
    }, []);

    const fetchThread = useCallback(async (partnerId, showLoader = true) => {
        if (!partnerId) {
            setMessages([]);
            setMessagesLoading(false);
            return;
        }

        try {
            if (showLoader) {
                setMessagesLoading(true);
            }

            const response = await api.get(`/api/conversations/${partnerId}/messages/`);
            const thread = Array.isArray(response.data) ? response.data : [];

            setMessages(thread);
            setMessagesError('');

            setConversations((prev) => {
                const next = prev.map((item) => (
                    Number(item.id) === Number(partnerId)
                        ? { ...item, unread_count: 0 }
                        : item
                ));
                return next;
            });
        } catch (error) {
            const detail =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                'Could not load thread.';
            setMessagesError(String(detail));
            setMessages([]);
        } finally {
            if (showLoader) {
                setMessagesLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const unreadTotal = conversations.reduce((sum, item) => sum + effectiveUnreadCount(item), 0);
        onUnreadCountChange(unreadTotal);
    }, [conversations, effectiveUnreadCount, onUnreadCountChange]);

    useEffect(() => {
        fetchConversations();
        const intervalId = setInterval(fetchConversations, 10000);
        return () => clearInterval(intervalId);
    }, [fetchConversations]);

    useEffect(() => {
        if (!selectedPartnerId) {
            setMessages([]);
            return;
        }

        fetchThread(selectedPartnerId, true);
        const intervalId = setInterval(() => fetchThread(selectedPartnerId, false), 5000);
        return () => clearInterval(intervalId);
    }, [selectedPartnerId, fetchThread]);

    useEffect(() => {
        const selectedId = Number(preselectedPartner?.id);
        if (!Number.isFinite(selectedId) || selectedId <= 0) return;

        setSelectedPartnerId(selectedId);

        setConversations((prev) => {
            const alreadyExists = prev.some((item) => Number(item.id) === selectedId);
            if (alreadyExists) return prev;

            return [
                {
                    id: selectedId,
                    username: preselectedPartner?.username || '',
                    display_name: preselectedPartner?.name || 'Tourist',
                    profile_picture: preselectedPartner?.profile_picture || null,
                    last_message: '',
                    last_message_timestamp: null,
                    last_message_ts: 0,
                    unread_count: 0,
                },
                ...prev,
            ];
        });
    }, [preselectedPartner]);

    useEffect(() => {
        if (!threadBottomRef.current) return;
        threadBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const conversationList = useMemo(() => {
        const merged = new Map();

        conversations.forEach((item) => {
            if (!item?.id) return;
            merged.set(Number(item.id), {
                ...item,
                id: Number(item.id),
                display_name: normalizeDisplayName(item),
                booking_count: Number(item.booking_count || 0),
            });
        });

        touristContacts.forEach((contact) => {
            const id = Number(contact.id);
            if (!id) return;

            if (!merged.has(id)) {
                merged.set(id, {
                    ...contact,
                    id,
                    display_name: normalizeDisplayName(contact),
                });
                return;
            }

            const existing = merged.get(id);
            merged.set(id, {
                ...existing,
                booking_count: Math.max(Number(existing?.booking_count || 0), Number(contact?.booking_count || 0)),
                booking_preview: existing?.booking_preview || contact?.booking_preview,
                profile_picture: existing?.profile_picture || contact?.profile_picture,
            });
        });

        const query = searchTerm.trim().toLowerCase();

        return Array.from(merged.values())
            .map((item) => {
                const id = Number(item.id);
                return {
                    ...item,
                    _isPinned: (prefs.pinned || []).includes(id),
                    _isMuted: (prefs.muted || []).includes(id),
                    _isArchived: (prefs.archived || []).includes(id),
                    _unreadCount: effectiveUnreadCount(item),
                };
            })
            .filter((item) => {
                if (!query) return true;
                const name = String(item.display_name || '').toLowerCase();
                const preview = String(item.last_message || item.booking_preview || '').toLowerCase();
                return name.includes(query) || preview.includes(query);
            })
            .filter((item) => {
                if (activeFilter === 'unread') return Number(item._unreadCount) > 0;
                if (activeFilter === 'pinned') return item._isPinned;
                if (activeFilter === 'archived') return item._isArchived;
                return true;
            })
            .sort((a, b) => {
                if (a._isPinned !== b._isPinned) {
                    return a._isPinned ? -1 : 1;
                }

                const aUnread = Number(a._unreadCount || 0);
                const bUnread = Number(b._unreadCount || 0);
                if (aUnread !== bUnread) return bUnread - aUnread;

                const aTs = Number(a.last_message_ts || 0);
                const bTs = Number(b.last_message_ts || 0);
                return bTs - aTs;
            });
    }, [activeFilter, conversations, effectiveUnreadCount, prefs.archived, prefs.muted, prefs.pinned, searchTerm, touristContacts]);

    const selectedPartner = useMemo(() => {
        if (!selectedPartnerId) return null;
        return conversationList.find((item) => Number(item.id) === Number(selectedPartnerId)) || null;
    }, [conversationList, selectedPartnerId]);

    const sendMessage = async () => {
        const targetId = Number(selectedPartnerId);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        const trimmed = composerText.trim();
        if (!trimmed || sending) return;

        const { content, redacted } = sanitizeOutgoingMessage(trimmed);

        setSending(true);
        setSendNotice(redacted ? 'Contact details were redacted for safety.' : '');

        try {
            await api.post(`/api/conversations/${targetId}/messages/`, { content });
            setComposerText('');
            await fetchThread(targetId, false);
            await fetchConversations();
        } catch (error) {
            const detail =
                error?.response?.data?.detail ||
                error?.response?.data?.receiver?.[0] ||
                error?.response?.data?.content?.[0] ||
                error?.message ||
                'Failed to send message.';
            setSendNotice(String(detail));
        } finally {
            setSending(false);
        }
    };

    const requestConversationDelete = useCallback((partnerId, partnerName = 'this conversation') => {
        const targetId = Number(partnerId);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        if (pendingUndo) {
            setSendNotice('Undo the current deletion first or wait a few seconds.');
            return;
        }

        const safeName = String(partnerName || 'this conversation').trim() || 'this conversation';
        setDeleteConfirmState({
            open: true,
            type: 'conversation',
            target: { id: targetId, name: safeName },
        });
    }, [pendingUndo]);

    const requestMessageDelete = useCallback((message) => {
        const targetId = Number(message?.id);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        if (pendingUndo) {
            setSendNotice('Undo the current deletion first or wait a few seconds.');
            return;
        }

        setMessageActionTarget(message);
    }, [pendingUndo]);

    const openMessageDeleteConfirm = useCallback((scope) => {
        const targetId = Number(messageActionTarget?.id);
        if (!Number.isFinite(targetId) || targetId <= 0) return;

        setDeleteConfirmState({
            open: true,
            type: 'message',
            target: {
                id: targetId,
                content: String(messageActionTarget?.content || '').slice(0, 80),
                scope: scope === 'everyone' ? 'everyone' : 'me',
            },
        });
        setMessageActionTarget(null);
    }, [messageActionTarget]);

    const restoreConversation = useCallback((snapshot) => {
        if (!snapshot) return;
        const targetId = Number(snapshot.id);

        setConversations((prev) => {
            const exists = prev.some((item) => Number(item.id) === targetId);
            if (exists) return prev;
            return [snapshot, ...prev];
        });
    }, []);

    const restoreMessage = useCallback((message, index) => {
        if (!message) return;
        const messageId = Number(message.id);

        setMessages((prev) => {
            const exists = prev.some((item) => Number(item.id) === messageId);
            if (exists) return prev;

            const next = [...prev];
            const insertAt = Number.isFinite(index) && index >= 0 ? Math.min(index, next.length) : next.length;
            next.splice(insertAt, 0, message);
            return next;
        });
    }, []);

    const undoPendingDelete = useCallback(() => {
        const pending = pendingUndo;
        if (!pending) return;

        if (pendingDeleteTimerRef.current) {
            clearTimeout(pendingDeleteTimerRef.current);
            pendingDeleteTimerRef.current = null;
        }

        if (pending.type === 'conversation') {
            restoreConversation(pending.conversationSnapshot);

            if (Number(pending.selectedPartnerIdBefore) === Number(pending.targetId)) {
                setSelectedPartnerId(Number(pending.targetId));
                if (Array.isArray(pending.messagesSnapshot)) {
                    setMessages(pending.messagesSnapshot);
                }
            }

            if (pending.prefsSnapshot) {
                persistPrefs(pending.prefsSnapshot);
            }
        }

        if (pending.type === 'message') {
            restoreMessage(pending.messageSnapshot, pending.index);
        }

        setPendingUndo(null);
        setSendNotice('Delete undone.');
    }, [pendingUndo, restoreConversation, restoreMessage, persistPrefs]);

    const confirmDeleteFromModal = useCallback(() => {
        const { type, target } = deleteConfirmState;
        setDeleteConfirmState({ open: false, type: null, target: null });

        if (!type || !target) return;

        if (pendingDeleteTimerRef.current) {
            clearTimeout(pendingDeleteTimerRef.current);
            pendingDeleteTimerRef.current = null;
        }

        if (type === 'conversation') {
            const targetId = Number(target.id);
            if (!Number.isFinite(targetId) || targetId <= 0) return;

            const snapshot = conversations.find((item) => Number(item.id) === targetId) || null;
            const selectedBefore = Number(selectedPartnerId);
            const messagesSnapshot = selectedBefore === targetId ? [...messages] : null;
            const prefsSnapshot = {
                pinned: [...(prefs.pinned || [])],
                muted: [...(prefs.muted || [])],
                archived: [...(prefs.archived || [])],
                forceUnread: [...(prefs.forceUnread || [])],
            };

            setConversations((prev) => prev.filter((item) => Number(item.id) !== targetId));
            if (selectedBefore === targetId) {
                setSelectedPartnerId(null);
                setMessages([]);
            }

            persistPrefs({
                pinned: (prefs.pinned || []).filter((id) => Number(id) !== targetId),
                muted: (prefs.muted || []).filter((id) => Number(id) !== targetId),
                archived: (prefs.archived || []).filter((id) => Number(id) !== targetId),
                forceUnread: (prefs.forceUnread || []).filter((id) => Number(id) !== targetId),
            });

            setPendingUndo({
                type: 'conversation',
                targetId,
                conversationSnapshot: snapshot,
                selectedPartnerIdBefore: selectedBefore,
                messagesSnapshot,
                prefsSnapshot,
            });
            setSendNotice('Conversation deleted. Undo is available for a few seconds.');

            pendingDeleteTimerRef.current = setTimeout(async () => {
                setBusyConversationDeleteId(targetId);
                try {
                    await api.delete(`/api/conversations/${targetId}/delete/`);
                    await fetchConversations();
                } catch (error) {
                    const detail =
                        error?.response?.data?.detail ||
                        error?.response?.data?.message ||
                        error?.message ||
                        'Failed to delete conversation.';

                    restoreConversation(snapshot);
                    if (selectedBefore === targetId) {
                        setSelectedPartnerId(targetId);
                        if (Array.isArray(messagesSnapshot)) {
                            setMessages(messagesSnapshot);
                        }
                    }
                    persistPrefs(prefsSnapshot);
                    setSendNotice(String(detail));
                } finally {
                    setBusyConversationDeleteId(null);
                    setPendingUndo((current) => (
                        current?.type === 'conversation' && Number(current?.targetId) === targetId
                            ? null
                            : current
                    ));
                    pendingDeleteTimerRef.current = null;
                }
            }, DELETE_UNDO_MS);
            return;
        }

        if (type === 'message') {
            const targetId = Number(target.id);
            if (!Number.isFinite(targetId) || targetId <= 0) return;
            const scope = target.scope === 'everyone' ? 'everyone' : 'me';

            const messageSnapshot = messages.find((item) => Number(item.id) === targetId) || null;
            const index = messages.findIndex((item) => Number(item.id) === targetId);

            setMessages((prev) => prev.filter((item) => Number(item.id) !== targetId));
            setPendingUndo({ type: 'message', targetId, messageSnapshot, index, scope });
            setSendNotice(scope === 'everyone'
                ? 'Message deleted for everyone. Undo is available for a few seconds.'
                : 'Message deleted. Undo is available for a few seconds.');

            pendingDeleteTimerRef.current = setTimeout(async () => {
                setBusyMessageDeleteId(targetId);
                try {
                    await api.delete(`/api/messages/${targetId}/delete/?scope=${scope}`);
                    await fetchConversations();
                } catch (error) {
                    const detail =
                        error?.response?.data?.detail ||
                        error?.response?.data?.message ||
                        error?.message ||
                        'Failed to delete message.';
                    restoreMessage(messageSnapshot, index);
                    setSendNotice(String(detail));
                } finally {
                    setBusyMessageDeleteId(null);
                    setPendingUndo((current) => (
                        current?.type === 'message' && Number(current?.targetId) === targetId
                            ? null
                            : current
                    ));
                    pendingDeleteTimerRef.current = null;
                }
            }, DELETE_UNDO_MS);
        }
    }, [deleteConfirmState, conversations, selectedPartnerId, messages, fetchConversations, restoreConversation, restoreMessage, prefs, persistPrefs]);

    return (
        <div className="bg-white/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-none overflow-hidden h-full min-h-0 w-full flex">
            <aside className="w-[360px] min-w-[320px] border-r border-slate-200 dark:border-slate-700/50 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-lg">Inbox</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tourist and agency conversations</p>
                        </div>
                        <button
                            onClick={fetchConversations}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                            title="Refresh conversations"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search tourist conversations"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'unread', label: 'Unread' },
                            { key: 'pinned', label: 'Pinned' },
                            { key: 'archived', label: 'Archived' },
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${activeFilter === filter.key
                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversationsLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading conversations...
                        </div>
                    ) : conversationList.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-60" />
                            <p className="font-medium">No conversations yet.</p>
                            {!!conversationsError && <p className="text-xs mt-2 text-red-500">{conversationsError}</p>}
                        </div>
                    ) : (
                        conversationList.map((item) => {
                            const isActive = Number(item.id) === Number(selectedPartnerId);
                            const unread = Number(item._unreadCount || 0);

                            return (
                                <div
                                    key={item.id}
                                    className={`group relative border-b border-slate-200/70 dark:border-slate-700/30 ${isActive ? 'bg-cyan-50/70 dark:bg-cyan-500/15' : ''}`}
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedPartnerId(Number(item.id));
                                            setReadState(item.id, false);
                                            setSendNotice('');
                                        }}
                                        className={`w-full text-left px-4 py-3 pr-12 transition-colors ${isActive ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold">
                                                {canRenderPartnerImage(item) ? (
                                                    <img
                                                        src={buildImageUrl(item.profile_picture)}
                                                        alt={item.display_name}
                                                        className="w-full h-full object-cover"
                                                        onError={() => markPartnerImageBroken(item.id)}
                                                    />
                                                ) : (
                                                    <CircleUserRound className="w-6 h-6 text-slate-500 dark:text-slate-300" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.display_name}</p>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                        <span>{formatRelativeTime(item.last_message_timestamp)}</span>
                                                        {item._isPinned && <Pin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300" />}
                                                        {item._isMuted && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" title="Muted" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                                                        {String(item.last_message || item.booking_preview || 'Start chatting').trim()}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                                                            {unread > 99 ? '99+' : unread}
                                                        </span>
                                                    )}
                                                </div>

                                                {Number(item.booking_count || 0) > 0 && (
                                                    <p className="text-[11px] mt-1 text-cyan-600 dark:text-cyan-400 font-medium">
                                                        {item.booking_count} booking{item.booking_count === 1 ? '' : 's'} with this tourist
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setConversationActionTarget(item);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 bg-white/95 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                        title={`Conversation actions for ${item.display_name}`}
                                    >
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            <section className="flex-1 flex flex-col">
                {!selectedPartner ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-slate-500 dark:text-slate-400">
                        <UserRound className="w-12 h-12 mb-4 opacity-60" />
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Select a conversation</h4>
                        <p className="text-sm mt-2 max-w-md">
                            Choose a tourist from the inbox to view messages, or start from the bookings list using Message Tourist.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/20">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold">
                                    {canRenderPartnerImage(selectedPartner) ? (
                                        <img
                                            src={buildImageUrl(selectedPartner.profile_picture)}
                                            alt={selectedPartner.display_name}
                                            className="w-full h-full object-cover"
                                            onError={() => markPartnerImageBroken(selectedPartner.id)}
                                        />
                                    ) : (
                                        <CircleUserRound className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-slate-900 dark:text-white font-bold truncate">{selectedPartner.display_name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        Tourist conversation thread
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => requestConversationDelete(selectedPartner.id, selectedPartner.display_name)}
                                disabled={busyConversationDeleteId === Number(selectedPartner.id)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 dark:text-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-70"
                                title="Delete this conversation from your inbox"
                            >
                                {busyConversationDeleteId === Number(selectedPartner.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                <span className="text-xs font-semibold">Delete conversation</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60 dark:bg-slate-900/30">
                            {messagesLoading ? (
                                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading thread...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                                    <MessageSquare className="w-10 h-10 mb-3 opacity-60" />
                                    <p className="font-medium">No messages yet</p>
                                    <p className="text-sm mt-1">Send a message to start this thread.</p>
                                    {!!messagesError && <p className="text-xs mt-3 text-red-500">{messagesError}</p>}
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isMine = Number(message.sender) === Number(currentUserId);
                                    return (
                                        <div key={message.id} className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className="relative">
                                                <div className={`max-w-[300px] rounded-2xl px-4 py-3 shadow-sm border ${isMine
                                                    ? 'bg-cyan-500 text-white border-cyan-400/60'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                                                    }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                                                    <p className={`text-[11px] mt-1.5 ${isMine ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => requestMessageDelete(message)}
                                                    disabled={busyMessageDeleteId === Number(message.id)}
                                                    className={`absolute -top-2 ${isMine ? '-left-2' : '-right-2'} inline-flex items-center justify-center w-6 h-6 rounded-full border border-rose-200 bg-white text-rose-500 dark:bg-slate-800 dark:text-rose-300 dark:border-rose-900/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70`}
                                                    title="Delete this message for your view"
                                                >
                                                    {busyMessageDeleteId === Number(message.id) ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={threadBottomRef} />
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/30">
                            {!!sendNotice && (
                                <div className="mb-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
                                    {sendNotice}
                                </div>
                            )}

                            <div className="flex items-end gap-3">
                                <textarea
                                    value={composerText}
                                    onChange={(event) => setComposerText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Type your message to the tourist"
                                    className="flex-1 resize-none px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={sending || !composerText.trim()}
                                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white transition-colors"
                                    title="Send message"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {conversationActionTarget && (
                <div className="fixed inset-0 z-[1250] bg-slate-900/45 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{conversationActionTarget.display_name}</h4>
                        </div>

                        <div className="py-1">
                            <button
                                onClick={() => {
                                    togglePref('pinned', conversationActionTarget.id);
                                    setConversationActionTarget(null);
                                }}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                {conversationActionTarget._isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                                onClick={() => {
                                    togglePref('muted', conversationActionTarget.id);
                                    setConversationActionTarget(null);
                                }}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                {conversationActionTarget._isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                                onClick={() => {
                                    togglePref('archived', conversationActionTarget.id);
                                    setConversationActionTarget(null);
                                }}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                {conversationActionTarget._isArchived ? 'Unarchive' : 'Archive'}
                            </button>
                            <button
                                onClick={() => {
                                    setReadState(conversationActionTarget.id, Number(conversationActionTarget._unreadCount || 0) === 0);
                                    setConversationActionTarget(null);
                                }}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                {Number(conversationActionTarget._unreadCount || 0) > 0 ? 'Mark as read' : 'Mark as unread'}
                            </button>
                            <button
                                onClick={() => {
                                    requestConversationDelete(conversationActionTarget.id, conversationActionTarget.display_name);
                                    setConversationActionTarget(null);
                                }}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            >
                                Delete conversation
                            </button>
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700/50">
                            <button
                                onClick={() => setConversationActionTarget(null)}
                                className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {messageActionTarget && (
                <div className="fixed inset-0 z-[1255] bg-slate-900/45 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete message</h4>
                            <p className="text-xs mt-1 text-slate-500 dark:text-slate-400 line-clamp-2">
                                {String(messageActionTarget.content || '') || 'Message'}
                            </p>
                        </div>

                        <div className="py-1">
                            <button
                                onClick={() => openMessageDeleteConfirm('me')}
                                className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                Delete for me
                            </button>
                            {Number(messageActionTarget.sender) === Number(currentUserId) && (
                                <button
                                    onClick={() => openMessageDeleteConfirm('everyone')}
                                    className="w-full text-left px-5 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                >
                                    Delete for everyone
                                </button>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700/50">
                            <button
                                onClick={() => setMessageActionTarget(null)}
                                className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmState.open && (
                <div className="fixed inset-0 z-[1200] bg-slate-900/45 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                {deleteConfirmState.type === 'conversation' ? 'Delete conversation?' : 'Delete message?'}
                            </h4>
                            <p className="text-sm mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                {deleteConfirmState.type === 'conversation'
                                    ? 'This conversation will be removed only from your account. You can undo for a few seconds.'
                                    : (deleteConfirmState.target?.scope === 'everyone'
                                        ? 'This message will be removed for both of you. You can undo for a few seconds.'
                                        : 'This message will be removed only from your account. You can undo for a few seconds.')}
                            </p>
                        </div>
                        <div className="px-6 py-4 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmState({ open: false, type: null, target: null })}
                                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteFromModal}
                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingUndo && (
                <div className="fixed bottom-5 right-5 z-[1201] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl px-4 py-3 flex items-center gap-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                        {pendingUndo.type === 'conversation'
                            ? 'Conversation deleted.'
                            : (pendingUndo.scope === 'everyone' ? 'Message deleted for everyone.' : 'Message deleted.')}
                    </p>
                    <button
                        onClick={undoPendingDelete}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
                    >
                        UNDO
                    </button>
                </div>
            )}
        </div>
    );
}
