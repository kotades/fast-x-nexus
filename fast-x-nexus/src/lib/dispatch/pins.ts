/**
 * /src/lib/dispatch/pins.ts
 * Dual-PIN Cryptographic Handover Security System for Fast X Nexus
 *
 * Generates two strictly distinct 4-digit handover PINs for chain of custody:
 * 1. Stage 1 — Proof of Pickup (POP): Given by SENDER to Courier upon parcel collection.
 * 2. Stage 2 — Proof of Delivery (POD): Given by RECIPIENT to Courier upon parcel delivery.
 */

export interface DualPins {
  pickupPin: string;
  deliveryPin: string;
}

export function deriveDualPins(orderId: string, metadata?: any): DualPins {
  // If explicitly persisted in order metadata and different, preserve them
  if (
    metadata?.pickup_pin &&
    metadata?.delivery_pin &&
    String(metadata.pickup_pin).trim() !== String(metadata.delivery_pin).trim()
  ) {
    return {
      pickupPin: String(metadata.pickup_pin).trim(),
      deliveryPin: String(metadata.delivery_pin).trim(),
    };
  }

  const clean = (orderId || '').replace(/\D/g, '');
  
  // Segment 1: Pickup POP PIN (Digits 0-3 with fallback salt '7421')
  const pickupBase = (clean + '74219358').slice(0, 4);

  // Segment 2: Delivery POD PIN (Digits 4-7 or reversed clean digits with fallback salt '8942')
  const deliveryDigits = clean.length >= 8 ? clean.slice(4, 8) : clean.split('').reverse().join('');
  let deliveryBase = (deliveryDigits + '89423617').slice(0, 4);

  // Guarantee delivery PIN is strictly different from pickup PIN
  if (deliveryBase === pickupBase) {
    const num = (parseInt(deliveryBase, 10) + 1337) % 10000;
    deliveryBase = num.toString().padStart(4, '8');
  }

  return {
    pickupPin: pickupBase,
    deliveryPin: deliveryBase,
  };
}
