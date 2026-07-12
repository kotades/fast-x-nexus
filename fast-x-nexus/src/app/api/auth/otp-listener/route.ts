/**
 * /src/app/api/auth/otp-listener/route.ts
 * Fast X Nexus — OTP Dispatch Queue Realtime Listener
 *
 * This is a long-lived Server-Sent Events (SSE) endpoint.
 * The Supabase PL/pgSQL hook writes OTP rows to `otp_dispatch_queue`.
 * This server-side route subscribes to that table via Supabase Realtime,
 * intercepts each INSERT, and forwards the OTP to the Baileys WhatsApp
 * worker at localhost:3001 — completely bypassing the cloud-to-local barrier.
 *
 * This route is called ONCE at app startup via the OtpListenerBootstrap component.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Service role client — bypasses RLS to read the protected otp_dispatch_queue
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const workerUrl = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';

  const encoder = new TextEncoder();

  let cleanupFunction: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to all INSERT events on the otp_dispatch_queue table
      const channel = supabase
        .channel('otp-dispatch-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'otp_dispatch_queue',
          },
          async (payload) => {
            const { id, phone, otp_code } = payload.new as {
              id: string;
              phone: string;
              otp_code: string;
            };

            console.log(`📨 [OTP Listener] New OTP detected for ${phone} — dispatching to Baileys...`);

            const message = `Your Fast X Nexus secure access verification code is: *${otp_code}*\n\nThis code will expire in 5 minutes. Do not share it with anyone.`;

            try {
              const workerRes = await fetch(`${workerUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: phone, message }),
              });

              if (workerRes.ok) {
                console.log(`✅ [OTP Listener] OTP successfully dispatched to ${phone}`);

                // Mark the row as dispatched
                await supabase
                  .from('otp_dispatch_queue')
                  .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
                  .eq('id', id);
              } else {
                const err = await workerRes.text();
                console.error(`❌ [OTP Listener] Baileys Worker rejected for ${phone}:`, err);

                await supabase
                  .from('otp_dispatch_queue')
                  .update({ status: 'failed' })
                  .eq('id', id);
              }
            } catch (fetchError) {
              console.error(`💥 [OTP Listener] Baileys Worker OFFLINE for ${phone}:`, fetchError);

              await supabase
                .from('otp_dispatch_queue')
                .update({ status: 'failed' })
                .eq('id', id);
            }

            // Push event to the SSE stream so the Bootstrap component knows it's alive
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ dispatched: phone })}\n\n`)
              );
            } catch (e) {
              // Ignore closed stream error
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔌 [OTP Listener] Realtime channel status: ${status}`);
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status })}\n\n`)
            );
          } catch (e) {
            // Controller may already be closed if client disconnected
            console.log(`🔌 [OTP Listener] Stream closed, skipping status push`);
          }
        });

      // Keep the SSE connection alive with a heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          console.log(`🔌 [OTP Listener] Heartbeat write failed. Initiating cleanup...`);
          if (cleanupFunction) cleanupFunction();
        }
      }, 30000);

      let isCleanedUp = false;
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        clearInterval(heartbeat);
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Ignore removal errors if channel is already dead
        }
        console.log('🔴 [OTP Listener] SSE client disconnected or errored. Channel and resources cleaned up.');
        try {
          controller.close();
        } catch (e) {
          // Ignore if controller is already closed
        }
      };

      cleanupFunction = cleanup;

      // Cleanup when the client disconnects or the request is aborted
      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      if (cleanupFunction) cleanupFunction();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
