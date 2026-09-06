/**
 * /src/lib/geo/what3words.ts
 * Fast X Nexus — What3Words Integration Engine
 *
 * Recognizes 3-word addressing formats (e.g. "///filled.count.soap" or "filled.count.soap")
 * and converts them to precise 3m x 3m coordinates.
 */

import { isWithinNigeria } from './cascadingGeocoder';

// Regex for matching 3-word addresses: e.g. "///filled.count.soap" or "filled.count.soap"
const W3W_REGEX = /(?:^|[\s,])(?:\/{3})?([a-zA-Z]{3,}\.[a-zA-Z]{3,}\.[a-zA-Z]{3,})(?:[\s,]|$)/i;

export interface W3WMatch {
  words: string;
  lat: number;
  lng: number;
  nearestPlace?: string;
}

/**
 * Checks if a string contains a valid What3Words pattern.
 */
export function extractWhat3Words(input: string): string | null {
  if (!input) return null;
  const match = input.match(W3W_REGEX);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Converts a 3-word address to coordinates.
 */
export async function convertWhat3WordsToCoords(
  input: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<W3WMatch | null> {
  const words = extractWhat3Words(input);
  if (!words) return null;

  const key = apiKey || process.env.NEXT_PUBLIC_WHAT3WORDS_API_KEY || 'YOUR_W3W_API_KEY';

  try {
    const url = `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(
      words
    )}&key=${key}`;

    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      const coords = data.coordinates;
      if (coords && isWithinNigeria(coords.lat, coords.lng)) {
        return {
          words: `///${words}`,
          lat: coords.lat,
          lng: coords.lng,
          nearestPlace: data.nearestPlace,
        };
      }
    }
  } catch (err) {
    console.warn('[What3Words] API resolution error:', err);
  }

  return null;
}
