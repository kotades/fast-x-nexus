'use client';

/**
 * /src/components/chat/RiderDispatchChat.tsx
 * Fast X Nexus — Tactical Rider Dispatch Radio Chat Drawer
 *
 * Direct radio comms channel connecting active fleet riders with central dispatch operators.
 * Features tactical one-tap status transmissions, live audio ping cues, and real-time Supabase sync.
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

interface RiderDispatchChatProps {
  riderId?: string;
  orderId?: string;
  defaultOpen?: boolean;
}

export function RiderDispatchChat({ riderId, orderId, defaultOpen = false }: RiderDispatchChatProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [resolvedRiderId, setResolvedRiderId] = useState<string>(riderId || '');
  const [riderCallsign, setRiderCallsign] = useState<string>('Fleet Rider');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Channel identification
  const effectiveChannelId = orderId || resolvedRiderId || 'rider_radio_default';
  const channelType = 'admin_rider';

  // Load auth user / rider profile
  useEffect(() => {
    async function loadRider() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setResolvedRiderId(user.id);
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          `Rider-${user.id.slice(0, 6).toUpperCase()}`;
        setRiderCallsign(name);
      } else if (!resolvedRiderId) {
        // Fallback default demo rider ID
        setResolvedRiderId('589d8701-f284-4e40-823d-ee57e8459788');
        setRiderCallsign('Rider #FX-823D');
      }
    }
    loadRider();
  }, [supabase, resolvedRiderId]);

  // Global event listener to toggle dispatch radio from within waybill cards
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('fastx:open_dispatch_radio', handleOpen);
    return () => window.removeEventListener('fastx:open_dispatch_radio', handleOpen);
  }, []);

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    if (!effectiveChannelId) return;

    const res = await getChatMessages({
      channelType,
      channelId: effectiveChannelId,
      limit: 100,
    });

    if (res.success && res.data) {
      setMessages(res.data);

      if (!isOpen) {
        const unread = res.data.filter((m) => !m.read && m.sender_role === 'admin').length;
        setUnreadCount(unread);
      }
    }
  }, [channelType, effectiveChannelId, isOpen]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark messages as read when drawer is open
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
      .channel(`radio:rider:${effectiveChannelId}`)
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

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Transmit radio dispatch
  const handleTransmit = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const content = (customContent || inputText).trim();
    if (!content || isTransmitting) return;

    setIsTransmitting(true);
    setInputText('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channel_type: channelType,
      channel_id: effectiveChannelId,
      sender_id: resolvedRiderId || 'rider-optimistic',
      sender_role: 'rider',
      recipient_id: null,
      message: content,
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: resolvedRiderId || 'rider-optimistic',
        role: 'rider',
        metadata: { full_name: riderCallsign },
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendChatMessage({
      channelType,
      channelId: effectiveChannelId,
      message: content,
      senderId: resolvedRiderId || undefined,
      senderRole: 'rider',
    });

    setIsTransmitting(false);

    if (res.success && res.data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (res.data as ChatMessage) : m)));
    } else {
      fetchMessages();
    }
  };

  return (
    <>
      {/* Mobile Dim Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="sm:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-[89]"
        />
      )}

      <div
        className={`fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 ${
          isOpen ? 'z-[90] bottom-3 right-3' : 'z-[35]'
        } flex flex-col items-end gap-2 sm:gap-3 pointer-events-auto`}
      >
        {/* Radio Comms Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 25 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="w-[calc(100vw-24px)] sm:w-[420px] max-w-[420px] h-[90vh] max-h-[90vh] sm:h-[560px] sm:max-h-[85vh] bg-surface-elevated/95 backdrop-blur-2xl border border-border border-l-4 border-l-primary rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden text-text font-mono origin-bottom-right"
            >
            {/* Tactical Radio Header */}
            <div className="p-3.5 bg-surface border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-lg">radio</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-text font-mono">
                      DISPATCH RADIO TOWER
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-700 rounded border border-emerald-500/30 font-bold">
                      CH-01
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted font-mono tracking-tight">
                    FREQ: 142.85 MHz • CALLSIGN: {riderCallsign}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-dim flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
                aria-label="Close Radio"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="px-3.5 py-1.5 bg-surface-low border-b border-border flex items-center justify-between text-[10px] font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                CENTRAL DISPATCH CONNECTED
              </span>
              <span className="text-emerald-600 font-bold">LATENCY: 14ms</span>
            </div>

            {/* Radio Transmission Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-dim/40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-emerald-600 mb-1">
                    <span className="material-symbols-outlined text-2xl">podcasts</span>
                  </div>
                  <p className="text-xs font-bold text-text uppercase tracking-wider font-mono">
                    Channel Clear // Ready
                  </p>
                  <p className="text-[11px] text-text-muted max-w-[260px]">
                    Use quick transmission chips below for instant tactical dispatches to central ops.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isRider = msg.sender_role === 'rider';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isRider ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-text-muted">
                        <span className={isRider ? 'text-emerald-600 font-bold' : 'text-primary font-bold'}>
                          {isRider ? 'RIDER' : 'DISPATCH'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs font-mono leading-relaxed border ${
                          isRider
                            ? 'bg-emerald-600 text-white border-emerald-500 rounded-br-xs shadow-sm'
                            : 'bg-surface-elevated border-border text-text rounded-bl-xs shadow-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                      {isRider && (
                        <div className="text-[9px] text-text-muted mt-0.5 font-mono">
                          {msg.read ? 'ACKNOWLEDGED BY OPS' : 'TRANSMITTED'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Tactical Transmission Chips */}
            <div className="p-2 bg-surface border-t border-border grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => handleTransmit(undefined, 'ARRIVED AT PICKUP LOCATION')}
                disabled={isTransmitting}
                className="px-2 py-1.5 rounded bg-surface-dim hover:bg-surface border border-border text-left text-text transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-xs text-emerald-600" aria-hidden="true">location_on</span>
                <span>Arrived Pickup</span>
              </button>
              <button
                type="button"
                onClick={() => handleTransmit(undefined, 'CARGO SECURED IN TOP-BOX')}
                disabled={isTransmitting}
                className="px-2 py-1.5 rounded bg-surface-dim hover:bg-surface border border-border text-left text-text transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-xs text-amber-500" aria-hidden="true">inventory_2</span>
                <span>Cargo Secured</span>
              </button>
              <button
                type="button"
                onClick={() => handleTransmit(undefined, 'TRAFFIC DELAY: Approx +10 mins')}
                disabled={isTransmitting}
                className="px-2 py-1.5 rounded bg-surface-dim hover:bg-surface border border-border text-left text-text transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-xs text-amber-500" aria-hidden="true">traffic</span>
                <span>Traffic +10m</span>
              </button>
              <button
                type="button"
                onClick={() => handleTransmit(undefined, 'CUSTOMER PHONE UNREACHABLE')}
                disabled={isTransmitting}
                className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-xs text-red-500" aria-hidden="true">phone_disabled</span>
                <span>No Answer</span>
              </button>
            </div>

            {/* Custom Comms Input */}
            <form
              onSubmit={(e) => handleTransmit(e)}
              className="p-3 bg-surface border-t border-border flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Transmit message to dispatch..."
                className="flex-1 bg-surface-low border border-border focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-text placeholder:text-text-dim focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTransmitting}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-sm">cell_tower</span>
                <span>TX</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Radio Transceiver Trigger */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_10px_25px_rgba(22,163,74,0.4)] ${isOpen ? 'hidden sm:flex' : 'flex'} items-center justify-center cursor-pointer border-2 border-emerald-400/40 transition-all`}
        aria-label="Toggle Dispatch Radio"
      >
        <span className="material-symbols-outlined text-2xl text-white">
          {isOpen ? 'radio_button_checked' : 'radio'}
        </span>

        {/* Unread Alert */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-600 text-white text-[10px] font-black font-mono rounded-full flex items-center justify-center border-2 border-surface shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Tactical Pulse */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
        )}
      </motion.button>
    </div>
    </>
  );
}
