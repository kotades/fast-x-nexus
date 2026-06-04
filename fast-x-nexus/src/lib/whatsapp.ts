/**
 * /src/lib/whatsapp.ts
 * Fast X Nexus — WhatsApp Messaging Automation Wrapper
 *
 * Purpose:
 *   1. Generate wa.me deep-links for WhatsApp checkout redirects
 *   2. Format outbound message payloads for the Baileys background worker
 *   3. Send messages via the internal Baileys worker HTTP API
 *
 * Architecture Note:
 *   The Baileys WhatsApp session runs as a DECOUPLED background worker
 *   process on port 3001 (WHATSAPP_SERVER_URL). This Next.js lib communicates
 *   with it via internal HTTP. This keeps the WhatsApp session completely
 *   isolated from the Next.js server process.
 *
 * Deep-link Fallback:
 *   If the internal Baileys worker is unreachable, we fall back to generating
 *   a wa.me deep-link that opens the user's WhatsApp app with a pre-filled
 *   message template. This ensures checkout never fully breaks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppMessagePayload {
  /** Nigerian phone number. Include country code (e.g., '2348012345678') */
  to: string;
  message: string;
}

export interface SendMessageResult {
  tag: "success" | "failure" | "fallback";
  deepLink?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Phone Number Normalization
//
// Normalizes Nigerian phone numbers to international format.
// Strips leading zeros, adds +234 country code.
//
// @param phone - Raw phone number string (e.g., '08012345678')
// @returns Normalized number (e.g., '2348012345678')
// ---------------------------------------------------------------------------
export function normalizeNigerianPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle formats: 08XXXXXXXXX → 2348XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  // Already has country code
  if (digits.startsWith("234") && digits.length === 13) {
    return digits;
  }

  // Return as-is for international numbers or unknowns
  return digits;
}

// ---------------------------------------------------------------------------
// wa.me Deep-Link Generator
//
// Generates a WhatsApp deep-link that opens a pre-filled conversation.
// Used for the WhatsApp Checkout flow — sends users to admin support chat.
//
// @param phone - Raw phone number of the recipient
// @param message - Pre-filled message template text
// @returns wa.me URL string
// ---------------------------------------------------------------------------
export function generateWhatsAppDeepLink(
  phone: string,
  message: string
): string {
  const normalizedPhone = normalizeNigerianPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

// ---------------------------------------------------------------------------
// WhatsApp Checkout Deep-Link (Pre-filled Template)
//
// Generates the deep-link for the "Pay via WhatsApp Transfer" checkout flow.
// When clicked, it redirects the customer to the Fast X admin WhatsApp with
// a pre-filled message containing their Order ID and payment instructions.
//
// @param orderId - The unique Fast X Order ID
// @param adminPhone - The Fast X operations WhatsApp number
// @param amountNaira - The total charge amount in Naira
// @returns wa.me deep-link URL
// ---------------------------------------------------------------------------
export function generateCheckoutDeepLink(
  orderId: string,
  adminPhone: string,
  amountNaira: number
): string {
  const message = [
    `Hi Fast X Support! 👋`,
    ``,
    `I've just placed an order and would like to complete payment via bank transfer.`,
    ``,
    `📦 *Order ID:* ${orderId}`,
    `💰 *Amount Due:* ₦${amountNaira.toLocaleString("en-NG")}`,
    ``,
    `Please confirm my payment once you receive the transfer. Thank you!`,
  ].join("\n");

  return generateWhatsAppDeepLink(adminPhone, message);
}

// ---------------------------------------------------------------------------
// Send Automated Message via Internal Baileys Worker
//
// Posts a message request to the decoupled Baileys background worker.
// Falls back to generating a wa.me deep-link if the worker is unavailable.
//
// @param payload - WhatsAppMessagePayload { to, message }
// @returns SendMessageResult discriminated union
// ---------------------------------------------------------------------------
export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload
): Promise<SendMessageResult> {
  const workerUrl = process.env.WHATSAPP_SERVER_URL;

  if (!workerUrl) {
    console.warn("[WhatsApp] WHATSAPP_SERVER_URL not configured. Using deep-link fallback.");
    return {
      tag: "fallback",
      deepLink: generateWhatsAppDeepLink(payload.to, payload.message),
      error: "Worker URL not configured.",
    };
  }

  try {
    const response = await fetch(`${workerUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalizeNigerianPhone(payload.to),
        message: payload.message,
      }),
      signal: AbortSignal.timeout(8_000), // 8 second timeout
    });

    if (!response.ok) {
      // Worker responded but with an error — fall back to deep-link
      return {
        tag: "fallback",
        deepLink: generateWhatsAppDeepLink(payload.to, payload.message),
        error: `Worker error: ${response.status}`,
      };
    }

    return { tag: "success" };
  } catch (error) {
    // Worker unreachable — fall back gracefully to deep-link
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      tag: "fallback",
      deepLink: generateWhatsAppDeepLink(payload.to, payload.message),
      error: `Worker unreachable: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Pre-built Message Templates
// ---------------------------------------------------------------------------

/**
 * Recipient notification: Sent when an order transitions to PAID_UNASSIGNED.
 * Contains the tracking link and 4-digit Delivery PIN.
 */
export function buildRecipientNotificationMessage(params: {
  recipientName: string;
  vendorName: string;
  orderId: string;
  trackingUrl: string;
  deliveryPin: string;
}): string {
  return [
    `Hello ${params.recipientName}! 👋`,
    ``,
    `You have a package on its way from *${params.vendorName}*! 🚀`,
    ``,
    `📦 *Order ID:* ${params.orderId}`,
    `🔗 *Track your order:* ${params.trackingUrl}`,
    ``,
    `🔐 *Your Delivery PIN:* *${params.deliveryPin}*`,
    `Please share this PIN with the Fast X courier when your package arrives.`,
    ``,
    `Fast X Nexus — Delivered with precision. ⚡`,
  ].join("\n");
}

/**
 * Rider dispatch notification: Sent to riders in the relevant LGA pool.
 */
export function buildRiderDispatchMessage(params: {
  orderId: string;
  pickupHub: string;
  dropoffHub: string;
  parcelSize: string;
  payoutNaira: number;
}): string {
  return [
    `🚨 *New Job Available — Fast X Dispatch* 🚨`,
    ``,
    `📦 *Order ID:* ${params.orderId}`,
    `📍 *Pickup:* ${params.pickupHub}`,
    `🏁 *Dropoff:* ${params.dropoffHub}`,
    `📏 *Size:* ${params.parcelSize}`,
    `💵 *Your Payout:* ₦${params.payoutNaira.toLocaleString("en-NG")}`,
    ``,
    `Log into your workspace to claim this job before another rider does! ⚡`,
  ].join("\n");
}
