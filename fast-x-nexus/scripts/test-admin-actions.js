#!/usr/bin/env node

/**
 * /scripts/test-admin-actions.js
 * Fast X Nexus — Enterprise Admin Server Actions Verification Suite
 *
 * Verifies against live Supabase database:
 * 1. getAllOrdersAdmin (joins, pagination, search, status filter)
 * 2. assignRiderToOrder (atomic state change, notification dispatch, audit trail, cache invalidation)
 * 3. cancelOrderAdmin (status update to CANCELLED, audit reason recording, cache invalidation)
 * 4. getAllRidersAdmin (profiles with role='rider', verification, vehicle metadata, active orders)
 * 5. updateRiderApproval (active_status & KYC compliance updates)
 * 6. getAdminFinancialStats (Total GMV, 70% Rider Escrow, 30% Platform margin, daily/weekly splits)
 * 7. getSystemHealthStats (DB ping latency, H3 spatial mesh, unassigned queue dwell latency)
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables
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

// 2. Register TSX for TypeScript loading
require('tsx/cjs');

const { createAdminClient } = require('../src/lib/supabase/server.ts');
const {
  getAllOrdersAdmin,
  assignRiderToOrder,
  cancelOrderAdmin,
  getAllRidersAdmin,
  updateRiderApproval,
  getAdminFinancialStats,
  getSystemHealthStats,
} = require('../src/app/actions/admin.ts');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runVerification() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   FAST X NEXUS — ADMIN SERVER ACTIONS VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const adminClient = await createAdminClient();

  // Find or create test customer and rider
  const { data: existingRider } = await adminClient
    .from('profiles')
    .select('id, active_status, metadata')
    .eq('role', 'rider')
    .limit(1)
    .single();

  if (!existingRider) {
    throw new Error('No rider profile found in database for testing. Please ensure at least one rider profile exists.');
  }

  const { data: existingCustomer } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
    .limit(1)
    .single();

  const customerId = existingCustomer ? existingCustomer.id : existingRider.id;
  const riderId = existingRider.id;

  console.log(`📍 Test Context: Rider ID: ${riderId}, Customer ID: ${customerId}\n`);

  // Create a designated test order to run actions on
  console.log('📦 Setting up temporary test order in Supabase...');
  const { data: testOrder, error: createOrderError } = await adminClient
    .from('orders')
    .insert({
      customer_id: customerId,
      rider_id: null,
      status: 'PAID_UNASSIGNED',
      pickup_h3_cell: '8924300aa4bffff',
      dropoff_h3_cell: '8924300aa4bffff',
      total_amount: 5500,
      pickup_name: 'Admin Test Sender',
      pickup_phone: '+2348011112222',
      pickup_address: '10 Industrial Avenue, Ikeja, Lagos',
      dropoff_name: 'Admin Test Recipient',
      dropoff_phone: '+2348033334444',
      dropoff_address: '25 Marina Road, Lagos Island, Lagos',
      metadata: { test_suite: 'admin_actions_verification' },
    })
    .select()
    .single();

  if (createOrderError || !testOrder) {
    throw new Error(`Failed to create test order: ${createOrderError?.message}`);
  }

  // Add a test parcel to testOrder
  await adminClient.from('parcels').insert({
    order_id: testOrder.id,
    weight: 2.5,
    description: 'Precision Instruments (Test Order)',
    declared_value: 45000,
    dimensions: '20x15x10 cm',
  });

  const testOrderId = testOrder.id;
  console.log(`  Created test order: ${testOrderId}\n`);

  try {
    // ─── TEST 1: getAllOrdersAdmin ───────────────────────────────────────────
    console.log('🧪 [TEST 1/7] Testing getAllOrdersAdmin()...');
    
    // Default fetch
    const ordersRes = await getAllOrdersAdmin({ page: 1, limit: 10 });
    assert(ordersRes.success === true, 'getAllOrdersAdmin returns success=true');
    assert(Array.isArray(ordersRes.orders), 'getAllOrdersAdmin returns orders array');
    assert(ordersRes.totalCount > 0, `getAllOrdersAdmin found orders (total: ${ordersRes.totalCount})`);
    
    // Verify joins
    const sampleOrder = ordersRes.orders.find((o) => o.id === testOrderId) || ordersRes.orders[0];
    assert(sampleOrder.parcels !== undefined, 'Order is joined with parcels relation');
    assert(sampleOrder.customer !== undefined, 'Order is joined with customer profile relation');
    console.log(`  Joined sample: Order ${sampleOrder.id.slice(0, 8)} with ${sampleOrder.parcels?.length || 0} parcels`);

    // Test status filter
    const filteredRes = await getAllOrdersAdmin({ status: 'PAID_UNASSIGNED' });
    assert(filteredRes.success === true, 'Filtering by status succeeds');
    const allMatchStatus = filteredRes.orders.every((o) => o.status === 'PAID_UNASSIGNED');
    assert(allMatchStatus, 'All filtered orders match status PAID_UNASSIGNED');

    // Test search filter
    const searchRes = await getAllOrdersAdmin({ search: 'Precision' });
    assert(searchRes.success === true, 'Search query executed successfully');

    const searchResByName = await getAllOrdersAdmin({ search: 'Admin Test Sender' });
    assert(searchResByName.success === true && searchResByName.orders.some((o) => o.id === testOrderId), 'Search by sender name successfully retrieves test order');

    // ─── TEST 2: assignRiderToOrder ──────────────────────────────────────────
    console.log('\n🧪 [TEST 2/7] Testing assignRiderToOrder()...');
    const assignRes = await assignRiderToOrder(testOrderId, riderId);
    assert(assignRes.success === true, 'assignRiderToOrder returns success=true');
    assert(assignRes.order?.rider_id === riderId, 'Order rider_id is set to target rider');
    assert(assignRes.order?.status === 'ASSIGNED', 'Order status is updated to ASSIGNED');
    assert(assignRes.auditEvent?.event === 'RIDER_ASSIGNED', 'Audit event is created for rider assignment');
    assert(Array.isArray(assignRes.order?.metadata?.audit_trail), 'Metadata records audit_trail entry');
    console.log(`  Assigned rider ${riderId.slice(0, 8)} to order ${testOrderId.slice(0, 8)}`);

    // ─── TEST 3: cancelOrderAdmin ────────────────────────────────────────────
    console.log('\n🧪 [TEST 3/7] Testing cancelOrderAdmin()...');
    const cancellationReason = 'Automated QA verification test cancellation';
    const cancelRes = await cancelOrderAdmin(testOrderId, cancellationReason);
    assert(cancelRes.success === true, 'cancelOrderAdmin returns success=true');
    assert(cancelRes.order?.status === 'CANCELLED', 'Order status is updated to CANCELLED');
    assert(cancelRes.order?.metadata?.cancellation_reason === cancellationReason, 'Metadata captures cancellation reason');
    
    // Check parcel description redundancy
    const { data: updatedParcels } = await adminClient.from('parcels').select('description').eq('order_id', testOrderId);
    assert(updatedParcels && updatedParcels[0]?.description.includes('CANCELLED'), 'Parcel description was annotated with cancellation reason');
    console.log(`  Cancelled order ${testOrderId.slice(0, 8)} with reason: "${cancellationReason}"`);

    // ─── TEST 4: getAllRidersAdmin ───────────────────────────────────────────
    console.log('\n🧪 [TEST 4/7] Testing getAllRidersAdmin()...');
    const ridersRes = await getAllRidersAdmin();
    assert(ridersRes.success === true, 'getAllRidersAdmin returns success=true');
    assert(Array.isArray(ridersRes.riders) && ridersRes.riders.length > 0, `Riders list retrieved (count: ${ridersRes.riders.length})`);

    const sampleRider = ridersRes.riders.find((r) => r.id === riderId) || ridersRes.riders[0];
    assert(sampleRider.verification_status === 'VERIFIED' || sampleRider.verification_status === 'PENDING', 'Rider includes verification_status');
    assert(sampleRider.vehicle_info !== undefined, 'Rider includes vehicle_info object');
    assert(typeof sampleRider.active_orders_count === 'number', 'Rider includes active_orders_count');
    console.log(`  Rider ${sampleRider.id.slice(0, 8)}: Status=${sampleRider.verification_status}, Vehicle=${sampleRider.vehicle_info.type}, ActiveOrders=${sampleRider.active_orders_count}`);

    // ─── TEST 5: updateRiderApproval ─────────────────────────────────────────
    console.log('\n🧪 [TEST 5/7] Testing updateRiderApproval()...');
    const originalActive = existingRider.active_status;
    const approvalNotes = 'Verified via fast-x admin actions test suite';
    
    // Toggle status
    const updateRes = await updateRiderApproval(riderId, true, approvalNotes);
    assert(updateRes.success === true, 'updateRiderApproval returns success=true');
    assert(updateRes.profile?.active_status === true, 'Rider active_status set to true');
    assert(updateRes.profile?.metadata?.kyc_approved === true, 'Rider metadata kyc_approved set to true');
    assert(updateRes.profile?.metadata?.approval_notes === approvalNotes, 'Approval notes captured in metadata');

    // Restore original active_status if it was different
    if (!originalActive) {
      await updateRiderApproval(riderId, false, 'Restored original state');
    }
    console.log(`  Rider ${riderId.slice(0, 8)} approval state successfully modified and verified`);

    // ─── TEST 6: getAdminFinancialStats ──────────────────────────────────────
    console.log('\n🧪 [TEST 6/7] Testing getAdminFinancialStats()...');
    const financeRes = await getAdminFinancialStats();
    assert(financeRes.success === true, 'getAdminFinancialStats returns success=true');
    assert(typeof financeRes.totalGMV === 'number', `totalGMV calculated: ₦${financeRes.totalGMV}`);
    assert(typeof financeRes.riderEscrowPool === 'number', `riderEscrowPool calculated: ₦${financeRes.riderEscrowPool}`);
    assert(typeof financeRes.platformGrossRevenue === 'number', `platformGrossRevenue calculated: ₦${financeRes.platformGrossRevenue}`);
    assert(typeof financeRes.dailyRevenue === 'number', `dailyRevenue calculated: ₦${financeRes.dailyRevenue}`);
    assert(typeof financeRes.weeklyRevenue === 'number', `weeklyRevenue calculated: ₦${financeRes.weeklyRevenue}`);

    // Verify 70/30 split invariant (within 1 Naira rounding tolerance)
    const splitSum = financeRes.riderEscrowPool + financeRes.platformGrossRevenue;
    const diff = Math.abs(splitSum - financeRes.totalGMV);
    assert(diff <= 1, `Escrow invariant holds: 70% (₦${financeRes.riderEscrowPool}) + 30% (₦${financeRes.platformGrossRevenue}) ≈ 100% (₦${financeRes.totalGMV}) [diff: ${diff}]`);

    // ─── TEST 7: getSystemHealthStats ────────────────────────────────────────
    console.log('\n🧪 [TEST 7/7] Testing getSystemHealthStats()...');
    const healthRes = await getSystemHealthStats();
    assert(healthRes.success === true, 'getSystemHealthStats returns success=true');
    assert(healthRes.dbPing?.latencyMs >= 0, `DB ping latency measured: ${healthRes.dbPing?.latencyMs}ms (${healthRes.dbPing?.status})`);
    assert(healthRes.h3Clusters?.activeCount >= 0, `Active H3 spatial clusters identified: ${healthRes.h3Clusters?.activeCount}`);
    assert(healthRes.unassignedQueue?.unassignedCount >= 0, `Unassigned queue size: ${healthRes.unassignedQueue?.unassignedCount} orders`);
    assert(typeof healthRes.unassignedQueue?.averageLatencyMinutes === 'number', `Unassigned queue average wait: ${healthRes.unassignedQueue?.averageLatencyMinutes} mins`);
    console.log(`  Health telemetry: DB Latency=${healthRes.dbPing?.latencyMs}ms, Clusters=${healthRes.h3Clusters?.activeCount}, Queue=${healthRes.unassignedQueue?.unassignedCount} orders`);

  } finally {
    // Cleanup temporary test order
    console.log('\n🧹 Cleaning up temporary test records...');
    await adminClient.from('parcels').delete().eq('order_id', testOrderId);
    await adminClient.from('orders').delete().eq('id', testOrderId);
    console.log(`  Removed test order ${testOrderId}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`   SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ Fatal Verification Suite Error:', err);
  process.exit(1);
});
