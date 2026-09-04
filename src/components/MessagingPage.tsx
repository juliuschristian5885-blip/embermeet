import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile, Message, Conversation } from '@/lib/types';
import { ICEBREAKER_MESSAGES } from '@/lib/types';
import { formatMessageTime, formatLastActive } from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';
import {
  Send,
  MessageCircle,
  ArrowLeft,
  User as UserIcon,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

interface MessagingPageProps {
  initialPartnerId: string | null;
  onOpenProfile: (profile: Profile) => void;
}

export function MessagingPage({ initialPartnerId, onOpenProfile }: MessagingPageProps) {
  const { user, profile: myProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(initialPartnerId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIcebreakers, setShowIcebreakers] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: sentMsgs, error: sentError } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    const { data: recvMsgs, error: recvError } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (sentError || recvError) {
      console.error('Failed to load conversations');
      setLoading(false);
      return;
    }

    const allMsgs = [...(sentMsgs || []), ...(recvMsgs || [])] as Message[];
    const partnerIds = new Set<string>();
    const latestByPartner: Record<string, Message> = {};

    for (const msg of allMsgs) {
      const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      partnerIds.add(partnerId);
      if (!latestByPartner[partnerId] || new Date(msg.created_at) > new Date(latestByPartner[partnerId].created_at)) {
        latestByPartner[partnerId] = msg;
      }
    }

    if (partnerIds.size === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: partnerProfiles, error: partnerError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(partnerIds));

    if (partnerError || !partnerProfiles) {
      setLoading(false);
      return;
    }

    const profileMap: Record<string, Profile> = {};
    for (const p of partnerProfiles as Profile[]) {
      profileMap[p.id] = p;
    }

    // Count unread
    const unreadByPartner: Record<string, number> = {};
    for (const msg of recvMsgs || []) {
      if (!msg.read_at) {
        const partnerId = msg.sender_id;
        unreadByPartner[partnerId] = (unreadByPartner[partnerId] || 0) + 1;
      }
    }

    const convos: Conversation[] = Array.from(partnerIds)
      .map((pid) => ({
        partnerId: pid,
        partner: profileMap[pid],
        lastMessage: latestByPartner[pid],
        unreadCount: unreadByPartner[pid] || 0,
      }))
      .filter((c) => c.partner)
      .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

    setConversations(convos);
    setLoading(false);
  }, [user]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return;
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      setLoadingMessages(false);
      return;
    }

    const allMsgs = (data || []) as Message[];
    const convoMsgs = allMsgs.filter(
      (m) =>
        (m.sender_id === user.id && m.recipient_id === partnerId) ||
        (m.sender_id === partnerId && m.recipient_id === user.id)
    );
    setMessages(convoMsgs);

    // Mark as read
    const unreadMsgs = convoMsgs.filter((m) => m.recipient_id === user.id && !m.read_at);
    if (unreadMsgs.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in(
          'id',
          unreadMsgs.map((m) => m.id)
        );
      fetchConversations();
    }

    setLoadingMessages(false);
  }, [user, fetchConversations]);

  // Fetch partner profile
  useEffect(() => {
    if (activePartnerId) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', activePartnerId)
        .maybeSingle()
        .then(({ data }) => {
          setPartnerProfile(data as Profile | null);
        });
      fetchMessages(activePartnerId);
    }
  }, [activePartnerId, fetchMessages]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            newMsg.sender_id === user.id ||
            newMsg.recipient_id === user.id
          ) {
            // If in active conversation, add message
            if (activePartnerId) {
              if (
                (newMsg.sender_id === user.id && newMsg.recipient_id === activePartnerId) ||
                (newMsg.sender_id === activePartnerId && newMsg.recipient_id === user.id)
              ) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                // Mark as read if received
                if (newMsg.recipient_id === user.id && !newMsg.read_at) {
                  supabase
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', newMsg.id);
                }
              }
            }
            fetchConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activePartnerId, fetchConversations]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !activePartnerId) return;

    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      recipient_id: activePartnerId,
      content: newMessage.trim(),
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: activePartnerId,
      content: tempMsg.content,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvos = conversations.filter((c) =>
    c.partner.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pt-16 h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Conversations list */}
        <div
          className={`${
            activePartnerId ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 flex-col border-r border-cream-200 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800/50`}
        >
          <div className="p-4 border-b border-cream-200 dark:border-charcoal-700">
            <h1 className="text-xl font-bold text-charcoal-700 dark:text-cream-100 mb-3">
              Messages
            </h1>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 dark:text-cream-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="input-field text-sm py-2 pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-cream-200 dark:bg-charcoal-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-cream-200 dark:bg-charcoal-700 rounded w-2/3" />
                      <div className="h-3 bg-cream-200 dark:bg-charcoal-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle
                  size={40}
                  className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-3"
                />
                <p className="text-sm text-charcoal-500 dark:text-cream-400">
                  No conversations yet. Start chatting from a profile!
                </p>
              </div>
            ) : (
              filteredConvos.map((convo) => (
                <button
                  key={convo.partnerId}
                  onClick={() => setActivePartnerId(convo.partnerId)}
                  className={`w-full flex items-center gap-3 p-3 border-b border-cream-100 dark:border-charcoal-700/50 transition-colors ${
                    activePartnerId === convo.partnerId
                      ? 'bg-terracotta-400/10'
                      : 'hover:bg-cream-100 dark:hover:bg-charcoal-700/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold text-lg">
                      {convo.partner.display_name[0]?.toUpperCase()}
                    </div>
                    {convo.partner.is_online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-cream-50 dark:border-charcoal-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-charcoal-700 dark:text-cream-100 truncate flex items-center gap-1">
                        {convo.partner.display_name}
                        {convo.partner.is_verified && <VerificationBadge size={14} />}
                      </span>
                      <span className="text-xs text-charcoal-400 dark:text-cream-500 shrink-0 ml-2">
                        {formatMessageTime(convo.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm truncate ${
                          convo.unreadCount > 0
                            ? 'text-charcoal-600 dark:text-cream-200 font-medium'
                            : 'text-charcoal-400 dark:text-cream-500'
                        }`}
                      >
                        {convo.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                        {convo.lastMessage.content}
                      </p>
                      {convo.unreadCount > 0 && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-terracotta-400 text-white text-xs font-bold flex items-center justify-center">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div
          className={`${
            activePartnerId ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-white dark:bg-charcoal-800`}
        >
          {activePartnerId && partnerProfile ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-cream-200 dark:border-charcoal-700">
                <button
                  onClick={() => setActivePartnerId(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-cream-100 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta-400 to-ember-500 flex items-center justify-center text-white font-bold">
                    {partnerProfile.display_name[0]?.toUpperCase()}
                  </div>
                  {partnerProfile.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-charcoal-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-charcoal-700 dark:text-cream-100 truncate">
                      {partnerProfile.display_name}
                    </h2>
                    {partnerProfile.is_verified && <VerificationBadge size={16} />}
                  </div>
                  <p className="text-xs text-charcoal-400 dark:text-cream-500">
                    {partnerProfile.is_online
                      ? 'Online now'
                      : `Last active ${formatLastActive(partnerProfile.last_active)}`}
                  </p>
                </div>
                <button
                  onClick={() => onOpenProfile(partnerProfile)}
                  className="p-2 rounded-lg hover:bg-cream-100 dark:hover:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 transition-colors"
                  title="View profile"
                >
                  <UserIcon size={20} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto chat-scroll p-4 space-y-2">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-terracotta-400/30 border-t-terracotta-400 rounded-full animate-spin" />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            isMine
                              ? 'bg-terracotta-400 text-white rounded-br-md'
                              : 'bg-cream-100 dark:bg-charcoal-700 text-charcoal-700 dark:text-cream-100 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? 'text-cream-100/70' : 'text-charcoal-400 dark:text-cream-500'
                            }`}
                          >
                            {formatMessageTime(msg.created_at)}
                            {isMine && msg.read_at && ' · Read'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Icebreaker menu */}
              {showIcebreakers && (
                <div className="px-4 pb-2 animate-slide-up">
                  <div className="card p-3 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-charcoal-500 dark:text-cream-400 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-terracotta-400" />
                        Icebreaker messages
                      </span>
                      <button
                        onClick={() => setShowIcebreakers(false)}
                        className="p-1 rounded-lg hover:bg-cream-100 dark:hover:bg-charcoal-700 text-charcoal-400 dark:text-cream-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {ICEBREAKER_MESSAGES.map((msg, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setNewMessage(msg);
                            setShowIcebreakers(false);
                          }}
                          className="w-full text-left text-sm px-3 py-2.5 rounded-xl bg-cream-50 dark:bg-charcoal-700/50 text-charcoal-600 dark:text-cream-300 hover:bg-terracotta-400/10 hover:text-terracotta-500 transition-colors"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-cream-200 dark:border-charcoal-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIcebreakers((s) => !s)}
                    className={`p-3 rounded-xl transition-all shrink-0 ${
                      showIcebreakers
                        ? 'bg-terracotta-400 text-white'
                        : 'bg-cream-200 dark:bg-charcoal-700 text-charcoal-500 dark:text-cream-400 hover:bg-terracotta-400/10'
                    }`}
                    title="Send icebreaker"
                  >
                    <Sparkles size={20} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-xl bg-terracotta-400 hover:bg-terracotta-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle
                  size={48}
                  className="mx-auto text-charcoal-300 dark:text-charcoal-600 mb-4"
                />
                <p className="text-charcoal-500 dark:text-cream-400">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
