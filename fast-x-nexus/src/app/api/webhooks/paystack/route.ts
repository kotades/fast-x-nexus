import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body text for HMAC verification
    const rawBody = await request.text();

    // 2. Extract and verify x-paystack-signature
    const signature = request.headers.get('x-paystack-signature');
    if (!signature) {
      console.error('🚨 [PAYSTACK WEBHOOK] Missing x-paystack-signature header');
      return new Response('Unauthorized: Missing signature', { status: 401 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('🚨 [PAYSTACK WEBHOOK] PAYSTACK_SECRET_KEY is not configured in the environment');
      return new Response('Internal Server Error', { status: 500 });
    }

    // Compute HMAC-SHA512 signature
    const computedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      console.error('🚨 [PAYSTACK WEBHOOK] Cryptographic signature mismatch!');
      return new Response('Unauthorized: Signature mismatch', { status: 401 });
    }

    // 3. Parse payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const data = payload.data;
    const reference = data?.reference;
    const metadata = data?.metadata;
    const orderId = metadata?.order_id;

    // Handle payment failure event defensively
    if (eventType === 'charge.failed') {
      const failureReason = data?.gateway_response || 'Payment declined or aborted';
      console.warn(`❌ [PAYSTACK WEBHOOK] Payment failed for Order ID: ${orderId}. Reference: ${reference}. Reason: ${failureReason}. Status stays locked at PLACED.`);
      // Return 200 OK to stop retries, but do not touch the state machine
      return NextResponse.json({ success: true, status: 'failed_logged', reason: failureReason }, { status: 200 });
    }

    // Standard Paystack Webhook Event check
    if (eventType !== 'charge.success') {
      console.log(`ℹ️ [PAYSTACK WEBHOOK] Ignoring event type: "${eventType}". Returning 200 OK.`);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (!data) {
      console.error('🚨 [PAYSTACK WEBHOOK] Missing data block in payload');
      return NextResponse.json({ error: 'Missing data block' }, { status: 200 });
    }

    const amountSubunits = data.amount; // In kobo for NGN

    if (!orderId) {
      console.error('🚨 [PAYSTACK WEBHOOK] No order_id found in metadata');
      return NextResponse.json({ error: 'Missing order_id in metadata' }, { status: 200 });
    }

    // Convert kobo subunits to Naira
    const paymentAmount = Number(amountSubunits) / 100;
    const formattedAmount = `₦${paymentAmount.toFixed(2)}`;

    console.log(`💳 [PAYSTACK WEBHOOK] Signature verified. Event: charge.success. Order ID: ${orderId}, Amount: ${formattedAmount}, Reference: ${reference}`);

    // 4. Initialize Admin Supabase Client (RLS override)
    const supabase = await createAdminClient();

    // 5. Fetch order status and details for Idempotency Check & Verification
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, customer_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error(`❌ [PAYSTACK WEBHOOK] Order ${orderId} not found in database:`, orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 200 });
    }

    // Idempotency Check: if status is PAID_UNASSIGNED or further, return 200 OK immediately
    const processedStatuses = ['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];
    if (processedStatuses.includes(order.status)) {
      console.log(`ℹ️ [PAYSTACK WEBHOOK] Order ${orderId} is already in status "${order.status}". Idempotency matched. Skipping transition.`);
      return NextResponse.json({ success: true, status: 'already_processed' }, { status: 200 });
    }

    // Cross-examine payment amount to protect against pricing tampering
    if (Number(order.total_amount) !== paymentAmount) {
      console.error(`🚨 [PAYSTACK WEBHOOK] Price tampering detected! DB Total (₦${order.total_amount}) !== Paid Amount (${formattedAmount})`);
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 200 });
    }

    // 6. Invoke FSM: Transitions state PLACED -> PAID_UNASSIGNED
    const { data: transitionResult, error: transitionError } = await supabase.rpc(
      'process_order_state_transition',
      {
        target_order_id: orderId,
        next_status: 'PAID_UNASSIGNED',
      }
    );

    if (transitionError) {
      console.error(`❌ [PAYSTACK WEBHOOK] PL/pgSQL State transition failed for Order ${orderId}:`, transitionError);
      return NextResponse.json({ error: 'Transition failed', details: transitionError.message }, { status: 200 });
    }

    console.log(`✅ [PAYSTACK WEBHOOK] Order ${orderId} successfully transitioned to PAID_UNASSIGNED`);

    // 7. Compile document structures and write logging trace
    console.log('📝 [PAYSTACK WEBHOOK] DOCUMENT GENERATION TRACE:', JSON.stringify({
      document_type: 'LOGISTICS_WAYBILL_AND_RECEIPT',
      timestamp: new Date().toISOString(),
      order_details: {
        order_id: orderId,
        customer_id: order.customer_id,
        amount_paid: paymentAmount,
        gateway_reference: reference,
        waybill_number: `WYB-${orderId.substring(0, 8).toUpperCase()}`,
        hub_allocation: 'Effurun Hub pool',
      }
    }, null, 2));

    // 8. Fetch customer profile for WhatsApp dispatch alert
    const { data: customerProfile, error: customerError } = await supabase
      .from('profiles')
      .select('whatsapp_contact')
      .eq('id', order.customer_id)
      .single();

    const recipientList: string[] = [];
    if (customerProfile?.whatsapp_contact) {
      recipientList.push(customerProfile.whatsapp_contact);
    }

    // Fetch Admin profiles to notify the admin workspace/dashboard
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('whatsapp_contact')
      .eq('role', 'admin');

    if (adminProfiles) {
      adminProfiles.forEach(admin => {
        if (admin.whatsapp_contact && !recipientList.includes(admin.whatsapp_contact)) {
          recipientList.push(admin.whatsapp_contact);
        }
      });
    }

    const alertMessage = `📦 Fast X Dispatch Alert: Order ${orderId} has been paid successfully (${formattedAmount}). Logistics Waybill generated. Package is waiting in the Effurun Hub pool for rider pickup.`;

    const workerUrl = process.env.WHATSAPP_WORKER_URL || 'http://localhost:3001/send-message';
    console.log(`🚀 [PAYSTACK WEBHOOK] Attempting notification dispatch to worker URL: ${workerUrl}`);

    // Fire webhook notices to recipients
    for (const rawPhone of recipientList) {
      const cleanPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
      console.log(`📤 Sending dispatch notification to: ${cleanPhone}`);
      try {
        const workerResponse = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: cleanPhone,
            message: alertMessage,
          }),
        });

        if (!workerResponse.ok) {
          console.error(`❌ [PAYSTACK WEBHOOK] Baileys Worker rejected dispatch to ${cleanPhone}:`, await workerResponse.text());
        } else {
          console.log(`✅ [PAYSTACK WEBHOOK] Dispatch message successfully sent to ${cleanPhone}`);
        }
      } catch (dispatchError) {
        console.error(`💥 [PAYSTACK WEBHOOK] Failed to contact Baileys Worker for ${cleanPhone}:`, dispatchError);
      }
    }

    // 9. Return HTTP 200 OK to acknowledge receipt
    return NextResponse.json({ success: true, status: 'resolved' }, { status: 200 });

  } catch (error) {
    console.error('🔥 [PAYSTACK WEBHOOK] Unhandled exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}
