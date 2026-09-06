/**
 * /src/lib/geo/lagosAddressNormalizer.ts
 * Fast X Nexus — Intelligent Lagos Street & Compound Word Normalizer
 *
 * Handles:
 * 1. Stuck / Concatenated compound words (e.g. Abibuoko -> Abibu Oki, Bodethomas -> Bode Thomas)
 * 2. Standard Nigerian and British street abbreviations (st -> Street, rd -> Road, bstop -> Bus Stop)
 * 3. Hyphenated and phonetic variations common in Lagos transit and logistics
 */

// Common concatenated Nigerian / Lagos street names and landmarks
const CONCATENATED_LAGOS_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Lagos Island & Marina
  { pattern: /\b(abibuoko|abibuoki|abibu-oki|habibuoki|habibu-oki)\b/gi, replacement: 'Abibu Oki' },
  { pattern: /\b(broadstreet|broad-street)\b/gi, replacement: 'Broad Street' },
  { pattern: /\b(adenijiadele|adeniji-adele)\b/gi, replacement: 'Adeniji Adele' },
  { pattern: /\b(nnamdiazikiwe|nnamdi-azikiwe)\b/gi, replacement: 'Nnamdi Azikiwe' },
  { pattern: /\b(idumotamarket|idumota-market)\b/gi, replacement: 'Idumota Market' },

  // Surulere & Yaba
  { pattern: /\b(bodethomas|bode-thomas)\b/gi, replacement: 'Bode Thomas' },
  { pattern: /\b(ogunlanadrive|ogunlana-drive)\b/gi, replacement: 'Ogunlana Drive' },
  { pattern: /\b(adelabustreet|adelabu-street)\b/gi, replacement: 'Adelabu Street' },
  { pattern: /\b(herbertmacaulay|herbert-macaulay)\b/gi, replacement: 'Herbert Macaulay' },
  { pattern: /\b(commercialavenue|commercial-avenue)\b/gi, replacement: 'Commercial Avenue' },
  { pattern: /\b(tejuoshomarket|tejuosho-market)\b/gi, replacement: 'Tejuosho Market' },
  { pattern: /\b(obutemetter|ebutemetta|ebute-metta)\b/gi, replacement: 'Ebute Metta' },

  // Ikeja Central
  { pattern: /\b(allenavenue|allen-avenue)\b/gi, replacement: 'Allen Avenue' },
  { pattern: /\b(toyinstreet|toyin-street|totinystreet)\b/gi, replacement: 'Toyin Street' },
  { pattern: /\b(isaacjohn|isaac-john)\b/gi, replacement: 'Isaac John' },
  { pattern: /\b(joelogunnaike|joel-ogunnaike)\b/gi, replacement: 'Joel Ogunnaike' },
  { pattern: /\b(alausasecretariat|alausa-secretariat)\b/gi, replacement: 'Alausa Secretariat' },
  { pattern: /\b(computervillage|computer-village)\b/gi, replacement: 'Computer Village' },
  { pattern: /\b(mobolajibankanthony|mobolaji-bank-anthony|bankanthony|bank-anthony)\b/gi, replacement: 'Mobolaji Bank Anthony' },
  { pattern: /\b(kudiratabiola|kudirat-abiola)\b/gi, replacement: 'Kudirat Abiola' },
  { pattern: /\b(obafemiawolowo|obafemi-awolowo|awoloworoad|awolowo-road)\b/gi, replacement: 'Obafemi Awolowo' },

  // Eti-Osa & Lekki
  { pattern: /\b(admiraltyway|admiralty-way)\b/gi, replacement: 'Admiralty Way' },
  { pattern: /\b(adetokunboademola|adetokunbo-ademola)\b/gi, replacement: 'Adetokunbo Ademola' },
  { pattern: /\b(ahmadubello|ahmadu-bello)\b/gi, replacement: 'Ahmadu Bello' },
  { pattern: /\b(bananaisland|banana-island)\b/gi, replacement: 'Banana Island' },
  { pattern: /\b(victoriaisland|victoria-island)\b/gi, replacement: 'Victoria Island' },
  { pattern: /\b(chevrondrive|chevron-drive)\b/gi, replacement: 'Chevron Drive' },
  { pattern: /\b(oralestate|oral-estate)\b/gi, replacement: 'Oral Estate' },
  { pattern: /\b(osapalondon|osapa-london)\b/gi, replacement: 'Osapa London' },
  { pattern: /\b(monasteryroad|monastery-road)\b/gi, replacement: 'Monastery Road' },

  // Mainland & Suburbs
  { pattern: /\b(ayoboroad|ayobo-road)\b/gi, replacement: 'Ayobo Road' },
  { pattern: /\b(abuleegba|abule-egba)\b/gi, replacement: 'Abule Egba' },
  { pattern: /\b(iyanaipaja|iyana-ipaja)\b/gi, replacement: 'Iyana Ipaja' },
  { pattern: /\b(dopemuunderbridge|dopemu-underbridge)\b/gi, replacement: 'Dopemu Underbridge' },
  { pattern: /\b(ojuelegbaunderbridge|ojuelegba-underbridge)\b/gi, replacement: 'Ojuelegba Underbridge' },
  { pattern: /\b(wharfroad|wharf-road)\b/gi, replacement: 'Wharf Road' },
  { pattern: /\b(alabamarket|alaba-market|alabainternational|alaba-international)\b/gi, replacement: 'Alaba International Market' },
  { pattern: /\b(badagryroundabout|badagry-roundabout)\b/gi, replacement: 'Badagry Roundabout' },
  { pattern: /\b(awoyayabusstop|awoyaya-busstop)\b/gi, replacement: 'Awoyaya Bus Stop' },
  { pattern: /\b(epemarina|epe-marina)\b/gi, replacement: 'Epe Marina' },
  { pattern: /\b(wuraolastreet|wuraola-street)\b/gi, replacement: 'Wuraola Street' },
  { pattern: /\b(baiyekuroad|baiyeku-road)\b/gi, replacement: 'Baiyeku Road' },
  { pattern: /\b(oreyojunction|oreyo-junction)\b/gi, replacement: 'Oreyo Junction' },
  { pattern: /\b(laspotechmaingate|laspotech-gate)\b/gi, replacement: 'Laspotech Main Gate' },
  { pattern: /\b(agricbusstop|agric-busstop)\b/gi, replacement: 'Agric Bus Stop' },
];

// Street type and transit node suffix normalizers
const SUFFIX_NORMALIZERS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(b\/stop|bstop|b\.stop|busstop)\b/gi, replacement: 'Bus Stop' },
  { pattern: /\b(r\/about|rndabt|round-about)\b/gi, replacement: 'Roundabout' },
  { pattern: /\b(junc\.|junc|jxn|jct)\b/gi, replacement: 'Junction' },
  { pattern: /\b(exp\.|exp|expwy|expy)\b/gi, replacement: 'Expressway' },
  { pattern: /\b(st\.|str\.|str|st)\b/gi, replacement: 'Street' },
  { pattern: /\b(rd\.|rd)\b/gi, replacement: 'Road' },
  { pattern: /\b(ave\.|av\.|av|ave)\b/gi, replacement: 'Avenue' },
  { pattern: /\b(cres\.|cr\.|cr|cres)\b/gi, replacement: 'Crescent' },
  { pattern: /\b(cl\.|cl)\b/gi, replacement: 'Close' },
  { pattern: /\b(ext\.|ext)\b/gi, replacement: 'Extension' },
  { pattern: /\b(est\.|est)\b/gi, replacement: 'Estate' },
  { pattern: /,\s*v\/?i\b/gi, replacement: ', Victoria Island' },
  { pattern: /\bv\/?i,\s*lagos\b/gi, replacement: 'Victoria Island, Lagos' },
];

/**
 * Normalizes input address string:
 * - Splits concatenated compound words
 * - Normalizes transit abbreviations
 * - Standardizes punctuation and spacing
 */
export function normalizeLagosAddress(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let normalized = raw.trim();

  // 1. Split stuck compound words
  for (const { pattern, replacement } of CONCATENATED_LAGOS_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // 2. Expand common abbreviations
  for (const { pattern, replacement } of SUFFIX_NORMALIZERS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // 3. Clean multiple spaces and dangling commas
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*,+/g, ',')
    .trim();

  return normalized;
}
