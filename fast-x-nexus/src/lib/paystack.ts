/**
 * /src/lib/paystack.ts
 * Fast X Nexus — Paystack Payment Gateway Wrapper
 *
 * Purpose: Secure programmatic wrapper for:
 *   1. Verifying Paystack webhook HMAC-SHA512 signatures
 *   2. Initializing inline checkout transactions
 *   3. Verifying transaction status by reference
 *
 * Security Standard: ASVS Level 2
 * Idempotency: Enforced at DB layer via composite unique key (order_id + event_type)
 *
 * CRITICAL: PAYSTACK_SECRET_KEY must ONLY be used server-side.
 * Never expose the secret key to the browser.
 */

import crypto from "crypto";

// ---------------------------------------------------------------------------
// Paystack Webhook Event Types relevant to Fast X
// ---------------------------------------------------------------------------
export type PaystackEventType =
  | "charge.success"
  | "charge.failed"
  | "transfer.success"
  | "transfer.failed"
  | "transfer.reversed";

// ---------------------------------------------------------------------------
// Paystack Transaction Status
// ---------------------------------------------------------------------------
export type PaystackTransactionStatus = "success" | "failed" | "abandoned";

// ---------------------------------------------------------------------------
// Paystack Webhook Payload Shape
// ---------------------------------------------------------------------------
export interface PaystackWebhookPayload {
  event: PaystackEventType;
  data: {
    id: number;
    reference: string;
    amount: number; // Amount in kobo (₦1 = 100 kobo)
    currency: string;
    status: PaystackTransactionStatus;
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: Record<string, unknown>;
    paid_at?: string;
    created_at?: string;
  };
}

// ---------------------------------------------------------------------------
// Paystack Transaction Verification Response
// ---------------------------------------------------------------------------
export interface PaystackVerifyResult {
  tag: "success" | "failure";
  reference?: string;
  amountKobo?: number;
  status?: PaystackTransactionStatus;
  error?: string;
}

// ---------------------------------------------------------------------------
// Security: Validate Paystack Webhook Signature (HMAC-SHA512)
//
// Paystack signs all webhook payloads with HMAC-SHA512 using your secret key.
// We MUST validate this before processing any order state changes.
//
// @param rawBody   - The raw request body Buffer (do NOT parse before validation)
// @param signature - The x-paystack-signature header value
// @returns true if the signature is valid
// ---------------------------------------------------------------------------
export function validatePaystackWebhookSignature(
  rawBody: Buffer | string,
  signature: string
): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    console.error("[Paystack] PAYSTACK_SECRET_KEY is not configured.");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Verify a Transaction by Reference via Paystack REST API
//
// Used to confirm payment status BEFORE transitioning order state to PAID.
// Always verify server-side — never trust client-reported payment status.
//
// @param reference - The unique Paystack payment reference string
// @returns PaystackVerifyResult discriminated union
// ---------------------------------------------------------------------------
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return { tag: "failure", error: "Paystack secret key not configured." };
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        // Enforce a timeout to prevent hanging requests
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      return {
        tag: "failure",
        error: `Paystack API error: ${response.status} ${response.statusText}`,
      };
    }

    const body = await response.json();

    if (!body.status || !body.data) {
      return { tag: "failure", error: "Invalid response from Paystack API." };
    }

    return {
      tag: "success",
      reference: body.data.reference,
      amountKobo: body.data.amount,
      status: body.data.status as PaystackTransactionStatus,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { tag: "failure", error: `Network error: ${message}` };
  }
}

/**
 * Converts a Paystack kobo amount to Naira.
 * @param kobo - Amount in kobo (Paystack's smallest unit)
 * @returns Amount in Naira
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Converts a Naira amount to Paystack's kobo unit.
 * @param naira - Amount in Naira
 * @returns Amount in kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
