/**
 * /src/lib/email.ts
 * Fast X Nexus — Enterprise Transactional Email Engine
 *
 * Provides:
 * 1. Order Confirmed Receipt HTML Builder (Waybill tracking, breakdown, route)
 * 2. Delivery Confirmation Certificate HTML Builder (Cryptographic PIN proof, timestamp)
 * 3. Resend API Transport Wrapper with zero-dependency fetch & graceful Sandbox Mode fallback
 */

export interface OrderConfirmedEmailProps {
  orderId: string;
  waybillNumber?: string;
  customerName?: string;
  customerEmail?: string;
  recipientName?: string;
  recipientPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  amount: number;
  currency?: string;
  trackingUrl: string;
  estimatedDelivery?: string;
}

export interface DeliveryConfirmationEmailProps {
  orderId: string;
  waybillNumber?: string;
  customerName?: string;
  customerEmail?: string;
  recipientName: string;
  dropoffAddress: string;
  deliveryPin: string;
  deliveredAt: string;
  riderName?: string;
  amount?: number;
  trackingUrl: string;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  sandbox?: boolean;
  error?: string;
}

/**
 * Builds high-converting, cyber-industrial HTML for Order Confirmed Receipt.
 */
export function buildOrderConfirmedEmail(props: OrderConfirmedEmailProps): { html: string; text: string } {
  const currency = props.currency || 'NGN';
  const formattedAmount = `₦${Number(props.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  const waybill = props.waybillNumber || `FX-${props.orderId.slice(0, 8).toUpperCase()}`;
  const name = props.customerName || 'Valued Customer';

  const text = `
FAST X NEXUS — ORDER DISPATCH CONFIRMED
Waybill: ${waybill}
Order ID: ${props.orderId}
Amount: ${formattedAmount} ${currency}

Hi ${name},
Your shipment order has been confirmed and routed to the Fast X Nexus dispatch network.

ROUTE DETAILS:
Pickup: ${props.pickupAddress}
Dropoff: ${props.dropoffAddress}
Recipient: ${props.recipientName || 'Recipient'} ${props.recipientPhone ? `(${props.recipientPhone})` : ''}

Track your shipment in real-time:
${props.trackingUrl}

Thank you for shipping with Fast X Nexus.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — ${waybill}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background-color: #f0fdf4; padding: 32px 28px; border-bottom: 2px solid #16a34a; text-align: left; }
    .logo-badge { display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #475569; margin: 0; }
    .content { padding: 32px 28px; }
    .waybill-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .waybill-num { font-family: monospace; font-size: 20px; font-weight: 700; color: #16a34a; letter-spacing: 1px; }
    .amount-badge { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .route-flow { margin: 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 3px solid #16a34a; }
    .stop-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px; }
    .stop-val { font-size: 14px; font-weight: 500; color: #0f172a; margin-top: 2px; margin-bottom: 12px; }
    .cta-button { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 6px; letter-spacing: 0.5px; margin: 20px 0; text-align: center; }
    .cta-button:hover { background-color: #15803d; }
    .footer { padding: 24px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="container">
      <div class="header">
        <div class="logo-badge">FAST X NEXUS // DISPATCH CONFIRMATION</div>
        <h1 class="title">Waybill Generated & Confirmed</h1>
        <p class="subtitle">Your delivery request has entered the active logistics grid.</p>
      </div>

      <div class="content">
        <p style="font-size: 15px; color: #334155; margin-top: 0;">
          Hello <strong>${name}</strong>, your shipment request is locked in and currently pending rider dispatch matching.
        </p>

        <div class="waybill-card">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Waybill Number</div>
              <div class="waybill-num">${waybill}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Total Paid</div>
              <div class="amount-badge">${formattedAmount}</div>
            </div>
          </div>
        </div>

        <div class="route-flow">
          <div class="stop-label">Pickup Origin</div>
          <div class="stop-val">${props.pickupAddress}</div>

          <div class="stop-label">Destination & Recipient</div>
          <div class="stop-val" style="margin-bottom: 0;">
            ${props.dropoffAddress}<br/>
            <span style="font-size: 12px; color: #64748b;">Recipient: ${props.recipientName || 'Unspecified'} ${props.recipientPhone ? `• ${props.recipientPhone}` : ''}</span>
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${props.trackingUrl}" class="cta-button">
            TRACK LIVE SHIPMENT RADAR &rarr;
          </a>
          <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
            Live GPS telemetry updates once rider is assigned.
          </div>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px 0;">Fast X Nexus Autonomous Logistics Network • Lagos, Nigeria</p>
        <p style="margin: 0;">Need support? Reply to this email or open chat directly in your customer portal.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { html, text };
}

/**
 * Builds Delivery Confirmation Certificate HTML with Delivery PIN proof.
 */
export function buildDeliveryConfirmationEmail(props: DeliveryConfirmationEmailProps): { html: string; text: string } {
  const waybill = props.waybillNumber || `FX-${props.orderId.slice(0, 8).toUpperCase()}`;
  const name = props.customerName || 'Valued Customer';
  const deliveredDate = new Date(props.deliveredAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const text = `
FAST X NEXUS — OFFICIAL DELIVERY CERTIFICATE
Waybill: ${waybill}
Order ID: ${props.orderId}
Status: DELIVERED & COMPLETED
Delivered At: ${deliveredDate}
Delivery PIN Proof: ${props.deliveryPin}

Hi ${name},
Cargo package has been successfully delivered and verified via one-time secure delivery PIN.

DELIVERY PROOF:
Recipient: ${props.recipientName}
Destination: ${props.dropoffAddress}
Assigned Rider: ${props.riderName || 'Fast X Fleet Rider'}
Security Proof: Verified with PIN [${props.deliveryPin}]

View your digital delivery certificate & receipt:
${props.trackingUrl}

Thank you for choosing Fast X Nexus.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Confirmed — ${waybill}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background-color: #f0fdf4; padding: 32px 28px; border-bottom: 2px solid #16a34a; text-align: left; }
    .cert-badge { display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #15803d; margin: 0; }
    .content { padding: 32px 28px; }
    .pin-certificate { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
    .pin-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #15803d; margin: 10px 0; }
    .cert-table { width: 100%; border-collapse: collapse; margin-top: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .cert-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .cert-table td.label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; width: 35%; }
    .cert-table td.val { color: #0f172a; font-weight: 500; }
    .cta-button { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 6px; letter-spacing: 0.5px; margin: 20px 0; text-align: center; }
    .cta-button:hover { background-color: #15803d; }
    .footer { padding: 24px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="container">
      <div class="header">
        <div class="cert-badge">CERTIFICATE OF PROOF OF DELIVERY (POD)</div>
        <h1 class="title">Package Delivered Successfully</h1>
        <p class="subtitle">Handover verified via customer authentication PIN.</p>
      </div>

      <div class="content">
        <p style="font-size: 15px; color: #334155; margin-top: 0;">
          Hi <strong>${name}</strong>, your package has been handed over safely. The transaction is fully completed and verified.
        </p>

        <div class="pin-certificate">
          <div style="font-size: 11px; text-transform: uppercase; color: #16a34a; letter-spacing: 2px; font-weight: 700;">
            VERIFIED DELIVERY PIN CODE
          </div>
          <div class="pin-code">${props.deliveryPin}</div>
          <div style="font-size: 12px; color: #15803d; font-weight: 600;">
            ✓ Digitally authenticated & settled
          </div>
        </div>

        <table class="cert-table">
          <tr>
            <td class="label">Waybill</td>
            <td class="val"><strong>${waybill}</strong></td>
          </tr>
          <tr>
            <td class="label">Delivered To</td>
            <td class="val">${props.recipientName} (${props.dropoffAddress})</td>
          </tr>
          <tr>
            <td class="label">Completed Time</td>
            <td class="val">${deliveredDate}</td>
          </tr>
          ${props.riderName ? `
          <tr>
            <td class="label">Delivering Rider</td>
            <td class="val">${props.riderName}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label">Status</td>
            <td class="val" style="color: #16a34a; font-weight: 700;">COMPLETED / SETTLED</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="${props.trackingUrl}" class="cta-button">
            VIEW DIGITAL LEDGER RECEIPT &rarr;
          </a>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px 0;">Fast X Nexus Logistics System • Cryptographic Handover Audit</p>
        <p style="margin: 0;">This email serves as your permanent proof of delivery certificate.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { html, text };
}

/**
 * Enterprise Email Transport Wrapper.
 * Uses Resend API via native fetch if RESEND_API_KEY is defined.
 * If not defined, safely logs email to stdout in sandbox mode without throwing errors.
 */
export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = payload.from || process.env.EMAIL_FROM || 'Fast X Nexus <deliveries@fastx.ng>';
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

  // Sandbox Mode fallback
  if (!apiKey) {
    console.info(
      `\n============================== [EMAIL SANDBOX MODE] ==============================
To: ${recipients.join(', ')}
From: ${from}
Subject: ${payload.subject}
Timestamp: ${new Date().toISOString()}
[Note: Set RESEND_API_KEY in environment variables for live delivery]
----------------------------------------------------------------------------------
${payload.text || '(HTML Body Rendered)'}
==================================================================================\n`
    );

    return {
      success: true,
      sandbox: true,
      messageId: `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  // Live Resend API delivery
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[sendTransactionalEmail] Resend API error:', result);
      return {
        success: false,
        error: result.message || 'Failed to dispatch email via Resend',
      };
    }

    return {
      success: true,
      sandbox: false,
      messageId: result.id,
    };
  } catch (err: any) {
    console.error('[sendTransactionalEmail] Network / Exception error:', err);
    return {
      success: false,
      error: err.message || 'Unexpected email delivery exception',
    };
  }
}

/**
 * Convenience helper: Send Order Confirmed Receipt.
 */
export async function sendOrderConfirmedEmail(props: OrderConfirmedEmailProps) {
  const targetEmail = props.customerEmail || 'orders@fastx.ng';
  const { html, text } = buildOrderConfirmedEmail(props);
  const waybill = props.waybillNumber || `FX-${props.orderId.slice(0, 8).toUpperCase()}`;

  return sendTransactionalEmail({
    to: targetEmail,
    subject: `Order Confirmed [${waybill}] — Fast X Nexus`,
    html,
    text,
  });
}

/**
 * Convenience helper: Send Delivery Confirmation Certificate.
 */
export async function sendDeliveryConfirmedEmail(props: DeliveryConfirmationEmailProps) {
  const targetEmail = props.customerEmail || 'deliveries@fastx.ng';
  const { html, text } = buildDeliveryConfirmationEmail(props);
  const waybill = props.waybillNumber || `FX-${props.orderId.slice(0, 8).toUpperCase()}`;

  return sendTransactionalEmail({
    to: targetEmail,
    subject: `Delivery Certificate & Proof [${waybill}] — Fast X Nexus`,
    html,
    text,
  });
}
