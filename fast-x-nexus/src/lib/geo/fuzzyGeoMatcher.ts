/**
 * /src/lib/geo/fuzzyGeoMatcher.ts
 * Fast X Nexus — Fuzzy Typo-Tolerant Matcher for Nigerian Geospatial Names
 *
 * Implements:
 * 1. Levenshtein Distance Calculation (character edit distance)
 * 2. Jaccard Token Overlap (word set intersection)
 * 3. Nigerian Phonetic & Orthographic Normalizer (s/sh, y/i, vowel shifts)
 * 4. Composite Similarity Scoring (0.0 to 1.0)
 */

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Normalizes Yoruba and Nigerian dialectal spelling variations.
 */
export function normalizePhonetics(str: string): string {
  return str
    .toLowerCase()
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/iy/g, 'y')
    .replace(/ai/g, 'ay')
    .replace(/gb/g, 'b')
    .replace(/kp/g, 'p')
    .replace(/[\s\-_,.]+/g, '');
}

/**
 * Computes Jaccard similarity between two token sets.
 */
export function jaccardSimilarity(query: string, target: string): number {
  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  const tTokens = new Set(target.toLowerCase().split(/\s+/).filter(Boolean));

  if (qTokens.size === 0 || tTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of qTokens) {
    if (tTokens.has(token)) intersection++;
  }

  const union = new Set([...qTokens, ...tTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculates composite fuzzy score between a query and a candidate landmark.
 * Returns score between 0.0 (no match) and 1.0 (exact match).
 */
export function calculateFuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();

  if (q === c) return 1.0;
  if (c.includes(q) || q.includes(c)) return 0.95;

  // Check phonetic equivalence
  const normQ = normalizePhonetics(q);
  const normC = normalizePhonetics(c);
  if (normQ === normC) return 0.92;
  if (normC.includes(normQ) || normQ.includes(normC)) return 0.88;

  // Check Levenshtein ratio
  const maxLen = Math.max(q.length, c.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(q, c);
  const levScore = Math.max(0, 1 - dist / maxLen);

  // Check Jaccard word similarity
  const jaccard = jaccardSimilarity(q, c);

  // Weighted composite score
  return parseFloat((0.6 * levScore + 0.4 * jaccard).toFixed(3));
}
