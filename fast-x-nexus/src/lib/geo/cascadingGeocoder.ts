/**
 * /src/lib/geo/cascadingGeocoder.ts
 * Fast X Nexus — Intelligent Multi-Tier Open-Source African Geocoding Engine
 *
 * Implements:
 * 1. NLP Landmark & Noise Parsing (Strips 'opposite', 'beside', 'off', etc.)
 * 2. Google Plus Codes (Open Location Code) - Sub-3m rooftop precision
 * 3. What3Words (///word.word.word)
 * 4. Fuzzy Typo-Tolerant Matcher & 900+ Open-Source Lagos Landmark Index
 * 5. Closest-Landmark Snapping (Sub-200m Proximity Snapping)
 * 6. Verified External Geocoders (Photon & Nominatim with False-Positive Rejection)
 * 7. Upstash Redis Cache Layer for sub-10ms repeat queries
 */

import { searchLocalCommunities, NigerianLandmark, NIGERIAN_COMMUNITIES } from './nigerianCommunities';
import { getH3CellFromCoords } from './h3';
import { decodePlusCode, encodePlusCode } from './plusCodes';
import { convertWhat3WordsToCoords } from './what3words';
import { parseNigerianAddress, ParsedAddress } from './nlpLandmarkParser';
import { snapToNearestLandmark, SnappedLandmarkResult } from './closestLandmarkSnapper';
import { getCachedGeocodeResult, cacheGeocodeResult } from '@/lib/cache/redis';
import { verifyLocationPinpoint } from './aiSpatialVerifier';
import { getVerifiedRooftop } from './rooftopLearningCache';
import { normalizeLagosAddress } from './lagosAddressNormalizer';

export interface ResolvedLocation {
  originalInput: string;
  resolvedName: string;
  matchedLevel: 'plus_code' | 'what3words' | 'exact_street' | 'micro_neighborhood' | 'sub_district' | 'lga' | 'city' | 'fallback_state';
  lat: number;
  lng: number;
  h3Cell: string;
  plusCode?: string;
  confidence: number; // 0.0 to 1.0
  specificityScore: number; // 0 to 100
  accuracyRadius: number; // Estimated physical uncertainty radius in meters (e.g. 30m for street, 200m for neighborhood, 1000m for district)
  isEstimatedVicinity: boolean; // True if coordinate represents a surrounding area rather than confirmed pin
  nearestLandmarkNote?: string;
}

/**
 * Strict Nigeria Geographic Boundary Check:
 * Latitude: 4.0° N to 14.0° N
 * Longitude: 2.5° E to 15.0° E
 */
export function isWithinNigeria(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= 4.0 &&
    lat <= 14.0 &&
    lng >= 2.5 &&
    lng <= 15.0
  );
}

/**
 * Verifies if an external geocoder result actually relates to the queried address.
 */
function isRelevantResult(query: string, resultName: string, resultContext?: string): boolean {
  const qTokens = query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length >= 3 && !['street', 'road', 'close', 'ave', 'lagos', 'nigeria', 'state'].includes(t));

  const textToCheck = `${resultName} ${resultContext || ''}`.toLowerCase();
  return qTokens.some((token) => textToCheck.includes(token));
}

/**
 * Master Cascading Resolver with Redis Caching:
 * Evaluates Cache -> NLP Parser -> Plus Codes -> What3Words -> Landmark Index -> Fuzzy Match -> OSM Photon -> Landmark Snapping.
 */
export async function resolveAddressCascading(
  input: string,
  signal?: AbortSignal
): Promise<ResolvedLocation> {
  if (!input || !input.trim()) {
    return {
      originalInput: '',
      resolvedName: 'Lagos Metropolitan Area, Nigeria',
      matchedLevel: 'fallback_state',
      lat: 6.5244,
      lng: 3.3792,
      h3Cell: '8924300aa4bffff',
      confidence: 0.2,
      specificityScore: 10,
      accuracyRadius: 3000,
      isEstimatedVicinity: true,
      nearestLandmarkNote: '⚠️ Please enter an address or drop a pin on the map',
    };
  }

  // 1. Check Redis Cache
  const cached = await getCachedGeocodeResult(input);
  if (cached) {
    return cached;
  }

  // 2. Execute Cascading Resolver
  const result = await resolveAddressCascadingInternal(input, signal);

  // 3. Save to Redis Cache (7 days TTL)
  await cacheGeocodeResult(input, result);

  return result;
}

async function resolveAddressCascadingInternal(
  input: string,
  signal?: AbortSignal
): Promise<ResolvedLocation> {
  // ─── STAGE 0: Proprietary Verified Rooftop Cache ────────────────────────────
  const verifiedRooftop = await getVerifiedRooftop(input);
  if (verifiedRooftop && isWithinNigeria(verifiedRooftop.lat, verifiedRooftop.lng)) {
    return {
      originalInput: input,
      resolvedName: `${verifiedRooftop.address} (Verified Customer Rooftop)`,
      matchedLevel: 'exact_street',
      lat: verifiedRooftop.lat,
      lng: verifiedRooftop.lng,
      h3Cell: verifiedRooftop.h3Cell,
      confidence: 1.0,
      specificityScore: 100,
      accuracyRadius: 15,
      isEstimatedVicinity: false,
      nearestLandmarkNote: '📍 Verified Rooftop: Confirmed customer pinpoint',
    };
  }

  // ─── STAGE 0B: NLP Parsing & Noise Normalization ────────────────────────────
  const nlp = parseNigerianAddress(input);

  // ─── STAGE 1: Google Plus Codes Check (Score: 100) ──────────────────────────
  const plusMatch = decodePlusCode(input) || decodePlusCode(nlp.cleaned);
  if (plusMatch && isWithinNigeria(plusMatch.lat, plusMatch.lng)) {
    const h3Cell = getH3CellFromCoords(plusMatch.lat, plusMatch.lng, 9);
    const snap = snapToNearestLandmark(plusMatch.lat, plusMatch.lng, NIGERIAN_COMMUNITIES, 1000);

    return {
      originalInput: input,
      resolvedName: `Plus Code: ${plusMatch.code} (Exact Rooftop)`,
      matchedLevel: 'plus_code',
      lat: plusMatch.lat,
      lng: plusMatch.lng,
      h3Cell,
      plusCode: plusMatch.code,
      confidence: 1.0,
      specificityScore: 100,
      accuracyRadius: 15,
      isEstimatedVicinity: false,
      nearestLandmarkNote: snap?.formattedSnapNote,
    };
  }

  // ─── STAGE 2: What3Words Check (Score: 95) ──────────────────────────────────
  try {
    const w3wMatch = await convertWhat3WordsToCoords(input, undefined, signal);
    if (w3wMatch && isWithinNigeria(w3wMatch.lat, w3wMatch.lng)) {
      const h3Cell = getH3CellFromCoords(w3wMatch.lat, w3wMatch.lng, 9);
      const snap = snapToNearestLandmark(w3wMatch.lat, w3wMatch.lng, NIGERIAN_COMMUNITIES, 1000);

      return {
        originalInput: input,
        resolvedName: `${w3wMatch.words} (${w3wMatch.nearestPlace || 'Nigeria'})`,
        matchedLevel: 'what3words',
        lat: w3wMatch.lat,
        lng: w3wMatch.lng,
        h3Cell,
        plusCode: encodePlusCode(w3wMatch.lat, w3wMatch.lng),
        confidence: 0.98,
        specificityScore: 95,
        accuracyRadius: 15,
        isEstimatedVicinity: false,
        nearestLandmarkNote: snap?.formattedSnapNote,
      };
    }
  } catch {
    // Graceful continuation
  }

  // Helper to generate normalized OpenStreetMap queries
  const osmVariants = generateOsmQueryVariants(input, nlp);

  // ─── STAGE 3: Authoritative OpenStreetMap Road Network First (Surveyed Ways) ─
  for (const q of osmVariants) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&countrycodes=ng&viewbox=3.0,6.7,3.9,6.3&bounded=1&limit=3&addressdetails=1`;

      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'FastXLogistics/2.0 (operations@fastx.ng)' },
        signal,
      });

      if (nomRes.ok) {
        const data = await nomRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const top = data[0];
          const lat = parseFloat(top.lat);
          const lng = parseFloat(top.lon);

          if (isWithinNigeria(lat, lng)) {
            const placeRank = typeof top.place_rank === 'number' ? top.place_rank : 26;
            const addressType = (top.addresstype || top.type || '').toLowerCase();
            const topClass = (top.class || '').toLowerCase();

            // Strict payload inspection: distinction between exact building, surveyed road, and coarse fallback
            const isBuilding = placeRank >= 30 || ['building', 'house', 'commercial'].includes(addressType);
            const isRoad = placeRank >= 26 && ['highway', 'road', 'residential', 'tertiary', 'primary', 'secondary', 'street', 'pedestrian', 'living_street'].includes(addressType || topClass);
            const isSuburbOrQuarter = ['suburb', 'quarter', 'neighbourhood', 'city_district'].includes(addressType);

            let matchedLevel: ResolvedLocation['matchedLevel'] = 'micro_neighborhood';
            let confidence = 0.85;
            let specificityScore = 80;
            let accuracyRadius = 200;
            let isEstimatedVicinity = true;

            if (isBuilding) {
              matchedLevel = 'exact_street';
              confidence = 0.98;
              specificityScore = 100;
              accuracyRadius = 20;
              isEstimatedVicinity = false;
            } else if (isRoad) {
              matchedLevel = 'exact_street';
              confidence = 0.95;
              specificityScore = 92;
              accuracyRadius = 40;
              isEstimatedVicinity = false;
            } else if (isSuburbOrQuarter) {
              matchedLevel = 'micro_neighborhood';
              confidence = 0.72;
              specificityScore = 65;
              accuracyRadius = 280;
              isEstimatedVicinity = true;
            } else {
              matchedLevel = 'sub_district';
              confidence = 0.50;
              specificityScore = 45;
              accuracyRadius = 800;
              isEstimatedVicinity = true;
            }

            const prelim: ResolvedLocation = {
              originalInput: input,
              resolvedName: top.display_name || `${top.name}, Lagos, Nigeria`,
              matchedLevel,
              lat,
              lng,
              h3Cell: getH3CellFromCoords(lat, lng, 9),
              plusCode: encodePlusCode(lat, lng),
              confidence,
              specificityScore,
              accuracyRadius,
              isEstimatedVicinity,
              nearestLandmarkNote: !isEstimatedVicinity
                ? `📍 Verified Road Node: ${top.name || 'Surveyed Street'}`
                : `⚠️ Area Match: ${top.name || 'Quarter / Suburb'} (Surveyed building not indexed. Refine pin if needed)`,
            };

            const audit = await verifyLocationPinpoint(input, prelim);
            if (audit.verdict !== 'MISMATCH_REJECTED') {
              return {
                ...prelim,
                confidence: audit.confidence,
                accuracyRadius: audit.accuracyRadiusMeters,
                isEstimatedVicinity: audit.verdict === 'VICINITY_RADAR_REQUIRED' || isEstimatedVicinity,
              };
            }
          }
        }
      }
    } catch {
      // Graceful fallback to local dictionary
    }
  }

  // ─── STAGE 4: Curated Local Communities & Informal Nigerian Corridors ───────
  // For unmapped or rural streets (e.g. Tayo Wuraola St, Selewu, Baiyeku, informal estates)
  const normalizedCandidate = normalizeLagosAddress(input);
  for (const candidateQuery of [normalizedCandidate, input, nlp.cleaned, nlp.extractedStreet].filter(Boolean) as string[]) {
    const directMatches = searchLocalCommunities(candidateQuery);
    if (directMatches.length > 0) {
      const match = directMatches[0];

      // Only accept if it matched with high confidence (specificity <= 2 and name/alias match)
      if (match.specificity <= 2) {
        const h3Cell = getH3CellFromCoords(match.lat, match.lng, 9);
        const snap = snapToNearestLandmark(match.lat, match.lng, NIGERIAN_COMMUNITIES, 1200);

        const prelim: ResolvedLocation = {
          originalInput: input,
          resolvedName: `${match.name} (${match.subDistrict}), ${match.lga}, ${match.state}`,
          matchedLevel: match.specificity === 1 ? 'exact_street' : 'micro_neighborhood',
          lat: match.lat,
          lng: match.lng,
          h3Cell,
          plusCode: encodePlusCode(match.lat, match.lng),
          confidence: match.specificity === 1 ? 0.94 : 0.88,
          specificityScore: match.specificity === 1 ? 92 : 82,
          accuracyRadius: match.specificity === 1 ? 60 : 180,
          isEstimatedVicinity: true,
          nearestLandmarkNote: snap?.formattedSnapNote,
        };

        const audit = await verifyLocationPinpoint(input, prelim);
        if (audit.verdict !== 'MISMATCH_REJECTED') {
          return {
            ...prelim,
            confidence: audit.confidence,
            accuracyRadius: audit.accuracyRadiusMeters,
            isEstimatedVicinity: audit.verdict === 'VICINITY_RADAR_REQUIRED',
          };
        }
      }
    }
  }

  // ─── STAGE 5: NLP Primary Landmark Match ────────────────────────────────────
  if (nlp.primaryLandmark) {
    const landmarkMatches = searchLocalCommunities(nlp.primaryLandmark);
    if (landmarkMatches.length > 0) {
      const lm = landmarkMatches[0];
      const h3Cell = getH3CellFromCoords(lm.lat, lm.lng, 9);

      const prelim: ResolvedLocation = {
        originalInput: input,
        resolvedName: `${lm.name} (${lm.subDistrict}), ${lm.lga}, ${lm.state}`,
        matchedLevel: lm.specificity === 1 ? 'exact_street' : 'micro_neighborhood',
        lat: lm.lat,
        lng: lm.lng,
        h3Cell,
        plusCode: encodePlusCode(lm.lat, lm.lng),
        confidence: 0.90,
        specificityScore: 85,
        accuracyRadius: lm.specificity === 1 ? 50 : 200,
        isEstimatedVicinity: true,
        nearestLandmarkNote: `📍 Landmark: ${lm.name}`,
      };

      const audit = await verifyLocationPinpoint(input, prelim);
      if (audit.verdict !== 'MISMATCH_REJECTED') {
        return prelim;
      }
    }
  }

  // ─── STAGE 6: Sector / LGA Target Safe Centroid with Radar Ring ─────────────
  // If no road or landmark was identified, extract the sector/LGA and center on it
  const broadContainers: Record<string, { lat: number; lng: number; name: string }> = {
    'lagos island': { lat: 6.4550, lng: 3.3950, name: 'Lagos Island Central' },
    'island': { lat: 6.4550, lng: 3.3950, name: 'Lagos Island Central' },
    'victoria island': { lat: 6.4300, lng: 3.4260, name: 'Victoria Island Central' },
    'vi': { lat: 6.4300, lng: 3.4260, name: 'Victoria Island Central' },
    'ikoyi': { lat: 6.4500, lng: 3.4350, name: 'Ikoyi Central' },
    'lekki': { lat: 6.4478, lng: 3.4741, name: 'Lekki Phase 1 Corridor' },
    'eti-osa': { lat: 6.4478, lng: 3.4741, name: 'Eti-Osa / Lekki Corridor' },
    'ajah': { lat: 6.4650, lng: 3.5650, name: 'Ajah Corridor' },
    'ikeja': { lat: 6.5960, lng: 3.3430, name: 'Ikeja Central Corridor' },
    'maryland': { lat: 6.5750, lng: 3.3650, name: 'Maryland Corridor' },
    'ikorodu': { lat: 6.6000, lng: 3.5100, name: 'Ikorodu Central Corridor' },
    'igbogbo': { lat: 6.5650, lng: 3.5150, name: 'Igbogbo / Ikorodu South Corridor' },
    'surulere': { lat: 6.4950, lng: 3.3550, name: 'Surulere Central Corridor' },
    'yaba': { lat: 6.5150, lng: 3.3750, name: 'Yaba Central Corridor' },
    'mainland': { lat: 6.5050, lng: 3.3750, name: 'Lagos Mainland Corridor' },
    'alimosho': { lat: 6.6050, lng: 3.2700, name: 'Alimosho Corridor' },
    'egbeda': { lat: 6.5950, lng: 3.2850, name: 'Egbeda Corridor' },
    'iyana ipaja': { lat: 6.6150, lng: 3.2850, name: 'Iyana Ipaja Corridor' },
    'kosofe': { lat: 6.5800, lng: 3.3900, name: 'Kosofe / Ketu Corridor' },
    'ketu': { lat: 6.5950, lng: 3.3850, name: 'Ketu Corridor' },
    'ojota': { lat: 6.5750, lng: 3.3750, name: 'Ojota Corridor' },
    'magodo': { lat: 6.6150, lng: 3.3850, name: 'Magodo GRA Corridor' },
    'oshodi': { lat: 6.5350, lng: 3.3450, name: 'Oshodi Central' },
    'isolo': { lat: 6.5250, lng: 3.3250, name: 'Isolo Corridor' },
    'apapa': { lat: 6.4450, lng: 3.3550, name: 'Apapa Port Corridor' },
    'amuwo': { lat: 6.4650, lng: 3.2850, name: 'Amuwo-Odofin Corridor' },
    'banana island': { lat: 6.4600, lng: 3.4450, name: 'Banana Island, Ikoyi' },
    'computer village': { lat: 6.5980, lng: 3.3410, name: 'Computer Village, Ikeja' },
    'alausa': { lat: 6.6180, lng: 3.3580, name: 'Alausa Secretariat, Ikeja' },
    'isaac john': { lat: 6.5870, lng: 3.3600, name: 'Isaac John GRA, Ikeja' },
    'ebute metta': { lat: 6.4850, lng: 3.3850, name: 'Ebute Metta, Lagos Mainland' },
    'sangotedo': { lat: 6.4750, lng: 3.6300, name: 'Sangotedo, Eti-Osa' },
    'oral estate': { lat: 6.4370, lng: 3.5420, name: 'Oral Estate, Lekki' },
    'oreyo junction': { lat: 6.5700, lng: 3.5180, name: 'Oreyo Junction, Igbogbo' },
    'oreyo': { lat: 6.5700, lng: 3.5180, name: 'Oreyo Junction, Igbogbo' },
    'ayobo road': { lat: 6.6050, lng: 3.2500, name: 'Ayobo Road Corridor, Alimosho' },
    'ayobo': { lat: 6.6050, lng: 3.2500, name: 'Ayobo Corridor, Alimosho' },
    'abule egba junction': { lat: 6.6450, lng: 3.3050, name: 'Abule Egba Junction, Alimosho' },
    'abule egba': { lat: 6.6450, lng: 3.3050, name: 'Abule Egba Corridor, Alimosho' },
    'awoyaya': { lat: 6.4700, lng: 3.7050, name: 'Awoyaya, Ibeju-Lekki' },
    'mile 2': { lat: 6.4650, lng: 3.3150, name: 'Mile 2, Amuwo-Odofin' },
    'festac': { lat: 6.4680, lng: 3.2850, name: 'Festac Town Corridor' },
    'ojo': { lat: 6.4650, lng: 3.1950, name: 'Ojo Central Corridor' },
    'badagry': { lat: 6.4250, lng: 2.8850, name: 'Badagry Historic Corridor' },
    'ibeju-lekki': { lat: 6.4850, lng: 3.7550, name: 'Ibeju-Lekki Coastal Corridor' },
    'ibeju': { lat: 6.4850, lng: 3.7550, name: 'Ibeju-Lekki Coastal Corridor' },
    'epe': { lat: 6.5850, lng: 3.9850, name: 'Epe Division Corridor' },
  };

  const inputLower = input.toLowerCase();
  // Sort entries so longer, more specific phrases match before broad containers
  const sortedContainers = Object.entries(broadContainers).sort((a, b) => b[0].length - a[0].length);

  for (const [key, sector] of sortedContainers) {
    const keyRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (keyRegex.test(inputLower)) {
      return {
        originalInput: input,
        resolvedName: `${sector.name}, Lagos, Nigeria`,
        matchedLevel: 'sub_district',
        lat: sector.lat,
        lng: sector.lng,
        h3Cell: getH3CellFromCoords(sector.lat, sector.lng, 9),
        plusCode: encodePlusCode(sector.lat, sector.lng),
        confidence: 0.65,
        specificityScore: 50,
        accuracyRadius: 800,
        isEstimatedVicinity: true,
        nearestLandmarkNote: `⚠️ Detected Vicinity Area: ${sector.name} (Please fine-tune pin on map)`,
      };
    }
  }

  // ─── STAGE 7: Metropolitan Safe Default ─────────────────────────────────────
  return {
    originalInput: input,
    resolvedName: 'Lagos Metropolitan Area, Nigeria',
    matchedLevel: 'fallback_state',
    lat: 6.5244,
    lng: 3.3792,
    h3Cell: '8924300aa4bffff',
    plusCode: '6FR5CG9V+MQ',
    confidence: 0.25,
    specificityScore: 15,
    accuracyRadius: 3000,
    isEstimatedVicinity: true,
    nearestLandmarkNote: '⚠️ Estimated Vicinity: General Lagos Corridor (Refine Pin on Map)',
  };
}

/**
 * Generates clean search variants for OpenStreetMap Nominatim
 */
function generateOsmQueryVariants(raw: string, nlp: ParsedAddress): string[] {
  const variants: string[] = [];
  const clean = raw.trim();
  const normalized = normalizeLagosAddress(raw);

  // 1. Normalized query (e.g. "2 Abibuoko Street" -> "2 Abibu Oki Street, Lagos Island, Lagos, Nigeria")
  if (normalized !== clean) {
    if (!normalized.toLowerCase().includes('lagos')) {
      variants.push(`${normalized}, Lagos, Nigeria`);
    } else {
      variants.push(normalized);
    }
    const strippedNorm = normalized.replace(/^\d+[\s,\/-]+/, '').trim();
    if (strippedNorm && strippedNorm !== normalized) {
      variants.push(`${strippedNorm}, Lagos, Nigeria`);
    }
  }

  // 2. Raw query with Lagos, Nigeria
  if (!clean.toLowerCase().includes('lagos')) {
    variants.push(`${clean}, Lagos, Nigeria`);
  } else {
    variants.push(clean);
  }

  // 3. Stripped house number (e.g. "34 Adeniji Adele Road" -> "Adeniji Adele Road Lagos Island")
  const strippedNumber = clean.replace(/^\d+[\s,\/-]+/, '').trim();
  if (strippedNumber && strippedNumber !== clean) {
    if (!strippedNumber.toLowerCase().includes('lagos')) {
      variants.push(`${strippedNumber}, Lagos, Nigeria`);
    } else {
      variants.push(strippedNumber);
    }
  }

  // 4. Extracted street with LGA
  if (nlp.extractedStreet) {
    const street = normalizeLagosAddress(nlp.extractedStreet).replace(/^\d+[\s,\/-]+/, '').trim();
    if (nlp.extractedLga) {
      variants.push(`${street}, ${nlp.extractedLga}, Lagos, Nigeria`);
    } else {
      variants.push(`${street}, Lagos, Nigeria`);
    }
  }

  // 4. Strip informal acronyms like "GRA", "off", "estate"
  const strippedAcronyms = strippedNumber
    .replace(/\bGRA\b/gi, '')
    .replace(/\bEstate\b/gi, '')
    .replace(/\bOpposite\b/gi, '')
    .replace(/\bBeside\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (strippedAcronyms && !variants.includes(strippedAcronyms)) {
    variants.push(`${strippedAcronyms}, Lagos, Nigeria`);
  }

  return Array.from(new Set(variants.filter((v) => v.length >= 4)));
}
