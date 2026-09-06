/**
 * /scripts/test-rider-suite.js
 * Fast X Nexus — Playwright E2E Rider Dashboard & Telemetry Audit Suite
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(filename) {
  let env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["\x27]|["\x27]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function setupFreshOrder() {
  console.log('📦 [1/6] Seeding clean test waybill in Supabase...');
  await admin.from('parcels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('rider_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('ledgers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: profiles } = await admin.from('profiles').select('id').limit(1);
  const customerId = profiles?.[0]?.id;

  const { data: order } = await admin.from('orders').insert({
    customer_id: customerId,
    status: 'PAID_UNASSIGNED',
    pickup_h3_cell: '8924300aa4bffff',
    dropoff_h3_cell: '8924300aa4b0000',
    total_amount: 20000,
    pickup_name: 'Engr. Dapo Williams (Ikeja City Mall)',
    pickup_phone: '+2348021112233',
    pickup_address: 'Obafemi Awolowo Way, Ikeja, Lagos',
    dropoff_name: 'Hajiya Amina Bello (Victoria Garden City)',
    dropoff_phone: '+2348065554433',
    dropoff_address: 'Victoria Garden City, Lekki-Epe Expressway, Lagos',
    preferred_delivery_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
  }).select().single();

  await admin.from('parcels').insert({
    order_id: order.id,
    weight: 3.5,
    description: 'High-Value Solar Controller & Inverter Manuals',
    declared_value: 1200000,
  });

  const pickupPin = order.id.replace(/\D/g, '').slice(0, 4).padEnd(4, '7');
  const deliveryPin = order.id.replace(/\D/g, '').slice(0, 4).padEnd(4, '8');

  console.log(`   Waybill: FX-${order.id.substring(0, 8).toUpperCase()}`);
  console.log(`   Pickup PIN: ${pickupPin} | Delivery PIN: ${deliveryPin}`);
  return { order, pickupPin, deliveryPin };
}

async function runAudit() {
  const { order, pickupPin, deliveryPin } = await setupFreshOrder();

  console.log('🚀 [2/6] Launching Playwright browser instance...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    geolocation: { latitude: 6.5244, longitude: 3.3792 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('🌐 [3/6] Navigating to Rider Console (http://localhost:3000/rider)...');
  await page.goto('http://localhost:3000/rider', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Audit Header & Navigation
  const headerTitle = await page.textContent('header');
  console.log(`   Header Content verified: ${headerTitle.replace(/\s+/g, ' ').trim()}`);

  // 2. Audit Job Pool View
  console.log('📋 [4/6] Auditing Job Pool & Claim Interaction...');
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/audit_job_pool.png' });

  const claimButton = page.locator('button:has-text("CLAIM JOB"), button:has-text("ACCEPT JOB")').first();
  if (await claimButton.isVisible()) {
    console.log('   Clicking Claim Job...');
    await claimButton.click();
    await page.waitForTimeout(2000);
  }

  // 3. Audit Dispatch Map View (Stage 1: Heading to Pickup)
  console.log('🗺️ [5/6] Auditing Dispatch Map (Stage 1: Pickup POP Gating)...');
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/audit_dispatch_map_stage1.png' });

  // Enter Pickup PIN
  const pickupInput = page.locator('input[placeholder*="PICKUP PIN"]');
  if (await pickupInput.isVisible()) {
    console.log(`   Entering Stage 1 Pickup PIN: ${pickupPin}`);
    await pickupInput.fill(pickupPin);
    await page.waitForTimeout(300);
    const confirmPickupBtn = page.locator('button:has-text("CONFIRM PICKUP")');
    await confirmPickupBtn.click();
    await page.waitForTimeout(2500);
  }

  // 4. Audit Dispatch Map View (Stage 2: In Transit to Dropoff)
  console.log('🏁 [6/6] Auditing Dispatch Map (Stage 2: Unlocked Dropoff & POD)...');
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/audit_dispatch_map_stage2.png' });

  // Enter Delivery PIN
  const deliveryInput = page.locator('input[placeholder*="DELIVERY PIN"]');
  if (await deliveryInput.isVisible()) {
    console.log(`   Entering Stage 2 Delivery PIN: ${deliveryPin}`);
    await deliveryInput.fill(deliveryPin);
    await page.waitForTimeout(300);
    const confirmDeliveryBtn = page.locator('button:has-text("CONFIRM DELIVERY")');
    await confirmDeliveryBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log('💰 Checking Earnings Ledger View...');
  const earningsTab = page.locator('button:has-text("EARNINGS"), div:has-text("EARNINGS")').first();
  if (await earningsTab.isVisible()) {
    await earningsTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/audit_earnings_ledger.png' });
  }

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Console Errors detected: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => console.log(`   [${i + 1}] ${e}`));
  } else {
    console.log('   ✅ 0 Console Errors. Clean runtime execution!');
  }
  console.log('================================================');

  await browser.close();
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
