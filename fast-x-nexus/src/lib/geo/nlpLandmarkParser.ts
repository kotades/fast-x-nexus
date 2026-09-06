/**
 * /src/lib/geo/nlpLandmarkParser.ts
 * Fast X Nexus — Intelligent Natural Language Landmark & Address Parser
 *
 * Specializes in unstructured colloquial Nigerian & African addresses:
 * 1. Strips directional noise ("opposite", "beside", "off", "after", "near", "behind").
 * 2. Isolates street numbers and building identifiers ("No 4b,", "Shop 14,", "Plot 24,").
 * 3. Extracts primary transit and spatial anchors (Bus stops, Estate gates, Junctions, Plazas).
 * 4. Yields structured search tokens prioritized by geographical specificity.
 */

export interface ParsedAddress {
  raw: string;
  cleaned: string;
  primaryLandmark?: string;
  extractedStreet?: string;
  extractedDistrict?: string;
  extractedLga?: string;
  tokens: string[];
  cleanTokens: string[];
}

const DIRECTIONAL_PREPOSITIONS = [
  'opposite',
  'opp',
  'opp.',
  'beside',
  'behind',
  'in front of',
  'next to',
  'close to',
  'near',
  'after',
  'before',
  'around',
  'off',
  'inside',
  'facing',
  'adjacent to',
  'along',
  'towards',
];

const UNIT_PREFIX_REGEX =
  /^(no\.?\s*\d+[a-zA-Z]?|#\s*\d+|\d+[a-zA-Z]?\s*,?|flat\s*[a-zA-Z0-9]+|shop\s*[a-zA-Z0-9]+|plot\s*[a-zA-Z0-9]+|block\s*[a-zA-Z0-9]+|suite\s*[a-zA-Z0-9]+|km\s*\d+)\s*,?\s*/i;

const LANDMARK_INDICATORS = [
  'bus stop',
  'bus-stop',
  'b/stop',
  'bstop',
  'junction',
  'junc',
  'roundabout',
  'estate',
  'gate',
  'market',
  'mall',
  'plaza',
  'filling station',
  'petrol station',
  'fuel station',
  'hospital',
  'church',
  'mosque',
  'school',
  'bank',
  'hotel',
  'expressway',
  'express',
  'bridge',
  'flyover',
  'terminal',
];

const KNOWN_LAGOS_LGAS = [
  'ikorodu',
  'ikeja',
  'isolo',
  'oshodi',
  'lekki',
  'eti-osa',
  'eti osa',
  'surulere',
  'yaba',
  'mainland',
  'lagos island',
  'victoria island',
  'ikoyi',
  'alimosho',
  'agege',
  'kosofe',
  'somolu',
  'amuwo-odofin',
  'amuwo odofin',
  'festac',
  'badagry',
  'epe',
  'ibeju-lekki',
  'ibeju lekki',
  'mushin',
  'apapa',
  'ifako-ijaiye',
  'ifako ijaiye',
  'ojoo',
  'ojo',
];

/**
 * Normalizes colloquial address syntax and extracts semantic components.
 */
export function parseNigerianAddress(raw: string): ParsedAddress {
  if (!raw || !raw.trim()) {
    return {
      raw: '',
      cleaned: '',
      tokens: [],
      cleanTokens: [],
    };
  }

  const normalized = raw
    .replace(/[^\w\s,/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Extract Unit/House prefix
  let withoutUnit = normalized.replace(UNIT_PREFIX_REGEX, '').trim();

  // 2. Identify Landmark Segments (e.g. "Opposite Zenith Bank", "Off Oreyo Bus stop")
  let primaryLandmark: string | undefined;
  const segments = normalized.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const lowerSeg = seg.toLowerCase();
    
    // Check if segment has directional preposition or landmark indicator
    const hasPrep = DIRECTIONAL_PREPOSITIONS.some((p) => lowerSeg.startsWith(`${p} `) || lowerSeg.includes(` ${p} `));
    const hasIndicator = LANDMARK_INDICATORS.some((ind) => lowerSeg.includes(ind));

    if (hasPrep || hasIndicator) {
      let cleanLandmark = seg;
      for (const prep of DIRECTIONAL_PREPOSITIONS) {
        cleanLandmark = cleanLandmark.replace(new RegExp(`^${prep}\\s+`, 'i'), '').trim();
      }
      primaryLandmark = cleanLandmark;
      break;
    }
  }

  // 3. Extract Street Name
  let extractedStreet: string | undefined;
  for (const seg of segments) {
    const lowerSeg = seg.toLowerCase();
    if (
      (lowerSeg.includes('street') || lowerSeg.includes(' st') || lowerSeg.includes('road') || lowerSeg.includes(' rd') || lowerSeg.includes('close') || lowerSeg.includes(' cl') || lowerSeg.includes('avenue') || lowerSeg.includes(' ave') || lowerSeg.includes('way') || lowerSeg.includes('crescent')) &&
      !lowerSeg.includes('bus stop') &&
      !lowerSeg.includes('junction')
    ) {
      extractedStreet = seg.replace(UNIT_PREFIX_REGEX, '').trim();
      break;
    }
  }

  // 4. Extract LGA / District
  let extractedLga: string | undefined;
  let extractedDistrict: string | undefined;

  for (const seg of segments) {
    const lowerSeg = seg.toLowerCase().trim();
    for (const lga of KNOWN_LAGOS_LGAS) {
      if (lowerSeg.includes(lga)) {
        extractedLga = lga.toUpperCase();
        break;
      }
    }
  }

  // 5. Generate clean search tokens
  const cleanTokens: string[] = [];
  
  if (primaryLandmark) cleanTokens.push(primaryLandmark);
  if (extractedStreet) cleanTokens.push(extractedStreet);

  for (const seg of segments) {
    let clean = seg.replace(UNIT_PREFIX_REGEX, '').trim();
    for (const prep of DIRECTIONAL_PREPOSITIONS) {
      clean = clean.replace(new RegExp(`^${prep}\\s+`, 'i'), '').trim();
    }
    if (clean.length >= 3 && !cleanTokens.includes(clean)) {
      cleanTokens.push(clean);
    }
  }

  // Word-level tokens (excluding common stop words)
  const stopWords = new Set(['and', 'the', 'street', 'road', 'close', 'avenue', 'lagos', 'state', 'nigeria', 'state,', 'lagos,']);
  const words = withoutUnit
    .split(/[\s,/-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()));

  // 2-grams
  for (let i = 0; i < words.length - 1; i++) {
    const bi = `${words[i]} ${words[i + 1]}`;
    if (!cleanTokens.includes(bi)) {
      cleanTokens.push(bi);
    }
  }

  // Add individual words
  for (const w of words) {
    if (!cleanTokens.includes(w)) {
      cleanTokens.push(w);
    }
  }

  return {
    raw,
    cleaned: withoutUnit,
    primaryLandmark,
    extractedStreet,
    extractedDistrict,
    extractedLga,
    tokens: segments,
    cleanTokens,
  };
}
