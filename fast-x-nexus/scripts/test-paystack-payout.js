#!/usr/bin/env node

/**
 * /scripts/test-paystack-payout.js
 * Fast X Nexus — Paystack Direct Courier Escrow Payout Verification Suite
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
const {
  getNigerianBanksAction,
  resolveCourierAccountAction,
  getCourierPayoutRoster,
  disburseCourierPayoutAction,
} = require('../src/app/actions/admin.ts');

async function run() {
  console.log('🚀 Starting Paystack Direct Courier Escrow Payout Verification Suite\n');
  const adminClient = await createAdminClient();

  // 1. Verify Banks List
  console.log('--- TEST 1: Nigerian Commercial & Fintech Banks Retrieval ---');
  const banks = await getNigerianBanksAction();
  console.log(`✓ Fetched ${banks.length} banks.`);
  if (!banks || banks.length === 0) {
    throw new Error('Banks list is empty');
  }
  const gtbank = banks.find((b) => b.code === '058');
  console.log(`✓ Sample Bank: ${gtbank?.name} (Code: ${gtbank?.code})`);

  // 2. Verify Bank Account NUBAN Resolution
  console.log('\n--- TEST 2: NUBAN Account Resolution ---');
  const resolveRes = await resolveCourierAccountAction('0123456789', '058');
  console.log('✓ Account Resolution Result:', resolveRes);
  if (!resolveRes.success || !resolveRes.accountName) {
    throw new Error('Failed to resolve NUBAN account');
  }

  // 3. Setup Courier with Delivered Order for Payout
  console.log('\n--- TEST 3: Courier Escrow Payout Roster Calculation ---');
  const { data: riders } = await adminClient
    .from('profiles')
    .select('id, metadata')
    .eq('role', 'rider')
    .limit(1);

  if (!riders || riders.length === 0) {
    throw new Error('No rider profile found');
  }

  const testRider = riders[0];
  console.log(`✓ Target Courier: ${testRider.id} (${testRider.metadata?.full_name || 'Unnamed'})`);

  const { data: customerProfiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'customer')
    .limit(1);
  const customerId = customerProfiles?.[0]?.id || 'cdf9d7e3-c90d-47c3-b6ae-c29eeb5e9732';

  const crypto = require('crypto');
  const deliveredOrderId = crypto.randomUUID();

  // Insert a test DELIVERED order with ₦10,000 GMV (70% = ₦7,000 escrow)
  const { error: insErr } = await adminClient.from('orders').insert({
    id: deliveredOrderId,
    customer_id: customerId,
    rider_id: testRider.id,
    status: 'DELIVERED',
    pickup_address: 'Victoria Island Hub, Lagos',
    dropoff_address: 'Lekki Phase 1, Lagos',
    pickup_name: 'VIP Client VI',
    dropoff_name: 'Executive Lekki',
    pickup_phone: '+2348011112222',
    dropoff_phone: '+2348033334444',
    pickup_h3_cell: '8882db2d41fffff',
    dropoff_h3_cell: '8882db2d41fffff',
    total_amount: 10000,
    metadata: {},
  });

  if (insErr) {
    console.error('Failed to insert test delivered order:', insErr);
    throw insErr;
  }
  console.log(`✓ Seeded DELIVERED order ${deliveredOrderId} for Courier (₦10,000 GMV -> ₦7,000 Courier Escrow)`);

  // Check Roster Calculation
  const rosterRes = await getCourierPayoutRoster();
  if (!rosterRes.success) {
    throw new Error('Failed to get courier payout roster: ' + rosterRes.error);
  }

  const courierItem = rosterRes.couriers.find((c) => c.riderId === testRider.id);
  console.log('✓ Courier Payout Summary:', {
    name: courierItem?.name,
    deliveredOrders: courierItem?.totalDeliveredOrders,
    totalEarnedNgn: courierItem?.totalRiderEarnedNgn,
    disbursedNgn: courierItem?.disbursedNgn,
    pendingNgn: courierItem?.pendingNgn,
  });

  if (!courierItem || courierItem.pendingNgn < 7000) {
    throw new Error('Pending escrow calculation did not reflect the ₦7,000 delivered order cut');
  }

  // 4. Test Disburse Courier Payout via Paystack Transfer API
  console.log('\n--- TEST 4: Paystack Direct Transfer Disbursement ---');
  const disburseRes = await disburseCourierPayoutAction({
    riderId: testRider.id,
    amountNaira: 7000,
    orderIds: [deliveredOrderId],
    bankDetails: {
      bank_name: 'Guaranty Trust Bank',
      bank_code: '058',
      account_number: '0123456789',
      account_name: testRider.metadata?.full_name || 'Sanni Inuoluwadunsimi',
    },
  });

  console.log('✓ Disbursement Result:', disburseRes);
  if (!disburseRes.success || !disburseRes.reference) {
    throw new Error('Payout disbursement failed: ' + disburseRes.error);
  }

  console.log(`✅ Paystack Transfer Reference Generated: ${disburseRes.reference}`);
  console.log(`✅ Status: ${disburseRes.status} | Recipient: ${disburseRes.recipientName} | Bank: ${disburseRes.bankName}`);

  // 5. Verify order metadata updated in database
  const { data: verifiedOrder } = await adminClient
    .from('orders')
    .select('id, metadata')
    .eq('id', deliveredOrderId)
    .single();

  console.log('✓ Verified Order Metadata in Supabase:', verifiedOrder?.metadata);
  if (
    verifiedOrder?.metadata?.payout_status !== 'DISBURSED' ||
    verifiedOrder?.metadata?.payout_reference !== disburseRes.reference
  ) {
    throw new Error('Order metadata payout audit failed to update');
  }
  console.log('✅ Audit receipt verified in Supabase order metadata!');

  // Cleanup test order
  await adminClient.from('orders').delete().eq('id', deliveredOrderId);
  console.log('✓ Cleaned up test delivered order');

  console.log('\n🎉 ALL PAYSTACK DIRECT RIDER PAYOUT CHECKS PASSED WITH 100% SUCCESS!\n');
}

run().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
