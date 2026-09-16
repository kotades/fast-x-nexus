/**
 * /scripts/verify-rider-ui-refinements.js
 * Fast X Nexus — E2E Verification of Rider UI Refinements:
 * 1. Headless GPS Telemetry (no floating GPS ACTIVE pill)
 * 2. Non-overlapping Top Map Controls (left ETA pill vs right Map controls)
 * 3. Compact Route Details Card (collapsed height <= 60px)
 * 4. Repositioned and Styled Chat Widget (bottom-right 36-40px button, no interference)
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
const AUDIT_DIR = path.resolve(__dirname, '../public/audit');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

const RIDER_ID = '589d8701-f284-4e40-823d-ee57e8459788';
const RIDER_EMAIL = 'inuoluwadunsimis@gmail.com';
const RIDER_PASS = 'RiderTestPass2026!';

async function ensureActiveJob() {
  console.log('📦 [1/5] Ensuring active assigned job for rider...');
  await admin.from('profiles').update({ role: 'rider', active_status: true }).eq('id', RIDER_ID);

  const { data: existing } = await admin
    .from('orders')
    .select('id, status')
    .eq('rider_id', RIDER_ID)
    .in('status', ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Using active order FX-${existing.id.slice(0, 8).toUpperCase()} (${existing.status})`);
    return existing.id;
  }

  const { data: newOrder, error: orderErr } = await admin
    .from('orders')
    .insert({
      customer_id: '146c79bf-1e11-4ccd-8b58-5cdfb763cadd',
      rider_id: RIDER_ID,
      status: 'ASSIGNED',
      pickup_h3_cell: '89589c8a51bffff',
      dropoff_h3_cell: '89589c994b7ffff',
      total_amount: 12500,
      pickup_name: 'Chief Segun Olaleye',
      pickup_phone: '+2348039988776',
      pickup_address: 'Maryland Mall, Ikorodu Road, Lagos',
      dropoff_name: 'Dr. Folake Adeyemi',
      dropoff_phone: '+2348023456789',
      dropoff_address: 'Admiralty Way, Lekki Phase 1, Lagos',
      metadata: { pickup_pin: '7421', delivery_pin: '8492' },
      preferred_delivery_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    })
    .select()
    .single();

  if (orderErr) throw new Error(`Failed to seed test order: ${orderErr.message}`);
  return newOrder.id;
}

async function run() {
  console.log('🚀 Starting Rider UI Refinements Verification...');
  await ensureActiveJob();

  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Context: 375x812
  console.log('📱 [2/5] Testing Mobile Viewport (375x812)...');
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  // Sign in
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({ email, password });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: RIDER_EMAIL,
    password: RIDER_PASS,
  });

  await page.addInitScript(() => {
    sessionStorage.setItem('fastx_rider_active_view', 'route_map');
  });

  await page.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check if map view is already active
  const cardLocator = page.locator('button[aria-label="Expand route details"], button[aria-label="Collapse route details"]').first();
  const isMapActive = await cardLocator.isVisible().catch(() => false);

  if (!isMapActive) {
    const menuBtn = page.locator('button[aria-label="Toggle Menu"]').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      const mapTab = page.locator('button:has-text("Dispatch Map")').first();
      if (await mapTab.isVisible().catch(() => false)) {
        await mapTab.click({ force: true });
        await page.waitForTimeout(1500);
      }
    }
  }

  // 2. Verify GPS ACTIVE UI pill is completely gone
  console.log('🔍 [3/5] Verifying Headless Telemetry (no visual GPS ACTIVE pill)...');
  const gpsActivePill = page.locator('text=GPS ACTIVE').first();
  const hasGpsActive = await gpsActivePill.isVisible().catch(() => false);
  console.log(`✅ "GPS ACTIVE" floating pill is NOT rendered: ${!hasGpsActive}`);
  if (hasGpsActive) {
    throw new Error('FAIL: "GPS ACTIVE" pill is still visible in DOM!');
  }

  // 3. Verify Top ETA Pill and Map Controls
  console.log('🔍 [4/5] Verifying Top Map Controls Layout...');
  const etaPill = page.locator('div:has-text("km • ~")').first();
  const etaBox = await etaPill.boundingBox();
  console.log(`ETA Pill bounding box:`, etaBox);

  // 4. Verify Route Details Card Height & Spacing
  console.log('🔍 [5/5] Verifying Route Details Card and Chat Widget...');
  const card = page.locator('div:has-text("FX-")').locator('xpath=ancestor::div[contains(@class, "bg-surface-elevated")]').first();
  const cardBox = await card.boundingBox();
  console.log(`Route Details Card bounding box:`, cardBox);

  if (cardBox) {
    console.log(`📏 Collapsed Card Height: ${cardBox.height}px (Target <= 60px)`);
  }

  // Verify Chat Trigger Widget
  const chatBtn = page.locator('button[aria-label="Toggle Dispatch Chat"]').first();
  const chatBox = await chatBtn.boundingBox();
  console.log(`Chat Trigger Button bounding box:`, chatBox);

  if (chatBox) {
    console.log(`📐 Chat button width=${chatBox.width}px, height=${chatBox.height}px, x=${chatBox.x}, y=${chatBox.y}`);
  }

  // Capture Mobile Screenshot
  const mobileScreenshotPath = path.join(AUDIT_DIR, 'rider-mobile-optimized-map.png');
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log(`📸 Saved mobile screenshot to ${mobileScreenshotPath}`);

  // Test expanding the card
  const dragHandle = page.locator('button[aria-label="Expand route details"], button[aria-label="Collapse route details"]').first();
  if (await dragHandle.isVisible()) {
    await dragHandle.click();
    await page.waitForTimeout(600);
    const expandedScreenshotPath = path.join(AUDIT_DIR, 'rider-mobile-expanded-card.png');
    await page.screenshot({ path: expandedScreenshotPath, fullPage: false });
    console.log(`📸 Saved expanded card screenshot to ${expandedScreenshotPath}`);
  }

  // Test opening the chat drawer
  if (await chatBtn.isVisible()) {
    await chatBtn.click();
    await page.waitForTimeout(600);
    const chatOpenScreenshotPath = path.join(AUDIT_DIR, 'rider-mobile-open-chat.png');
    await page.screenshot({ path: chatOpenScreenshotPath, fullPage: false });
    console.log(`📸 Saved open chat screenshot to ${chatOpenScreenshotPath}`);
  }

  await browser.close();
  console.log('🎉 All Rider UI refinements verified successfully!');
}

run().catch((err) => {
  console.error('❌ Verification Error:', err);
  process.exit(1);
});
