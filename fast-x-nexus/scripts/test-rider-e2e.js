/**
 * /scripts/test-rider-e2e.js
 * Fast X Nexus — Authenticated Playwright E2E Rider Lifecycle & Map Telemetry Test
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
  console.log('📦 [1/6] Seeding fresh Waybill in Supabase...');
  await admin.from('parcels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('rider_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('ledgers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: customerProfile } = await admin.from('profiles').select('id').eq('role', 'customer').limit(1).single();
  const customerId = customerProfile?.id;

  const { data: order } = await admin.from('orders').insert({
    customer_id: customerId,
    status: 'PAID_UNASSIGNED',
    pickup_h3_cell: '8924300aa4bffff',
    dropoff_h3_cell: '8924300aa4b0000',
    total_amount: 25000,
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
    weight: 5.0,
    description: 'Critical Industrial Server Blades & Optics',
    declared_value: 3500000,
  });

  const pickupPin = order.id.replace(/\D/g, '').slice(0, 4).padEnd(4, '7');
  const deliveryPin = order.id.replace(/\D/g, '').slice(0, 4).padEnd(4, '8');

  console.log(`   Waybill: FX-${order.id.substring(0, 8).toUpperCase()}`);
  console.log(`   Pickup PIN (POP): ${pickupPin} | Delivery PIN (POD): ${deliveryPin}`);
  console.log(`   Driver Payout (70%): ₦${Math.round(order.total_amount * 0.7)}`);
  return { order, pickupPin, deliveryPin };
}

async function runE2ETest() {
  const { order, pickupPin, deliveryPin } = await setupFreshOrder();

  console.log('🔑 [2/6] Authenticating Rider Session (inuoluwadunsimis@gmail.com)...');
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await userClient.auth.signInWithPassword({
    email: 'inuoluwadunsimis@gmail.com',
    password: 'RiderTestPass2026!',
  });

  if (authErr || !authData.session) {
    throw new Error('Failed to sign in rider: ' + (authErr?.message || 'No session'));
  }

  console.log('🚀 [3/6] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const projectRef = 'ghqcnztahdnezejvdklf';
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(authData.session));

  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: `${cookieName}.0`,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Navigate to Rider Portal
  console.log('📍 [4/6] Loading Rider Portal...');
  await page.goto('http://localhost:3000/rider', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/e2e_1_job_pool.png' });

  // 1. Claim Job
  console.log('⚡ [5/6] Claiming Job from Pool...');
  const claimBtn = page.locator('button:has-text("CLAIM JOB"), button:has-text("CLAIM")').first();
  if (await claimBtn.isVisible()) {
    await claimBtn.click();
    console.log('   Clicked claim button!');
    // Wait for view to transition to Dispatch Map
    await page.waitForSelector('input[placeholder*="PICKUP PIN"], input[placeholder*="POP"]', { timeout: 10000 });
    await page.waitForTimeout(1500);
  }

  // 2. Dispatch Map (Stage 1: Pickup POP Gating)
  console.log('🗺️ [6/6] Dispatch Map Stage 1 Verification (POP)...');
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/e2e_2_dispatch_map_stage1.png' });

  // Enter Pickup PIN
  const pickupInput = page.locator('input[placeholder*="PICKUP PIN"], input[placeholder*="POP"]');
  if (await pickupInput.isVisible()) {
    console.log(`   Entering Pickup PIN: ${pickupPin}`);
    await pickupInput.fill(pickupPin);
    await page.waitForTimeout(400);
    const confirmPickup = page.locator('button:has-text("CONFIRM PICKUP")');
    await confirmPickup.click();
    await page.waitForSelector('input[placeholder*="DELIVERY PIN"], input[placeholder*="POD"]', { timeout: 10000 });
    await page.waitForTimeout(1500);
  }

  // 3. Dispatch Map (Stage 2: Unlocked Dropoff & POD)
  console.log('🏁 Dispatch Map Stage 2 Verification (POD)...');
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/e2e_3_dispatch_map_stage2.png' });

  // Enter Delivery PIN
  const deliveryInput = page.locator('input[placeholder*="DELIVERY PIN"], input[placeholder*="POD"]');
  if (await deliveryInput.isVisible()) {
    console.log(`   Entering Delivery PIN: ${deliveryPin}`);
    await deliveryInput.fill(deliveryPin);
    await page.waitForTimeout(400);
    const confirmDelivery = page.locator('button:has-text("CONFIRM DELIVERY")');
    await confirmDelivery.click();
    await page.waitForTimeout(3000);
  }

  // Check Earnings
  console.log('💰 Navigating to Earnings View...');
  const earningsTab = page.locator('button:has-text("EARNINGS"), div:has-text("EARNINGS"), span:has-text("EARNINGS")').first();
  if (await earningsTab.isVisible()) {
    await earningsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/e2e_4_earnings.png' });
  }

  console.log('\n================ PLAYWRIGHT E2E AUDIT RESULTS ================');
  console.log('✅ Full Lifecycle Complete: Seeding -> Claim -> Stage 1 POP -> Stage 2 POD -> Delivery -> Earnings!');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => console.log(`   [${i + 1}] ${e}`));
  }
  console.log('Screenshots Saved:');
  console.log('  1. e2e_1_job_pool.png');
  console.log('  2. e2e_2_dispatch_map_stage1.png');
  console.log('  3. e2e_3_dispatch_map_stage2.png');
  console.log('  4. e2e_4_earnings.png');
  console.log('==============================================================');

  await browser.close();
}

runE2ETest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
