import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare, RefreshCw, Search, Send, UserRound, CircleUserRound } from 'lucide-react';
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
    const [composerText, setComposerText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendNotice, setSendNotice] = useState('');
    const [brokenImagePartnerIds, setBrokenImagePartnerIds] = useState({});

    const threadBottomRef = useRef(null);

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

            const unreadTotal = normalized.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
            onUnreadCountChange(unreadTotal);
        } catch (error) {
            const detail =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                'Could not load conversations.';
            setConversationsError(String(detail));
            setConversations([]);
            onUnreadCountChange(0);
        } finally {
            setConversationsLoading(false);
        }
    }, [onUnreadCountChange]);

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

                const unreadTotal = next.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
                onUnreadCountChange(unreadTotal);
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
    }, [onUnreadCountChange]);

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
            .filter((item) => {
                if (!query) return true;
                const name = String(item.display_name || '').toLowerCase();
                const preview = String(item.last_message || item.booking_preview || '').toLowerCase();
                return name.includes(query) || preview.includes(query);
            })
            .sort((a, b) => {
                const aUnread = Number(a.unread_count || 0);
                const bUnread = Number(b.unread_count || 0);
                if (aUnread !== bUnread) return bUnread - aUnread;

                const aTs = Number(a.last_message_ts || 0);
                const bTs = Number(b.last_message_ts || 0);
                return bTs - aTs;
            });
    }, [conversations, touristContacts, searchTerm]);

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
                            const unread = Number(item.unread_count || 0);

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedPartnerId(Number(item.id));
                                        setSendNotice('');
                                    }}
                                    className={`w-full text-left px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/30 transition-colors ${isActive
                                        ? 'bg-cyan-50/70 dark:bg-cyan-500/15'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                                        }`}
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
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {formatRelativeTime(item.last_message_timestamp)}
                                                </span>
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
                                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm border ${isMine
                                                ? 'bg-cyan-500 text-white border-cyan-400/60'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                                                }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                                                <p className={`text-[11px] mt-1.5 ${isMine ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
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
        </div>
    );
}
