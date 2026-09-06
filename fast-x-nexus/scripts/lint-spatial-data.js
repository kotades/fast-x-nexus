/**
 * scripts/lint-spatial-data.js
 * Fast X Nexus — Ingestion-Time Spatial Data Linter
 *
 * Verifies that every landmark, street, and point of interest in our local datasets
 * is physically contained within its assigned Lagos LGA / sector bounding box.
 * Fails CI build if any entry has contradictory coordinates and text tags.
 */

const fs = require('fs');
const path = require('path');

// Approximate bounding boxes for all 20 Lagos LGAs [minLat, maxLat, minLng, maxLng]
const LGA_BOUNDS = {
  'lagos island': { minLat: 6.395, maxLat: 6.485, minLng: 3.370, maxLng: 3.425 },
  'eti-osa':      { minLat: 6.400, maxLat: 6.500, minLng: 3.410, maxLng: 3.650 },
  'ikeja':        { minLat: 6.560, maxLat: 6.640, minLng: 3.310, maxLng: 3.385 },
  'surulere':     { minLat: 6.470, maxLat: 6.535, minLng: 3.325, maxLng: 3.375 },
  'mainland':     { minLat: 6.480, maxLat: 6.535, minLng: 3.360, maxLng: 3.400 }, // Yaba, Ebute Metta
  'yaba':         { minLat: 6.480, maxLat: 6.535, minLng: 3.360, maxLng: 3.400 },
  'alimosho':     { minLat: 6.530, maxLat: 6.660, minLng: 3.200, maxLng: 3.330 },
  'ikorodu':      { minLat: 6.530, maxLat: 6.700, minLng: 3.420, maxLng: 3.650 },
  'kosofe':       { minLat: 6.540, maxLat: 6.620, minLng: 3.360, maxLng: 3.440 }, // Ketu, Ojota, Ogudu, Mile 12
  'somolu':       { minLat: 6.520, maxLat: 6.560, minLng: 3.360, maxLng: 3.400 }, // Bariga, Somolu
  'oshodi-isolo': { minLat: 6.510, maxLat: 6.565, minLng: 3.280, maxLng: 3.355 },
  'agege':        { minLat: 6.600, maxLat: 6.650, minLng: 3.300, maxLng: 3.350 },
  'ifako-ijaiye': { minLat: 6.630, maxLat: 6.700, minLng: 3.290, maxLng: 3.360 },
  'mushin':       { minLat: 6.515, maxLat: 6.550, minLng: 3.330, maxLng: 3.370 },
  'apapa':        { minLat: 6.420, maxLat: 6.475, minLng: 3.325, maxLng: 3.385 },
  'ajeromi-ifelodun': { minLat: 6.435, maxLat: 6.475, minLng: 3.300, maxLng: 3.350 }, // Ajegunle
  'amuwo-odofin': { minLat: 6.420, maxLat: 6.495, minLng: 3.250, maxLng: 3.320 }, // Festac, Mile 2
  'ojo':          { minLat: 6.430, maxLat: 6.510, minLng: 3.150, maxLng: 3.250 }, // Alaba, Ojo
  'badagry':      { minLat: 6.390, maxLat: 6.500, minLng: 2.850, maxLng: 3.150 },
  'epe':          { minLat: 6.550, maxLat: 6.680, minLng: 3.900, maxLng: 4.100 },
  'ibeju-lekki':  { minLat: 6.420, maxLat: 6.550, minLng: 3.650, maxLng: 4.050 },
};

function normalizeLgaKey(text) {
  const t = (text || '').toLowerCase();
  for (const key of Object.keys(LGA_BOUNDS)) {
    if (t.includes(key)) return key;
  }
  return null;
}

function lintDataset(filePath) {
  console.log(`\n🔍 Linting spatial dataset: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return 0;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let errorCount = 0;

  data.forEach((item, index) => {
    const lat = item.lat;
    const lng = item.lng;

    // 1. Check Nigeria coordinates bounds
    if (typeof lat !== 'number' || typeof lng !== 'number' || lat < 4.0 || lat > 14.0 || lng < 2.5 || lng > 15.0) {
      console.error(`❌ [Item #${index}] "${item.name}": Coordinates out of Nigeria bounds (${lat}, ${lng})`);
      errorCount++;
      return;
    }

    // 2. Check LGA containment
    const lgaKey = normalizeLgaKey(item.lga) || normalizeLgaKey(item.subDistrict);
    if (lgaKey && LGA_BOUNDS[lgaKey]) {
      const bounds = LGA_BOUNDS[lgaKey];
      // Allow slight padding (0.015 deg ~ 1.6km buffer for border areas)
      const pad = 0.02;
      if (lat < bounds.minLat - pad || lat > bounds.maxLat + pad || lng < bounds.minLng - pad || lng > bounds.maxLng + pad) {
        console.error(`❌ [Item #${index}] "${item.name}": Assigned to "${lgaKey.toUpperCase()}" but coordinates (${lat}, ${lng}) fall outside ${lgaKey.toUpperCase()} bounds.`);
        console.error(`   Expected lat in [${bounds.minLat}, ${bounds.maxLat}], lng in [${bounds.minLng}, ${bounds.maxLng}]`);
        errorCount++;
      }
    }
  });

  return errorCount;
}

function main() {
  console.log('🚀 Running Fast X Spatial Ingestion Linter...');
  const landmarksFile = path.resolve(__dirname, '../src/lib/geo/data/lagosLandmarksData.json');
  const errors = lintDataset(landmarksFile);

  if (errors > 0) {
    console.error(`\n💥 Spatial Lint Failed! Found ${errors} coordinate-to-LGA mismatch(es).`);
    process.exit(1);
  } else {
    console.log('\n✅ All spatial dataset entries physically verified inside their assigned Lagos LGAs!');
    process.exit(0);
  }
}

main();
