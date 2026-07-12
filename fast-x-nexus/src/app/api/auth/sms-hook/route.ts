import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Secure payload extraction
    const payload = await request.json();
    
    // Standard Supabase SMS Hook Payload Structure:
    // { "user": { "phone": "+234..." }, "sms": { "otp": "123456" } }
    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      console.error('🚨 [SMS HOOK] Malformed payload received:', payload);
      // We return 200 so Supabase doesn't retry aggressively and lock the queue
      return NextResponse.json({ error: 'Missing phone or OTP' }, { status: 200 });
    }

    // 2. Clean and Format the E.164 String
    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // 3. Construct the Corporate Message
    const message = `Your Fast X Nexus secure access verification code is: *${otp}*\n\nIt will expire in 5 minutes.`;

    // 4. Dispatch to the Baileys WhatsApp Engine
    const workerUrl = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';
    
    console.log(`🚀 [SMS HOOK] Dispatching OTP to Baileys Engine for: ${cleanPhone}`);
    
    try {
      const workerResponse = await fetch(`${workerUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanPhone,
          message: message,
        }),
      });

      if (!workerResponse.ok) {
        console.error('❌ [SMS HOOK] Baileys Worker rejected the request:', await workerResponse.text());
      } else {
        console.log(`✅ [SMS HOOK] Successfully routed OTP to ${cleanPhone}`);
      }
    } catch (fetchError) {
      console.error('💥 [SMS HOOK] FATAL: Baileys Worker is offline or unreachable!', fetchError);
    }

    // 5. Synchronization Check: Clean HTTP 200 back to Supabase GoTrue
    return NextResponse.json({ success: true, status: 'acknowledged' }, { status: 200 });

  } catch (error) {
    console.error('🔥 [SMS HOOK] Unhandled exception in interceptor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}
