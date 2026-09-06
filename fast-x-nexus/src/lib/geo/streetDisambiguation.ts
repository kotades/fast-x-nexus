/**
 * /src/lib/geo/streetDisambiguation.ts
 * Fast X Nexus — Duplicate Street Name Disambiguation Engine
 *
 * In Lagos, dozens of popular street names exist identically across multiple LGAs
 * (e.g. "Church Street" in Ikeja vs Surulere vs Lagos Island).
 * This engine detects un-disambiguated queries and provides 1-tap LGA resolution chips
 * before an order is placed, preventing couriers from being dispatched to the wrong borough.
 */

export interface DisambiguationOption {
  lga: string;
  region: string; // 'Island' | 'Mainland' | 'Ikorodu' | 'Alimosho'
  formattedLabel: string;
  augmentedQuery: string;
}

export interface DisambiguationResult {
  isAmbiguous: boolean;
  detectedStreet: string;
  options: DisambiguationOption[];
}

/**
 * Registry of high-frequency duplicate street names across Lagos
 */
const DUPLICATE_STREET_REGISTRY: Record<string, Array<{ lga: string; region: string }>> = {
  'church street': [
    { lga: 'Ikeja', region: 'Mainland' },
    { lga: 'Surulere', region: 'Mainland' },
    { lga: 'Lagos Island', region: 'Island' },
    { lga: 'Ikorodu', region: 'Ikorodu' },
    { lga: 'Alimosho', region: 'Alimosho' },
  ],
  'adeshina street': [
    { lga: 'Ikeja', region: 'Mainland' },
    { lga: 'Surulere', region: 'Mainland' },
    { lga: 'Ikorodu', region: 'Ikorodu' },
    { lga: 'Oshodi', region: 'Mainland' },
  ],
  'awolowo road': [
    { lga: 'Ikoyi', region: 'Island' },
    { lga: 'Ikorodu', region: 'Ikorodu' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'ogunlana drive': [
    { lga: 'Surulere', region: 'Mainland' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'market street': [
    { lga: 'Lagos Island', region: 'Island' },
    { lga: 'Ebute Metta', region: 'Mainland' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'post office road': [
    { lga: 'Lagos Island', region: 'Island' },
    { lga: 'Mushin', region: 'Mainland' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'station road': [
    { lga: 'Ebute Metta', region: 'Mainland' },
    { lga: 'Agege', region: 'Mainland' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'commercial avenue': [
    { lga: 'Yaba', region: 'Mainland' },
    { lga: 'Apapa', region: 'Mainland' },
    { lga: 'Ikeja', region: 'Mainland' },
  ],
  'hospital road': [
    { lga: 'Lagos Island', region: 'Island' },
    { lga: 'Surulere', region: 'Mainland' },
    { lga: 'Ikorodu', region: 'Ikorodu' },
  ],
  'airport road': [
    { lga: 'Ikeja', region: 'Mainland' },
    { lga: 'Oshodi-Isolo', region: 'Mainland' },
    { lga: 'Ajao Estate', region: 'Mainland' },
  ],
  'bode thomas': [
    { lga: 'Surulere', region: 'Mainland' },
    { lga: 'Onipanu', region: 'Mainland' },
  ],
  'broadway': [
    { lga: 'Lagos Island', region: 'Island' },
    { lga: 'Yaba', region: 'Mainland' },
  ],
};

const KNOWN_LGA_TOKENS = new Set([
  'ikeja', 'surulere', 'lagos island', 'island', 'ikoyi', 'vi', 'victoria island',
  'lekki', 'yaba', 'mainland', 'ikorodu', 'alimosho', 'egbeda', 'agege', 'apapa',
  'oshodi', 'isolo', 'maryland', 'ebute metta', 'mushin', 'festac', 'amuwo',
]);

/**
 * Checks if a user's address input targets an ambiguous street name
 * without specifying an LGA or district container.
 */
export function checkStreetDisambiguation(rawInput: string): DisambiguationResult | null {
  if (!rawInput || rawInput.trim().length < 4) return null;

  const inputLower = rawInput.toLowerCase().trim();
  // Strip leading numbers: "15 Church Street" -> "church street"
  const strippedNumber = inputLower.replace(/^\d+[\s,\/-]+/, '').trim();

  // Check if any known LGA token is already present in the user's input
  const hasLgaSpecified = Array.from(KNOWN_LGA_TOKENS).some((token) => inputLower.includes(token));

  // If user already specified the LGA, no disambiguation needed!
  if (hasLgaSpecified) {
    return null;
  }

  // Check against duplicate registry
  for (const [streetKey, entries] of Object.entries(DUPLICATE_STREET_REGISTRY)) {
    if (strippedNumber.startsWith(streetKey) || inputLower.includes(streetKey)) {
      const options: DisambiguationOption[] = entries.map((entry) => ({
        lga: entry.lga,
        region: entry.region,
        formattedLabel: `${entry.lga} (${entry.region})`,
        augmentedQuery: `${rawInput.trim()}, ${entry.lga}, Lagos`,
      }));

      return {
        isAmbiguous: true,
        detectedStreet: streetKey.toUpperCase(),
        options,
      };
    }
  }

  return null;
}
