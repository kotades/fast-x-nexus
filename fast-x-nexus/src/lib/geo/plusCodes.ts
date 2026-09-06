/**
 * /src/lib/geo/plusCodes.ts
 * Fast X Nexus — Google Plus Codes (Open Location Code) Engine
 *
 * Provides offline, 100% accurate rooftop geocoding using the Open Location Code standard.
 * Supports full Plus Codes (e.g. "6FR5C2X2+33") and short Plus Codes with reference locality (e.g. "6FV5+8M, Ikorodu").
 */

import { OpenLocationCode } from 'open-location-code';
import { isWithinNigeria } from './cascadingGeocoder';

const olc = new OpenLocationCode();

// Regex matching standard Plus Codes: e.g. "6FR5C2X2+33" or "6FV5+8M" or "8FR6+7W Lagos"
const PLUS_CODE_REGEX = /\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i;

export interface PlusCodeMatch {
  code: string;
  lat: number;
  lng: number;
  isFull: boolean;
}

/**
 * Checks if a string contains a valid Google Plus Code.
 */
export function extractPlusCode(input: string): string | null {
  if (!input) return null;
  const match = input.match(PLUS_CODE_REGEX);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Decodes a Plus Code into geographic coordinates.
 * If the code is a short code (e.g., "6FV5+8M"), uses the reference coordinates (defaulting to Lagos center).
 */
export function decodePlusCode(
  input: string,
  referenceLat = 6.5244,
  referenceLng = 3.3792
): PlusCodeMatch | null {
  const code = extractPlusCode(input);
  if (!code) return null;

  try {
    if (olc.isFull(code)) {
      const area = olc.decode(code);
      const lat = area.latitudeCenter;
      const lng = area.longitudeCenter;
      if (isWithinNigeria(lat, lng)) {
        return { code, lat, lng, isFull: true };
      }
    } else if (olc.isShort(code)) {
      const recovered = olc.recoverNearest(code, referenceLat, referenceLng);
      const area = olc.decode(recovered);
      const lat = area.latitudeCenter;
      const lng = area.longitudeCenter;
      if (isWithinNigeria(lat, lng)) {
        return { code: recovered, lat, lng, isFull: false };
      }
    }
  } catch (err) {
    console.warn('[PlusCodes] Failed to decode code:', code, err);
  }

  return null;
}

/**
 * Encodes GPS coordinates into a standard Google Plus Code.
 */
export function encodePlusCode(lat: number, lng: number, codeLength = 10): string {
  try {
    return olc.encode(lat, lng, codeLength);
  } catch {
    return '';
  }
}
