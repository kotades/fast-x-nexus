'use client';

/**
 * /src/components/admin/AdminTabs/AdminChatInboxTab.tsx
 * Fast X Nexus — Enterprise Admin Omnichannel Chat Control Tower
 *
 * Centralized communications center for managing:
 * 1. Rider Radio Transmissions (admin_rider)
 * 2. Customer Inquiries & Support Tickets (admin_customer)
 * 3. Operations Team & Internal Staff Channels (admin_internal)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  getAdminChatThreads,
  getChatMessages,
  sendChatMessage,
  markMessagesAsRead,
  type ChatThread,
  type ChatMessage,
} from '@/app/actions/chat';

type ConversationCategory = 'all' | 'riders' | 'customers' | 'internal';

export function AdminChatInboxTab() {
  const [threads, setThreads] = useState<{
    riders: ChatThread[];
    customers: ChatThread[];
    internal: ChatThread[];
    all: ChatThread[];
  }>({ riders: [], customers: [], internal: [], all: [] });

  const [activeCategory, setActiveCategory] = useState<ConversationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ id: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Load current admin identity
  useEffect(() => {
    async function loadAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin Controller';
        setAdminProfile({ id: user.id, name });
      }
    }
    loadAdmin();
  }, [supabase]);

  // Load all threads
  const loadThreads = useCallback(async () => {
    const res = await getAdminChatThreads();
    if (res.success && res.data) {
      setThreads(res.data);

      // Preserve active thread if already selected
      if (selectedThread) {
        const updated = res.data.all.find((t) => t.threadKey === selectedThread.threadKey);
        if (updated) setSelectedThread(updated);
      } else if (res.data.all.length > 0) {
        setSelectedThread(res.data.all[0]);
      }
    }
    setIsLoadingThreads(false);
  }, [selectedThread]);

  // Initial load
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages for currently selected thread
  const loadActiveMessages = useCallback(async () => {
    if (!selectedThread) return;

    const res = await getChatMessages({
      channelType: selectedThread.channelType,
      channelId: selectedThread.channelId,
      limit: 100,
    });

    if (res.success && res.data) {
      setMessages(res.data);
      // Mark as read in DB
      markMessagesAsRead({
        channelType: selectedThread.channelType,
        channelId: selectedThread.channelId,
      });
      // Local thread unread count reset
      setThreads((prev) => ({
        ...prev,
        all: prev.all.map((t) =>
          t.threadKey === selectedThread.threadKey ? { ...t, unreadCount: 0 } : t
        ),
      }));
    }
  }, [selectedThread]);

  useEffect(() => {
    loadActiveMessages();
  }, [loadActiveMessages]);

  // Auto-scroll message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime Listener across all channels
  useEffect(() => {
    const channel = supabase
      .channel('admin_omnichannel_inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;

            // If message is in currently viewed thread, append directly
            if (
              selectedThread &&
              newMsg.channel_type === selectedThread.channelType &&
              newMsg.channel_id === selectedThread.channelId
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              markMessagesAsRead({
                channelType: selectedThread.channelType,
                channelId: selectedThread.channelId,
              });
            }

            // Refresh full threads to re-order by recent activity
            loadThreads();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ChatMessage;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedThread, loadThreads]);

  // Send admin reply
  const handleSendReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = (customText || replyText).trim();
    if (!content || !selectedThread || isSending) return;

    setIsSending(true);
    setReplyText('');

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      channel_type: selectedThread.channelType,
      channel_id: selectedThread.channelId,
      sender_id: adminProfile?.id || 'admin-optimistic',
      sender_role: 'admin',
      recipient_id: selectedThread.participantId || null,
      message: content,
      read: true,
      created_at: new Date().toISOString(),
      sender: {
        id: adminProfile?.id || 'admin-optimistic',
        role: 'admin',
        metadata: { full_name: adminProfile?.name || 'Operations Controller' },
      },
    };

    setMessages((prev) => [...prev, optimistic]);

    const res = await sendChatMessage({
      channelType: selectedThread.channelType,
      channelId: selectedThread.channelId,
      message: content,
      recipientId: selectedThread.participantId,
      senderId: adminProfile?.id,
      senderRole: 'admin',
    });

    setIsSending(false);

    if (res.success && res.data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (res.data as ChatMessage) : m)));
      loadThreads();
    } else {
      loadActiveMessages();
    }
  };

  // Filtered thread list
  const filteredThreads = useMemo(() => {
    let list: ChatThread[] = [];
    if (activeCategory === 'all') list = threads.all;
    else if (activeCategory === 'riders') list = threads.riders;
    else if (activeCategory === 'customers') list = threads.customers;
    else if (activeCategory === 'internal') list = threads.internal;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.participantName.toLowerCase().includes(q) ||
        t.channelId.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q) ||
        (t.participantContact && t.participantContact.includes(q))
    );
  }, [threads, activeCategory, searchQuery]);

  // Aggregate unread stats
  const totalUnread = useMemo(() => {
    return threads.all.reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  }, [threads]);

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-elevated border border-border rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase font-bold text-text-muted tracking-wider">Active Conversations</p>
            <p className="text-2xl font-black text-text mt-0.5">{threads.all.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">forum</span>
          </div>
        </div>

        <div className="p-4 bg-surface-elevated border border-border rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase font-bold text-text-muted tracking-wider">Rider Radios</p>
            <p className="text-2xl font-black text-amber-500 mt-0.5">{threads.riders.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-xl">two_wheeler</span>
          </div>
        </div>

        <div className="p-4 bg-surface-elevated border border-border rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase font-bold text-text-muted tracking-wider">Customer Inquiries</p>
            <p className="text-2xl font-black text-emerald-500 mt-0.5">{threads.customers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-xl">support_agent</span>
          </div>
        </div>

        <div className="p-4 bg-surface-elevated border border-border rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase font-bold text-text-muted tracking-wider">Pending Attention</p>
            <p className="text-2xl font-black text-rose-500 mt-0.5">{totalUnread}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <span className="material-symbols-outlined text-xl">mark_chat_unread</span>
          </div>
        </div>
      </div>

      {/* Main Omnichannel Two-Pane Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] bg-surface-elevated border border-border rounded-2xl overflow-hidden shadow-md">
        {/* Left Column: Thread Navigator (4 Cols) */}
        <div className="lg:col-span-4 border-r border-border flex flex-col h-full bg-surface">
          {/* Category Tabs */}
          <div className="p-3 border-b border-border bg-surface-low flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-transparent text-text-muted hover:text-text hover:bg-surface-dim/30'
              }`}
            >
              All
              <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full">
                {threads.all.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('riders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'riders'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-transparent text-text-muted hover:text-text hover:bg-surface-dim/30'
              }`}
            >
              Riders
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full font-bold">
                {threads.riders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'customers'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-transparent text-text-muted hover:text-text hover:bg-surface-dim/30'
              }`}
            >
              Customers
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded-full font-bold">
                {threads.customers.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('internal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'internal'
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                  : 'bg-transparent text-text-muted hover:text-text hover:bg-surface-dim/30'
              }`}
            >
              Internal
            </button>
          </div>

          {/* Search Input */}
          <div className="p-3 border-b border-border bg-surface">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-dim text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads, names, waybills..."
                className="w-full bg-surface-low border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:bg-surface-elevated transition-colors"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border bg-surface">
            {isLoadingThreads ? (
              <div className="p-6 text-center text-xs text-text-muted animate-pulse">
                Loading communication channels...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-text-muted space-y-2">
                <span className="material-symbols-outlined text-3xl text-text-dim">chat_bubble_outline</span>
                <p className="text-xs">No conversations found</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.threadKey === thread.threadKey;
                const isRider = thread.category === 'riders';
                const isCustomer = thread.category === 'customers';

                return (
                  <button
                    key={thread.threadKey}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full p-3.5 text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-surface-low bg-transparent'
                    }`}
                  >
                    {/* Role Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                        isRider
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : isCustomer
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {isRider ? 'two_wheeler' : isCustomer ? 'person' : 'shield_person'}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-text truncate max-w-[150px]">
                          {thread.participantName}
                        </span>
                        <span className="text-[10px] text-text-dim shrink-0">
                          {new Date(thread.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-muted truncate mb-1">
                        {thread.lastMessage}
                      </p>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                            isRider
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isCustomer
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {thread.channelType}
                        </span>

                        {thread.unreadCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-500 text-white rounded-full font-bold ml-auto shadow-xs">
                            {thread.unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Stream (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-surface-low">
          {selectedThread ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 bg-surface-elevated border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      selectedThread.category === 'riders'
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : selectedThread.category === 'customers'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {selectedThread.category === 'riders'
                        ? 'two_wheeler'
                        : selectedThread.category === 'customers'
                        ? 'person'
                        : 'shield_person'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-text">
                        {selectedThread.participantName}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted font-bold">
                        {selectedThread.category.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono">
                      Channel: {selectedThread.channelType} // ID: {selectedThread.channelId.slice(0, 16)}...
                      {selectedThread.participantContact && (
                        <span className="text-emerald-700 font-bold ml-2">
                          • Phone: {selectedThread.participantContact}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* External Actions */}
                <div className="flex items-center gap-2">
                  {selectedThread.participantContact && (
                    <a
                      href={`https://wa.me/${selectedThread.participantContact.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={loadActiveMessages}
                    className="p-2 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-muted hover:text-text transition-colors cursor-pointer shadow-xs"
                    title="Refresh Channel"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                  </button>
                </div>
              </div>

              {/* Message History Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2">
                    <span className="material-symbols-outlined text-4xl text-text-dim">forum</span>
                    <p className="text-xs">No messages in this stream yet.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_role === 'admin';
                    const senderLabel = isAdmin
                      ? 'Ops Controller'
                      : msg.sender?.metadata?.full_name ||
                        (msg.sender_role === 'rider' ? 'Fleet Rider' : 'Customer');

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-text-muted">
                          <span
                            className={`font-semibold ${
                              isAdmin
                                ? 'text-primary'
                                : msg.sender_role === 'rider'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {senderLabel}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-primary text-white rounded-br-xs shadow-sm'
                              : 'bg-surface-elevated border border-border text-text rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <div className="text-[10px] text-text-dim mt-0.5">
                          {msg.read ? 'Delivered & Seen' : 'Transmitted'}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Macro Quick Replies */}
              <div className="px-4 py-2 bg-surface border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-text-muted uppercase font-mono font-bold shrink-0">
                  Macros:
                </span>
                <button
                  type="button"
                  onClick={() => handleSendReply(undefined, 'We are dispatching a nearby fleet rider immediately.')}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-low text-text border border-border transition-colors cursor-pointer shadow-xs"
                >
                  ⚡ Assigning Nearby Rider
                </button>
                <button
                  type="button"
                  onClick={() => handleSendReply(undefined, 'Your waybill has been verified on the blockchain radar.')}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-low text-text border border-border transition-colors cursor-pointer shadow-xs"
                >
                  ✓ Waybill Verified
                </button>
                <button
                  type="button"
                  onClick={() => handleSendReply(undefined, 'Please provide the 4-digit Delivery PIN for verification.')}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-low text-text border border-border transition-colors cursor-pointer shadow-xs"
                >
                  🔑 Request PIN
                </button>
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={(e) => handleSendReply(e)}
                className="p-3 bg-surface border-t border-border flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${selectedThread.participantName}...`}
                  className="flex-1 bg-surface-elevated border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text placeholder:text-text-dim focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>Transmit</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim shadow-xs">
                <span className="material-symbols-outlined text-3xl">mark_chat_read</span>
              </div>
              <p className="text-sm font-bold text-text">Select a conversation thread</p>
              <p className="text-xs text-text-muted max-w-[280px] text-center">
                Monitor live communications between fleet riders, customers, and operations staff.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
