import lagosData from './data/lagosLandmarksData.json';
import { calculateFuzzyScore } from './fuzzyGeoMatcher';

export interface NigerianLandmark {
  name: string;
  subDistrict: string;
  lga: string;
  state: string;
  lat: number;
  lng: number;
  specificity: number; // 1 = Street/Junction, 2 = Micro-neighborhood, 3 = Sub-district, 4 = LGA, 5 = City
  aliases: string[];
  category?: 'transit' | 'junction' | 'estate' | 'commercial' | 'poi' | 'general';
}

const CORE_COMMUNITIES: NigerianLandmark[] = [
  // ─── IKORODU DIVISION (PRECISION STREETS & NEIGHBORHOODS) ───────────────────
  {
    name: 'Adeshina Balogun Street',
    subDistrict: 'Oreyo / Igbogbo',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.58903,
    lng: 3.52852,
    specificity: 1,
    aliases: ['adeshina balogun', 'adeshina balogun street', '4b adeshina balogun', 'adeshina balogun oreyo', 'lukmon saba', 'alighoda'],
  },
  {
    name: 'Oreyo Junction / Bus Stop',
    subDistrict: 'Igbogbo/Bayeku',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5888,
    lng: 3.5275,
    specificity: 2,
    aliases: ['oreyo', 'oreyo junction', 'oreyo bus stop', 'oreyo igbogbo', 'oreyo ikorodu', 'oreyo landmark'],
  },
  {
    name: 'Igbogbo',
    subDistrict: 'Igbogbo Central',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5688,
    lng: 3.5181,
    specificity: 3,
    aliases: ['igbogbo', 'igbogbo ikorodu', 'igbogbo bayeku', 'igbogbo central', 'igbogbo stadium'],
  },
  {
    name: 'Bayeku',
    subDistrict: 'Bayeku Waterfront',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5492,
    lng: 3.5412,
    specificity: 2,
    aliases: ['bayeku', 'baiyeku', 'bayeku ikorodu'],
  },
  {
    name: 'Offin / Oreta',
    subDistrict: 'Offin Waterfront',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5512,
    lng: 3.5023,
    specificity: 2,
    aliases: ['offin', 'oreta', 'offin igbogbo'],
  },
  {
    name: 'Agric / Asolo',
    subDistrict: 'Agric Bus Stop',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6025,
    lng: 3.4839,
    specificity: 2,
    aliases: ['agric', 'agric ikorodu', 'asolo', 'isawo', 'owutu'],
  },
  {
    name: 'Benson / Garage',
    subDistrict: 'Ikorodu Garage',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6167,
    lng: 3.5078,
    specificity: 2,
    aliases: ['benson', 'ikorodu garage', 'benson bus stop', 'sabo ikorodu'],
  },
  {
    name: 'Itamaga / Elepe',
    subDistrict: 'Itamaga Junction',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6312,
    lng: 3.5345,
    specificity: 2,
    aliases: ['itamaga', 'elepe', 'itamaga ikorodu', 'elepe bus stop', 'eyita'],
  },
  {
    name: 'Ogolonto / Majidun',
    subDistrict: 'Majidun',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5983,
    lng: 3.4619,
    specificity: 2,
    aliases: ['ogolonto', 'majidun', 'ogolonto ikorodu'],
  },
  {
    name: 'Ebute / Ipakodo',
    subDistrict: 'Ipakodo Ferry Terminal',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5833,
    lng: 3.4833,
    specificity: 2,
    aliases: ['ebute', 'ipakodo', 'ebute ikorodu', 'ipakodo ferry'],
  },
  {
    name: 'Odogunyan / Laspotech',
    subDistrict: 'Industrial Zone',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6622,
    lng: 3.5194,
    specificity: 2,
    aliases: ['odogunyan', 'laspotech', 'odogunyan industrial', 'first gate laspotech'],
  },
  {
    name: 'Maya / Adamo / Imota',
    subDistrict: 'Imota / Adamo',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6789,
    lng: 3.5823,
    specificity: 3,
    aliases: ['maya', 'adamo', 'imota', 'agbowa', 'maya ikorodu'],
  },
  {
    name: 'Tayo Wuraola Street (Selewu / Igbogbo)',
    subDistrict: 'Selewu / Baiyeku Road',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5854,
    lng: 3.5310,
    specificity: 1,
    aliases: ['tayo wuraola street', 'wuraola street', 'wuraola', '4 wuraola street', 'wuraola street selewu', 'tayo wuraola'],
  },
  {
    name: 'Selewu Junction / Road (Igbogbo)',
    subDistrict: 'Selewu',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5840,
    lng: 3.5292,
    specificity: 2,
    aliases: ['selewu', 'selewu road', 'selewu junction', 'selewu igbogbo', 'selewu bus stop'],
  },
  {
    name: 'Igbogbo Central / Oba Palace',
    subDistrict: 'Igbogbo Town',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5705,
    lng: 3.5186,
    specificity: 2,
    aliases: ['igbogbo', 'igbogbo central', 'igbogbo town', 'igbogbo bayeku', 'igbogbo ikorodu'],
  },
  {
    name: 'Baiyeku Road / Jetty',
    subDistrict: 'Baiyeku',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5680,
    lng: 3.5410,
    specificity: 2,
    aliases: ['baiyeku', 'bayeku', 'baiyeku road', 'baiyeku jetty', 'bayeku road'],
  },
  {
    name: 'Adeshina Balogun Street (Oreyo / Igbogbo)',
    subDistrict: 'Oreyo / Offin',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.5890,
    lng: 3.5285,
    specificity: 1,
    aliases: ['adeshina balogun', 'adeshina balogun street', '4b adeshina balogun', 'oreyo', 'oreyo bus stop'],
  },
  {
    name: 'Ikorodu Central',
    subDistrict: 'Ikorodu Town',
    lga: 'Ikorodu',
    state: 'Lagos',
    lat: 6.6191,
    lng: 3.5041,
    specificity: 4,
    aliases: ['ikorodu', 'ikorodu town', 'ikorodu lga', 'ikorodu lagos'],
  },

  // ─── ISLAND / LEKKI / ETI-OSA ────────────────────────────────────────────────
  {
    name: 'Victoria Island (VI)',
    subDistrict: 'Adeola Odeku / Ahmadu Bello',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4281,
    lng: 3.4219,
    specificity: 3,
    aliases: ['victoria island', 'vi', 'adeola odeku', 'ahmadu bello', 'kofo abayomi', 'ozumba mbadiwe'],
  },
  {
    name: 'Ikoyi',
    subDistrict: 'Bourbillon / Banana Island',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4549,
    lng: 3.4356,
    specificity: 3,
    aliases: ['ikoyi', 'banana island', 'old ikoyi', 'bourdillon', 'parkview', 'glover road'],
  },
  {
    name: 'Lekki Phase 1',
    subDistrict: 'Admiralty Way',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4474,
    lng: 3.4723,
    specificity: 2,
    aliases: ['lekki phase 1', 'lekki phase one', 'admiralty way', 'freedom way', 'fola osibo'],
  },
  {
    name: 'Jakande / Osapa London',
    subDistrict: 'Jakande Roundabout',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4398,
    lng: 3.5134,
    specificity: 2,
    aliases: ['jakande', 'osapa', 'osapa london', 'jakande roundabout', 'circle mall'],
  },
  {
    name: 'Agungi / Igbo-Efon',
    subDistrict: 'Agungi',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4382,
    lng: 3.5342,
    specificity: 2,
    aliases: ['agungi', 'igbo efon', 'igbo-efon', 'chevron drive', 'chevron'],
  },
  {
    name: 'Ajah / Ilaje',
    subDistrict: 'Ajah Jubilee Bridge',
    lga: 'Eti-Osa',
    state: 'Lagos',
    lat: 6.4698,
    lng: 3.5852,
    specificity: 3,
    aliases: ['ajah', 'ajah roundabout', 'ilaje', 'badore', 'addo road', 'langbasa'],
  },
  {
    name: 'Sangotedo / Abijo',
    subDistrict: 'Novare Mall / Sangotedo',
    lga: 'Ibeju-Lekki',
    state: 'Lagos',
    lat: 6.4789,
    lng: 3.6321,
    specificity: 3,
    aliases: ['sangotedo', 'abijo', 'novare mall', 'shoprite sangotedo', 'awoyaya'],
  },
  {
    name: 'Eleko / Ibeju Lekki',
    subDistrict: 'Eleko Junction / Dangote Refinery',
    lga: 'Ibeju-Lekki',
    state: 'Lagos',
    lat: 6.4891,
    lng: 3.8452,
    specificity: 4,
    aliases: ['eleko', 'ibeju lekki', 'dangote refinery', 'lekki free trade zone', 'eleko beach'],
  },

  // ─── MAINLAND / IKEJA / SURULERE ──────────────────────────────────────────────
  {
    name: 'Ikeja GRA / Allen / Alausa',
    subDistrict: 'Ikeja Central',
    lga: 'Ikeja',
    state: 'Lagos',
    lat: 6.5956,
    lng: 3.3486,
    specificity: 3,
    aliases: ['ikeja', 'ikeja gra', 'allen avenue', 'alausa', 'secretariat', 'toyin street', 'computer village'],
  },
  {
    name: '312 Herbert Macaulay Way (Semicolon Village), Sabo',
    subDistrict: 'Sabo Commercial Strip',
    lga: 'Lagos Mainland',
    state: 'Lagos',
    lat: 6.5056,
    lng: 3.3768,
    specificity: 1,
    aliases: [
      '312 herbert macaulay',
      '312 herbert macaulay way',
      '312 herbert macaulay way sabo',
      '312 herbert macaulay way sabo yaba',
      'semicolon village',
      'semicolon africa',
      'semicolon',
    ],
  },
  {
    name: 'Sabo Market / Commercial Avenue, Yaba',
    subDistrict: 'Sabo Commercial Strip',
    lga: 'Lagos Mainland',
    state: 'Lagos',
    lat: 6.5065,
    lng: 3.3762,
    specificity: 1,
    aliases: [
      'sabo market',
      'commercial avenue',
      'commercial ave',
      'commercial avenue yaba',
      'e-center yaba',
      'ozone cinemas',
    ],
  },
  {
    name: 'Yaba / Sabo / UNILAG',
    subDistrict: 'Yaba Tech Corridor',
    lga: 'Lagos Mainland',
    state: 'Lagos',
    lat: 6.5095,
    lng: 3.3711,
    specificity: 2,
    aliases: ['yaba', 'sabo yaba', 'unilag', 'akoka', 'herbert macaulay', 'tejuosho'],
  },
  {
    name: 'Surulere / Ojuelegba',
    subDistrict: 'Surulere Central',
    lga: 'Surulere',
    state: 'Lagos',
    lat: 6.4969,
    lng: 3.3578,
    specificity: 3,
    aliases: ['surulere', 'ojuelegba', 'bodija', 'adeniran ogunsanya', 'bode thomas', 'national stadium'],
  },
  {
    name: 'Oshodi / Isolo',
    subDistrict: 'Oshodi Transport Interchange',
    lga: 'Oshodi-Isolo',
    state: 'Lagos',
    lat: 6.5569,
    lng: 3.3489,
    specificity: 3,
    aliases: ['oshodi', 'isolo', 'ire-akari', 'airport road', 'oshodi interchange', 'bolade'],
  },
  {
    name: 'Nepa Junction / Jakande Estate',
    subDistrict: 'Jakande Estate / Oke-Afa',
    lga: 'Oshodi-Isolo',
    state: 'Lagos',
    lat: 6.5367,
    lng: 3.3289,
    specificity: 1,
    aliases: ['nepa junction', 'nepa junction jakande', 'nepa junction jakande estate', 'nepa junction isolo', 'nepa junction jakande estate isolo', 'nepa isolo', 'jakande estate nepa'],
  },
  {
    name: 'Jakande Estate, Isolo',
    subDistrict: 'Oke-Afa / Ejigbo Link',
    lga: 'Oshodi-Isolo',
    state: 'Lagos',
    lat: 6.5381,
    lng: 3.3265,
    specificity: 2,
    aliases: ['jakande estate', 'jakande estate isolo', 'jakande isolo', 'oke afa', 'ejigbo jakande'],
  },
  {
    name: 'Agege / Abule Egba',
    subDistrict: 'Pen Cinema / Abule Egba',
    lga: 'Agege',
    state: 'Lagos',
    lat: 6.6342,
    lng: 3.3197,
    specificity: 3,
    aliases: ['agege', 'abule egba', 'pen cinema', 'ijaye', 'dopemu', 'iyana ipaja'],
  },
  {
    name: 'Ayobo Road Corridor',
    subDistrict: 'Ayobo / Ipaja',
    lga: 'Alimosho',
    state: 'Lagos',
    lat: 6.6050,
    lng: 3.2500,
    specificity: 1,
    aliases: ['ayobo road', 'ayobo', 'ayobo bus stop', 'ayobo alimosho'],
  },
  {
    name: 'Abule Egba Junction & Flyover',
    subDistrict: 'Abule Egba / U-Turn',
    lga: 'Alimosho',
    state: 'Lagos',
    lat: 6.6450,
    lng: 3.3050,
    specificity: 1,
    aliases: ['abule egba junction', 'abule egba flyover', 'abule egba bus stop'],
  },
  {
    name: 'Alaba International Market',
    subDistrict: 'Ojo Electronics Hub',
    lga: 'Ojo',
    state: 'Lagos',
    lat: 6.4550,
    lng: 3.1950,
    specificity: 1,
    aliases: ['alaba international market', 'alaba international', 'alaba market', 'alaba market ojo', 'alaba electronics'],
  },
  {
    name: 'Badagry Roundabout / Heritage Hub',
    subDistrict: 'Badagry Central',
    lga: 'Badagry',
    state: 'Lagos',
    lat: 6.4250,
    lng: 2.8850,
    specificity: 1,
    aliases: ['badagry roundabout', 'badagry central', 'badagry heritage', 'badagry market', 'badagry roundabout lagos'],
  },
  {
    name: 'Abibu Oki Street',
    subDistrict: 'Marina / Broad Street Commercial Corridor',
    lga: 'Lagos Island',
    state: 'Lagos',
    lat: 6.4525,
    lng: 3.3885,
    specificity: 1,
    aliases: [
      'abibu oki street',
      'abibu oki',
      'abibuoko street',
      'abibuoko',
      'abibu-oki',
      'abibuoki',
      'habibu oki street',
      'habibu oki',
    ],
  },
  {
    name: 'Festac Town / Amuwo-Odofin',
    subDistrict: 'Festac 1st - 7th Avenue',
    lga: 'Amuwo-Odofin',
    state: 'Lagos',
    lat: 6.4678,
    lng: 3.2833,
    specificity: 3,
    aliases: ['festac', 'festac town', 'amuwo odofin', 'mile 2', 'apple junction', 'festac link bridge'],
  },

  // ─── DELTA / WARRI / EFFURUN HUB ─────────────────────────────────────────────
  {
    name: 'Ugbolokposo / Okorikpehre',
    subDistrict: 'Okorikpehre Community',
    lga: 'Uvwie',
    state: 'Delta',
    lat: 5.5644,
    lng: 5.8450,
    specificity: 2,
    aliases: ['ugbolokposo', 'okorikpehre', 'uvwie', 'ugbolokposo uvwie'],
  },
  {
    name: 'Effurun / PTI Junction',
    subDistrict: 'Effurun Central',
    lga: 'Uvwie',
    state: 'Delta',
    lat: 5.5567,
    lng: 5.7821,
    specificity: 3,
    aliases: ['effurun', 'pti junction', 'effurun roundabout', 'delta mall'],
  },
  {
    name: 'Warri Central / Enerhen',
    subDistrict: 'Warri City',
    lga: 'Warri South',
    state: 'Delta',
    lat: 5.5167,
    lng: 5.7500,
    specificity: 4,
    aliases: ['warri', 'enerhen', 'warri south', 'enerhen junction', 'deco road'],
  },

  // ─── ABUJA FCT ───────────────────────────────────────────────────────────────
  {
    name: 'Central Business District (CBD)',
    subDistrict: 'Central Area',
    lga: 'Abuja Municipal',
    state: 'FCT',
    lat: 9.0579,
    lng: 7.4951,
    specificity: 3,
    aliases: ['cbd abuja', 'central area abuja', 'wuse 2', 'garki', 'maitama', 'asokoro'],
  },
];

// Deduplicate and merge core with extracted Lagos dataset
const extractedList = (lagosData as unknown as NigerianLandmark[]) || [];
const seenKeys = new Set<string>();

export const NIGERIAN_COMMUNITIES: NigerianLandmark[] = [];

for (const c of [...CORE_COMMUNITIES, ...extractedList]) {
  const key = `${c.name.toLowerCase()}_${Math.round(c.lat * 1000)}_${Math.round(c.lng * 1000)}`;
  if (!seenKeys.has(key)) {
    seenKeys.add(key);
    NIGERIAN_COMMUNITIES.push(c);
  }
}

/**
 * Searches local Nigerian community database with precision-weighted scoring and fuzzy tolerance.
 * Guarantees that specific streets, estate gates, and bus stops strictly outrank broad LGAs.
 */
export function searchLocalCommunities(query: string): NigerianLandmark[] {
  if (!query || query.trim().length < 2) return [];
  const cleanQuery = query.toLowerCase().trim();

  const REGION_STOP_WORDS = new Set([
    'street', 'road', 'close', 'avenue', 'crescent', 'drive', 'way', 'lane',
    'state', 'nigeria', 'near', 'beside', 'opposite', 'behind',
    'lagos', 'island', 'mainland', 'area', 'city', 'expressway', 'junction',
    'bus', 'stop', 'roundabout', 'phase', 'hall', 'centre', 'center'
  ]);

  // Extract separate meaningful words
  const queryTokens = cleanQuery
    .split(/[\s,/-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !REGION_STOP_WORDS.has(t));

  interface ScoredLandmark {
    item: NigerianLandmark;
    score: number;
  }

  const scored: ScoredLandmark[] = [];

  for (const item of NIGERIAN_COMMUNITIES) {
    let score = 0;
    let hasNameOrAliasMatch = false;
    const nameLower = item.name.toLowerCase();
    const subLower = item.subDistrict.toLowerCase();
    const lgaLower = item.lga.toLowerCase();
    const specificityWeight = 6 - (item.specificity || 2); // 1->5, 2->4, 3->3, 4->2, 5->1

    // 1. Exact alias match in query (Highest Priority)
    for (const alias of item.aliases) {
      if (cleanQuery.includes(alias)) {
        hasNameOrAliasMatch = true;
        // Specificity 1 (Exact Street) gets massive priority boost over districts & LGAs
        const streetBonus = item.specificity === 1 ? 800 : (item.specificity === 2 ? 300 : 0);
        score += 600 + streetBonus + specificityWeight * 120;
        break;
      }
    }

    // 2. Exact Landmark Name match
    if (cleanQuery.includes(nameLower)) {
      hasNameOrAliasMatch = true;
      const streetBonus = item.specificity === 1 ? 500 : 0;
      score += 400 + streetBonus + specificityWeight * 80;
    }

    // 3. Token-level alias and fuzzy matches
    for (const token of queryTokens) {
      const tokenRegex = new RegExp(`\\b${token}\\b`, 'i');
      if (item.aliases.some((alias) => alias === token || tokenRegex.test(alias))) {
        hasNameOrAliasMatch = true;
        score += 150 + specificityWeight * 30;
      } else {
        // Evaluate fuzzy typo similarity
        for (const alias of item.aliases.slice(0, 3)) {
          const fScore = calculateFuzzyScore(token, alias);
          if (fScore >= 0.88) {
            hasNameOrAliasMatch = true;
            score += Math.round(120 * fScore) + specificityWeight * 20;
            break;
          }
        }
      }

      if (tokenRegex.test(nameLower)) {
        hasNameOrAliasMatch = true;
        score += 100 + specificityWeight * 20;
      }
    }

    // 4. SubDistrict & LGA Contextual Boosters
    // If the street/landmark matches, matching the subdistrict/LGA confirms the corridor!
    // If name didn't match, broad container alone should NEVER score as a street match.
    if (cleanQuery.includes(subLower)) {
      score += hasNameOrAliasMatch ? 180 : 30;
    }
    if (cleanQuery.includes(lgaLower) || queryTokens.includes(lgaLower)) {
      score += hasNameOrAliasMatch ? 100 : 20;
    }

    // 5. LGA Conflict Penalty: If query explicitly names an LGA, candidates in conflicting LGAs get penalized
    const knownLGAs = ['ikeja', 'surulere', 'ikorodu', 'alimosho', 'ojo', 'badagry', 'epe', 'eti-osa', 'apapa', 'agege', 'oshodi-isolo', 'lagos island', 'lagos mainland'];
    const explicitLGAInQuery = knownLGAs.find(lga => cleanQuery.includes(lga));
    if (explicitLGAInQuery && !lgaLower.includes(explicitLGAInQuery) && !subLower.includes(explicitLGAInQuery)) {
      score -= 400;
    }

    // If query contains specific street tokens but this landmark has 0 name/alias match,
    // discard it completely so an unmapped street NEVER claims a random landmark!
    if (!hasNameOrAliasMatch && queryTokens.length >= 2) {
      score = 0;
    }

    if (score >= 80) {
      scored.push({ item, score });
    }
  }

  // Sort descending by score; if tied, sort by specificity ascending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.item.specificity - b.item.specificity;
  });

  return scored.map((s) => s.item);
}
