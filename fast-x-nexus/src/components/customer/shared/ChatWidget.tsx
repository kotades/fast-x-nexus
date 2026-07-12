'use client';

/**
 * ChatWidget — Floating Support FAB with Spring Popover
 *
 * Bottom-right floating action button with Framer Motion spring entrance.
 * Shows popover on hover.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = { id: string; sender: 'agent' | 'user'; text: string };

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'agent', text: 'Welcome to Fast X Support. How can we help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputValue.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');

    // Simulate agent reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + 1,
        sender: 'agent',
        text: "I've received your message. Let me check the status of your shipment."
      }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#ffffff]/95 backdrop-blur-xl border border-border/50 shadow-[0_12px_48px_rgba(0,0,0,0.12)] w-80 h-[450px] flex flex-col overflow-hidden origin-bottom-right"
          >
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">support_agent</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-text leading-tight">Support Engine</h3>
                  <p className="text-[10px] text-text-muted">Typically replies instantly</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-low/30">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-l-xl rounded-tr-xl' 
                        : 'bg-white border border-border/50 text-text rounded-r-xl rounded-tl-xl shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-white">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  className="flex-1 bg-surface-low border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer relative"
            onClick={() => setIsOpen(true)}
          >
            <span className="material-symbols-outlined text-2xl">chat</span>
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}