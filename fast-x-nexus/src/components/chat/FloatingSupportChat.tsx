'use client';

/**
 * /src/components/chat/FloatingSupportChat.tsx
 * Fast X Nexus — Customer Omnichannel Live Support Drawer & Bubble
 *
 * Real-time customer support chat directly integrated into the Customer Dashboard.
 * Connects the customer with central dispatch & operations support.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  sendChatMessage,
  getChatMessages,
  markMessagesAsRead,
  type ChatMessage,
} from '@/app/actions/chat';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';

interface FloatingSupportChatProps {
  orderId?: string;
  defaultOpen?: boolean;
}

export function FloatingSupportChat({ orderId, defaultOpen = false }: FloatingSupportChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Customer');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Retrieve active shipment if available from context
  let activeShipmentId: string | undefined = orderId;
  let isBookingWizardActive = false;
  try {
    const ctx = useCustomerDashboard();
    if (!activeShipmentId && ctx?.activeShipment?.id) {
      activeShipmentId = ctx.activeShipment.id;
    }
    if (ctx?.activeView === 'booking_wizard') {
      isBookingWizardActive = true;
    }
  } catch {
    // Context might be optional
  }

  // Determine effective channel ID: active order id or customer user id
  const effectiveChannelId = activeShipmentId || userId || 'customer_general_ops';
  const channelType = 'admin_customer';

  // Load current auth session
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single();

        const meta = (profile?.metadata as any) || {};
        const name = (meta.full_name as string)?.trim() || 'Fast X Customer';
        setUserName(name);
      }
    }
    loadUser();
  }, [supabase]);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    if (!effectiveChannelId) return;

    const res = await getChatMessages({
      channelType,
      channelId: effectiveChannelId,
      limit: 100,
    });

    if (res.success && res.data) {
      setMessages(res.data);

      // Calculate unread count for messages sent by admins/dispatchers
      if (!isOpen) {
        const unread = res.data.filter((m) => !m.read && m.sender_role === 'admin').length;
        setUnreadCount(unread);
      }
    }
  }, [channelType, effectiveChannelId, isOpen]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark as read when drawer is open
  useEffect(() => {
    if (isOpen && effectiveChannelId) {
      setUnreadCount(0);
      markMessagesAsRead({ channelType, channelId: effectiveChannelId });
    }
  }, [isOpen, effectiveChannelId, channelType]);

  // Real-time Supabase subscription
  useEffect(() => {
    if (!effectiveChannelId) return;

    const channel = supabase
      .channel(`chat:customer:${effectiveChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${effectiveChannelId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (!isOpen && newMsg.sender_role === 'admin') {
              setUnreadCount((c) => c + 1);
            } else if (isOpen) {
              markMessagesAsRead({ channelType, channelId: effectiveChannelId });
            }
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
  }, [supabase, effectiveChannelId, isOpen, channelType]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Send message handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);
    setInputText('');

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channel_type: channelType,
      channel_id: effectiveChannelId,
      sender_id: userId || 'customer-optimistic',
      sender_role: 'customer',
      recipient_id: null,
      message: cleanText,
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: userId || 'customer-optimistic',
        role: 'customer',
        metadata: { full_name: userName },
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendChatMessage({
      channelType,
      channelId: effectiveChannelId,
      message: cleanText,
      senderId: userId || undefined,
      senderRole: 'customer',
    });

    setIsSending(false);

    if (res.success && res.data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (res.data as ChatMessage) : m)));
    } else {
      // Refresh to ensure integrity
      fetchMessages();
    }
  };

  // Quick Action Chips
  const sendQuickChip = (chipText: string) => {
    setInputText(chipText);
  };

  return (
    <>
      {/* Mobile Dim Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="sm:hidden fixed inset-0 bg-slate-900/15 backdrop-blur-xs z-[89]"
        />
      )}

      <div
        className={`fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 ${
          isOpen ? 'z-[90] bottom-3 right-3' : 'z-[35]'
        } flex flex-col items-end gap-2 sm:gap-3 pointer-events-auto ${
          isBookingWizardActive ? 'hidden sm:flex' : 'flex'
        }`}
      >
        {/* Live Chat Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="w-[calc(100vw-24px)] sm:w-[410px] max-w-[410px] h-[90vh] max-h-[90vh] sm:h-[540px] sm:max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden text-slate-900 origin-bottom-right font-sans"
            >
            {/* Header */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <span className="material-symbols-outlined text-base">support_agent</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                      Operations Support
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-300 font-bold">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {activeShipmentId
                      ? `Waybill Ref: FX-${activeShipmentId.slice(0, 8).toUpperCase()}`
                      : 'Fast X Central Dispatch'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Close Chat"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Direct Communication Channels (WhatsApp & Direct Call) */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <a
                href={`https://wa.me/2349014030047?text=${encodeURIComponent(
                  activeShipmentId
                    ? `Hello Fast X Support, I need assistance with shipment #FX-${activeShipmentId.slice(0, 8).toUpperCase()}`
                    : 'Hello Fast X Support, I need assistance with my delivery.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                title="Chat with Fast X Central Dispatch on WhatsApp"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">chat</span>
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href="tel:+2349014030047"
                className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                title="Direct phone line with Fast X Operations"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">call</span>
                <span>Call Operations</span>
              </a>
            </div>

            {/* Quick Context / Waybill Banner */}
            {activeShipmentId && (
              <div className="px-3.5 py-1.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-[11px] shrink-0">
                <span className="text-emerald-950 flex items-center gap-1.5 font-mono">
                  <span className="material-symbols-outlined text-xs text-emerald-700">local_shipping</span>
                  Shipment #FX-{activeShipmentId.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold font-mono">Auto-Linked</span>
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 mb-1">
                    <span className="material-symbols-outlined text-2xl">chat_bubble_outline</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">How can central ops assist you?</p>
                  <p className="text-[11px] text-slate-500 max-w-[240px]">
                    Direct line with our 24/7 dispatch architects and route specialists.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender_role === 'customer';
                  const senderDisplay =
                    isUser
                      ? 'You'
                      : msg.sender?.metadata?.full_name ||
                        (msg.sender_role === 'admin' ? 'Fast X Operations' : 'Fleet Dispatch');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500">
                        <span className="font-semibold">{senderDisplay}</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#347227] text-white rounded-br-xs shadow-sm font-sans'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs font-sans'
                        }`}
                      >
                        {msg.message}
                      </div>
                      {isUser && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                          {msg.read ? (
                            <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                              <span className="material-symbols-outlined text-[12px]">done_all</span> Read
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-[12px]">done</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Question Chips */}
            <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => sendQuickChip('Where is my rider currently?')}
                className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-xs text-primary" aria-hidden="true">location_on</span>
                <span>Where is my rider?</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuickChip('Need help updating dropoff address')}
                className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-xs text-amber-600" aria-hidden="true">edit</span>
                <span>Change dropoff</span>
              </button>
              <button
                type="button"
                onClick={() => sendQuickChip('Is express delivery available right now?')}
                className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-xs text-[#347227]" aria-hidden="true">bolt</span>
                <span>Express inquiry</span>
              </button>
            </div>

            {/* Input Footer */}
            <form
              onSubmit={handleSend}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask dispatch operations..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-9 h-9 rounded-xl bg-[#347227] hover:bg-[#28591e] disabled:opacity-40 disabled:hover:bg-[#347227] text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bubble */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_10px_25px_rgba(22,163,74,0.4)] ${isOpen ? 'hidden sm:flex' : 'flex'} items-center justify-center cursor-pointer border-2 border-emerald-400/40 transition-all`}
        aria-label="Toggle Support Chat"
      >
        <span className="material-symbols-outlined text-2xl">
          {isOpen ? 'chat_bubble' : 'support_agent'}
        </span>

        {/* Unread Alert Ping */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-surface shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Pulse Ring */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-75 pointer-events-none" />
        )}
      </motion.button>
    </div>
    </>
  );
}
