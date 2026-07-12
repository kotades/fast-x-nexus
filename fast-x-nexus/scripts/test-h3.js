const assert = require('assert');
const { latLngToCell, gridDisk, greatCircleDistance } = require('h3-js');

// Minimal implementations mirroring src/lib/h3.ts to test logic
function coordinateToH3Zone(lat, lng, resolution) {
  const h3Index = latLngToCell(lat, lng, resolution);
  return {
    h3Index,
    resolution,
    isValid: true
  };
}

function getZoneNeighbors(h3Index, ringSize) {
  return gridDisk(h3Index, ringSize);
}

function calculateDistanceKm(origin, destination) {
  return greatCircleDistance([origin.lat, origin.lng], [destination.lat, destination.lng], 'km');
}

function hasCrossedTelemetryThreshold(lastUploaded, current) {
  const distanceKm = calculateDistanceKm(lastUploaded, current);
  return distanceKm >= 0.05; // 50 meters
}

console.log('🧪 Starting JS H3 Spatial Engine Unit Tests...');

try {
  // Test 1: coordinateToH3Zone
  const lat = 6.4281;
  const lng = 3.4219;
  const result = coordinateToH3Zone(lat, lng, 7);
  
  assert.strictEqual(result.resolution, 7, 'H3 cell resolution should be 7');
  assert.ok(result.h3Index.startsWith('87') || result.h3Index.startsWith('8a'), 'Lagos H3 index should start with 87 or 8a');
  console.log('✅ Test 1 Passed: coordinateToH3Zone maps correctly.');

  // Test 2: getZoneNeighbors
  const neighbors = getZoneNeighbors(result.h3Index, 1);
  assert.strictEqual(neighbors.length, 7, 'Ring disk of size 1 should return 7 cells (center + 6 neighbors)');
  assert.ok(neighbors.includes(result.h3Index), 'Ring disk must include the center cell');
  console.log('✅ Test 2 Passed: getZoneNeighbors matches adjacent hexagons.');

  // Test 3: calculateDistanceKm
  const lekki = { lat: 6.4281, lng: 3.4219 };
  const vi = { lat: 6.4278, lng: 3.4000 };
  const distance = calculateDistanceKm(lekki, vi);
  assert.ok(distance > 2 && distance < 3, `Distance should be around 2.4km, got: ${distance}km`);
  console.log('✅ Test 3 Passed: calculateDistanceKm calculates correct distance.');

  // Test 4: hasCrossedTelemetryThreshold
  const p1 = { lat: 6.4281, lng: 3.4219 };
  const p2 = { lat: 6.4281 + 0.00009, lng: 3.4219 };
  const p3 = { lat: 6.4281 + 0.00055, lng: 3.4219 };

  const closeDist = calculateDistanceKm(p1, p2);
  const farDist = calculateDistanceKm(p1, p3);

  assert.strictEqual(hasCrossedTelemetryThreshold(p1, p2), false, `10 meters (${(closeDist * 1000).toFixed(1)}m) should NOT cross 50m threshold`);
  assert.strictEqual(hasCrossedTelemetryThreshold(p1, p3), true, `60 meters (${(farDist * 1000).toFixed(1)}m) SHOULD cross 50m threshold`);
  console.log('✅ Test 4 Passed: hasCrossedTelemetryThreshold handles 50m geofence rules.');

  console.log('🎉 All JS H3 Spatial Engine Unit Tests Passed successfully!');
} catch (error) {
  console.error('❌ Unit test failed:', error);
  process.exit(1);
}
