#!/usr/bin/env node

/**
 * /scripts/test-auto-dispatch.js
 * Fast X Nexus — 1-Click Batch Auto-Dispatch Verification Suite
 */

const fs = require('fs');
const path = require('path');

function parseEnv(filepath) {
  const env = {};
  if (fs.existsSync(filepath)) {
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    for (const line of lines) {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["'\x27]|["'\x27]$/g, '');
        env[key] = val;
      }
    }
  }
  return env;
}

const rootDir = path.resolve(__dirname, '..');
const env = Object.assign({}, parseEnv(path.join(rootDir, '.env')), parseEnv(path.join(rootDir, '.env.local')));
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) {
    process.env[k] = v;
  }
}

require('tsx/cjs');

const { createAdminClient } = require('../src/lib/supabase/server.ts');
const { previewAutoDispatchAction, executeBatchAutoDispatchAction } = require('../src/app/actions/dispatch.ts');

async function runVerification() {
  console.log('🚀 Starting 1-Click Batch Auto-Dispatch Engine Verification Suite\n');
  const adminClient = await createAdminClient();

  // 1. Verify online couriers exist
  const { data: riders } = await adminClient
    .from('profiles')
    .select('id, metadata, role')
    .eq('role', 'rider');

  console.log(`[Setup] Found ${riders?.length || 0} registered couriers.`);
  if (!riders || riders.length === 0) {
    throw new Error('No couriers registered in database for dispatch testing.');
  }

  // Pre-cleanup any leftover test orders
  await adminClient.from('orders').delete().ilike('pickup_name', '%Tech Depot Ikeja%');
  await adminClient.from('orders').delete().ilike('pickup_name', '%Express Hub Ikeja%');

  const primaryRider = riders[0];
  console.log(`[Setup] Primary Courier: ${primaryRider.id} (${primaryRider.metadata?.full_name || 'Unnamed'})`);

  // Ensure rider has a valid location in rider_locations (Ikeja hub)
  const ikejaH3 = '8882db2d41fffff';
  await adminClient
    .from('rider_locations')
    .upsert({
      rider_id: primaryRider.id,
      latitude: 6.5950,
      longitude: 3.3440,
      h3_cell: ikejaH3,
      updated_at: new Date().toISOString(),
    });
  console.log(`[Setup] Ensured rider telemetry beacon at Ikeja (H3: ${ikejaH3})`);

  // 2. Query valid customer profile and insert 2 test waybills in PAID_UNASSIGNED status
  const { data: customerProfiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
    .limit(1);

  const testCustomerId = customerProfiles?.[0]?.id || 'cdf9d7e3-c90d-47c3-b6ae-c29eeb5e9732';

  const crypto = require('crypto');
  const testOrderId1 = crypto.randomUUID();
  const testOrderId2 = crypto.randomUUID();

  const { error: seedErr1 } = await adminClient.from('orders').insert({
    id: testOrderId1,
    customer_id: testCustomerId,
    status: 'PAID_UNASSIGNED',
    pickup_address: 'Computer Village, Ikeja, Lagos',
    dropoff_address: 'Allen Avenue, Ikeja, Lagos',
    pickup_name: 'Tech Depot Ikeja',
    dropoff_name: 'Retail Store Allen',
    pickup_phone: '+2348011112222',
    dropoff_phone: '+2348033334444',
    pickup_h3_cell: '8882db2d41fffff',
    dropoff_h3_cell: '8882db2d41fffff',
    total_amount: 5000,
  });

  const { error: seedErr2 } = await adminClient.from('orders').insert({
    id: testOrderId2,
    customer_id: testCustomerId,
    status: 'PAID_UNASSIGNED',
    pickup_address: 'Awolowo Way, Ikeja, Lagos',
    dropoff_address: 'Opebi Road, Ikeja, Lagos',
    pickup_name: 'Express Hub Ikeja',
    dropoff_name: 'Corporate Tower Opebi',
    pickup_phone: '+2348055556666',
    dropoff_phone: '+2348077778888',
    pickup_h3_cell: '8882db2d41fffff',
    dropoff_h3_cell: '8882db2d41fffff',
    total_amount: 8000,
  });

  if (seedErr1 || seedErr2) {
    console.error('Failed to seed test orders:', seedErr1 || seedErr2);
    throw seedErr1 || seedErr2;
  }
  console.log(`[Setup] Seeded 2 test waybills in PAID_UNASSIGNED status (${testOrderId1}, ${testOrderId2})`);

  // 3. Test previewAutoDispatchAction()
  console.log('\n--- TEST 1: Preview Auto-Dispatch (Non-mutating) ---');
  const previewRes = await previewAutoDispatchAction({
    maxRadiusH3Krings: 6,
    allowMultiOrder: true,
    maxOrdersPerRider: 3,
  });

  if (!previewRes.success || !previewRes.data) {
    console.error('Preview action failed:', previewRes.error);
    process.exit(1);
  }

  console.log('✅ Preview Action Returned Success!');
  console.log(`Total Orders in Queue: ${previewRes.data.totalOrders}`);
  console.log(`Matched Pairs: ${previewRes.data.matchedCount}`);
  console.log(`Unassigned Orders: ${previewRes.data.unassignedCount}`);
  console.log(`Total Courier Escrow: ₦${previewRes.data.totalPayoutNgn.toLocaleString()}`);
  console.log(`Average Proximity Distance: ${previewRes.data.avgDistanceKm} km`);

  // Assert seeded orders are present in matches
  const match1 = previewRes.data.matches.find((m) => m.orderId === testOrderId1);
  const match2 = previewRes.data.matches.find((m) => m.orderId === testOrderId2);

  if (!match1 || !match2) {
    console.error('Seeded orders were not matched in preview! Matches:', previewRes.data.matches);
    process.exit(1);
  }

  console.log(`✅ Seeded Order 1 Matched: ${match1.trackingNumber} -> Courier ${match1.riderName} (₦${match1.payoutNgn} Payout, ${match1.distanceKm} km, ~${match1.estimatedPickupMinutes} min ETA)`);
  console.log(`✅ Seeded Order 2 Matched: ${match2.trackingNumber} -> Courier ${match2.riderName} (₦${match2.payoutNgn} Payout, ${match2.distanceKm} km, ~${match2.estimatedPickupMinutes} min ETA)`);

  // 4. Verify orders are STILL in PAID_UNASSIGNED status (no database mutation)
  const { data: checkOrders } = await adminClient
    .from('orders')
    .select('id, status, rider_id')
    .in('id', [testOrderId1, testOrderId2]);

  const allUnassigned = checkOrders?.every((o) => o.status === 'PAID_UNASSIGNED' && !o.rider_id);
  if (!allUnassigned) {
    console.error('DATABASE MUTATED DURING PREVIEW! State:', checkOrders);
    process.exit(1);
  }
  console.log('✅ Verified: Preview was strictly non-mutating. Both orders remain in PAID_UNASSIGNED status.');

  // 5. Test executeBatchAutoDispatchAction()
  console.log('\n--- TEST 2: Confirmed Batch Execution (Atomic Database Mutation) ---');
  const confirmedMatches = [
    { orderId: testOrderId1, riderId: match1.riderId },
    { orderId: testOrderId2, riderId: match2.riderId },
  ];

  const execRes = await executeBatchAutoDispatchAction(confirmedMatches);
  if (!execRes.success || execRes.allocatedCount !== 2) {
    console.error('Batch execution failed or partial count:', execRes);
    process.exit(1);
  }
  console.log(`✅ Batch Execution Succeeded: ${execRes.allocatedCount} orders allocated!`);

  // 6. Verify orders transitioned to ASSIGNED in Supabase
  const { data: updatedOrders } = await adminClient
    .from('orders')
    .select('id, status, rider_id')
    .in('id', [testOrderId1, testOrderId2]);

  for (const o of updatedOrders || []) {
    if (o.status !== 'ASSIGNED' || !o.rider_id) {
      console.error(`Order ${o.id} did not transition properly!`, o);
      process.exit(1);
    }
    console.log(`✅ Verified in Supabase: Order ${o.id} status is now ${o.status}, rider_id = ${o.rider_id}`);
  }

  // 7. Cleanup test orders
  await adminClient.from('orders').delete().in('id', [testOrderId1, testOrderId2]);
  console.log('\n🧹 Cleaned up test orders.');

  console.log('\n🎉 ALL 1-CLICK BATCH AUTO-DISPATCH CHECKS PASSED WITH 100% SUCCESS!\n');
}

runVerification().catch((err) => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
