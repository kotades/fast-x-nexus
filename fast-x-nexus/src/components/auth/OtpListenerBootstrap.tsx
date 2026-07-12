'use client';

import { useEffect, useRef } from 'react';

/**
 * OtpListenerBootstrap
 * Mounts invisibly in the root layout and opens a single SSE connection
 * to /api/auth/otp-listener. This keeps the Realtime → Baileys bridge alive
 * for as long as the user has the app open in any tab.
 */
export function OtpListenerBootstrap() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Only run on the server-rendering host (not in Storybook, tests, etc.)
    if (typeof window === 'undefined') return;

    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;
      
      console.log('🔌 [OTP Bootstrap] Opening SSE connection to OTP listener...');
      const es = new EventSource('/api/auth/otp-listener');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
            console.log(`[OTP Bootstrap] Realtime channel status: ${data.status}`);
          }
          if (data.dispatched) {
            console.log(`[OTP Bootstrap] OTP dispatched to: ${data.dispatched}`);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      es.onerror = () => {
        console.warn('[OTP Bootstrap] SSE connection dropped. Reconnecting in 5s...');
        es.close();
        if (mountedRef.current) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      eventSourceRef.current?.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Renders nothing — purely a background service bootstrap
  return null;
}
