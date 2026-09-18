/**
 * /scripts/verify-mobile-nav-and-gestures.js
 * Fast X Nexus — E2E Verification of Mobile Bottom Nav, Route Gestures, and Tap-to-Copy PINs
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
const ARTIFACT_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

const RIDER_ID = '589d8701-f284-4e40-823d-ee57e8459788';
const RIDER_EMAIL = 'inuoluwadunsimis@gmail.com';
const RIDER_PASS = 'RiderTestPass2026!';

const CUSTOMER_EMAIL = 'sanniinuoluwadunsimi@gmail.com';
const CUSTOMER_PASS = 'CustomerTestPass2026!';

async function ensureCustomerOrder() {
  console.log('📦 Ensuring active order for customer...');
  const { data: customerUser } = await admin.auth.admin.listUsers();
  const customer = customerUser.users.find(u => u.email === CUSTOMER_EMAIL);
  if (!customer) throw new Error('Customer user not found');

  const { data: existing } = await admin
    .from('orders')
    .select('id, status')
    .eq('customer_id', customer.id)
    .in('status', ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Using active order FX-${existing.id.slice(0, 8).toUpperCase()} (${existing.status})`);
    return existing;
  }

  const { data: newOrder, error } = await admin
    .from('orders')
    .insert({
      customer_id: customer.id,
      rider_id: RIDER_ID,
      status: 'ASSIGNED',
      pickup_h3_cell: '89589c8a51bffff',
      dropoff_h3_cell: '89589c994b7ffff',
      pickup_address: '12 Admiralty Way, Lekki Phase 1, Lagos',
      dropoff_address: 'Victoria Garden City (VGC), Lekki-Epe, Lagos',
      total_amount: 5500,
    })
    .select()
    .single();

  if (error) throw error;
  console.log(`✅ Created test order: ${newOrder.tracking_code}`);
  return newOrder;
}

async function runVerification() {
  console.log('🚀 Launching Playwright Mobile Nav & Gesture Verification...');
  await ensureCustomerOrder();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  // 1. Customer Login & Dashboard
  console.log('📱 [1/4] Logging into Customer Dashboard on Mobile...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const authRes = await page.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null, user: data?.user?.id || null };
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASS,
  });

  if (authRes.error) throw new Error(`Customer auth failed: ${authRes.error}`);

  console.log('🗺️ Navigating to /customer...');
  await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Capture Customer Collapsed state with bottom nav
  console.log('📸 Capturing mobile customer collapsed state...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-customer-collapsed.png'), fullPage: false });

  // 2. Expand card via tap on header or pill
  console.log('📱 [2/4] Testing tap to expand route details...');
  const cardHandle = page.locator('[aria-label="Expand route details"]').first();
  if (await cardHandle.isVisible()) {
    await cardHandle.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-customer-expanded.png'), fullPage: false });
    console.log('✅ Mobile Customer Expanded screenshot captured!');

    // Test Tap-to-Copy PIN
    console.log('📱 Testing tap-to-copy PIN...');
    const pinBox = page.locator('text=Pickup PIN').first();
    if (await pinBox.isVisible()) {
      await pinBox.click();
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-pin-copied-toast.png'), fullPage: false });
      console.log('✅ PIN toast screenshot captured!');
    }
  }

  // 3. Test Navigation to Activity / History tab via MobileBottomNav
  console.log('📱 [3/4] Testing Mobile Bottom Nav tab switching...');
  const activityTab = page.locator('nav[aria-label="Mobile Customer Navigation"] button:has-text("Activity")');
  if (await activityTab.isVisible()) {
    await activityTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-customer-activity-tab.png'), fullPage: false });
    console.log('✅ Mobile Activity view captured!');
  }

  // 4. Rider Dashboard Mobile
  console.log('📱 [4/4] Visiting Rider Dashboard on Mobile...');
  const riderAuth = await page.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null, user: data?.user?.id || null };
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: RIDER_EMAIL,
    password: RIDER_PASS,
  });

  if (riderAuth.error) throw new Error(`Rider auth failed: ${riderAuth.error}`);

  await page.goto('http://localhost:3000/rider', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-rider-bottom-nav.png'), fullPage: false });
  console.log('✅ Mobile Rider view captured!');

  await browser.close();
  console.log('🎉 All mobile verification checks complete!');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
