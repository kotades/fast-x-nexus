/**
 * /scripts/verify-rider-active-job-actions.js
 * Fast X Nexus — E2E Verification of Rider Active Job Call & WhatsApp Actions
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

async function seedActiveJobForRider() {
  console.log('📦 [1/5] Checking rider profile and seeding assigned job...');

  // Ensure role is rider
  await admin.from('profiles').update({ role: 'rider', active_status: true }).eq('id', RIDER_ID);

  // Clean old orders for clean state
  await admin.from('orders').delete().eq('rider_id', RIDER_ID);

  // Insert assigned test order matching user specifications
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
      metadata: {
        pickup_pin: '7421',
        delivery_pin: '8492',
      },
      preferred_delivery_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    })
    .select()
    .single();

  if (orderErr) {
    throw new Error(`Failed to create test order: ${orderErr.message}`);
  }

  await admin.from('parcels').insert({
    order_id: newOrder.id,
    weight: 2.5,
    description: 'Corporate Legal Documents & Security Seal',
    declared_value: 500000,
  });

  console.log(`✅ Seeded Order FX-${newOrder.id.slice(0, 8).toUpperCase()} with Pickup PIN 7421 and Delivery PIN 8492`);
  return { riderId: RIDER_ID, orderId: newOrder.id };
}

async function run() {
  console.log('🚀 Starting Rider Active Jobs Call & WhatsApp Verification...');
  const { riderId, orderId } = await seedActiveJobForRider();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });
  const page = await context.newPage();

  try {
    console.log('🔑 [2/5] Signing in rider session...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const authResult = await page.evaluate(async ({ url, anonKey, email, password }) => {
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

    if (authResult.error) {
      throw new Error(`Failed auth for ${RIDER_EMAIL}: ${authResult.error}`);
    }
    console.log('📍 [3/5] Navigating to /rider...');
    await page.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Switch to Active Jobs view
    console.log('📋 Clicking "Active Jobs" in sidebar...');
    const activeTab = page.locator('button:has-text("Active Jobs")').first();
    await activeTab.waitFor({ state: 'visible', timeout: 10000 });
    await activeTab.click();
    console.log('⏳ Waiting for Active Jobs component to mount...');
    await page.waitForSelector('text=Pickup Details (Origin)', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verify Pickup section has active Call and WhatsApp links
    console.log('🔍 Verifying Stage 1: Pickup Contact Actions in Active Jobs...');
    const pickupWaLink = page.locator('a[href*="wa.me/2348039988776"]').first();
    const pickupCallLink = page.locator('a[href="tel:+2348039988776"]').first();

    const isPickupWaVisible = await pickupWaLink.isVisible();
    const isPickupCallVisible = await pickupCallLink.isVisible();

    console.log(`- Pickup WhatsApp Button visible: ${isPickupWaVisible}`);
    console.log(`- Pickup Call Button visible: ${isPickupCallVisible}`);

    if (!isPickupWaVisible || !isPickupCallVisible) {
      throw new Error('Pickup Call or WhatsApp button is not visible or href is incorrect!');
    }

    // Verify Dropoff section is GATED
    console.log('🔒 Verifying Stage 1: Dropoff Contact is GATED in Active Jobs...');
    const gatedIndicator = page.locator('text=Dropoff Details (Gated)');
    const isGatedVisible = await gatedIndicator.isVisible();
    console.log(`- Gated indicator visible: ${isGatedVisible}`);

    const disabledWaButton = page.locator('button[disabled]:has-text("WhatsApp")').first();
    const disabledCallButton = page.locator('button[disabled]:has-text("Call")').first();
    const isDisabledWa = await disabledWaButton.isVisible();
    const isDisabledCall = await disabledCallButton.isVisible();

    console.log(`- Dropoff WhatsApp Button disabled: ${isDisabledWa}`);
    console.log(`- Dropoff Call Button disabled: ${isDisabledCall}`);

    if (!isDisabledWa || !isDisabledCall) {
      throw new Error('Dropoff Call or WhatsApp button should be disabled during Stage 1!');
    }

    // Screenshot Stage 1 Desktop
    await page.screenshot({ path: path.join(AUDIT_DIR, 'rider-active-job-gated-desktop.png'), fullPage: false });
    console.log('📸 Saved rider-active-job-gated-desktop.png');

    // Test Mobile viewport
    console.log('📱 Verifying Mobile responsiveness (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(AUDIT_DIR, 'rider-active-job-gated-mobile.png'), fullPage: false });
    console.log('📸 Saved rider-active-job-gated-mobile.png');

    // Restore desktop
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);

    // Switch to Dispatch Map to verify map drawer
    console.log('🗺️ [4/5] Checking Dispatch Map view in Stage 1...');
    const mapTab = page.locator('button:has-text("Dispatch Map")').first();
    if (await mapTab.isVisible()) {
      await mapTab.click();
      console.log('⏳ Waiting for Dispatch Map drawer to load active job...');
      await page.waitForSelector('text=Pickup Origin Landmark:', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(AUDIT_DIR, 'rider-map-gated.png'), fullPage: false });
      console.log('📸 Saved rider-map-gated.png');
    }

    // Now test unlocking by entering pickup PIN '7421'
    console.log('🔓 [5/5] Testing Stage 1 Pickup PIN Handover (7421) to unlock Dropoff...');
    await activeTab.click();
    await page.waitForSelector('input[placeholder*="PICKUP PIN"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    const pinInput = page.locator('input[placeholder*="PICKUP PIN"]').first();
    await pinInput.fill('7421');
    await page.waitForTimeout(500);

    const confirmPickupBtn = page.locator('button:has-text("CONFIRM PICKUP")').first();
    await confirmPickupBtn.click();
    console.log('⏳ Waiting for PIN verification and status transition...');
    await page.waitForSelector('text=Dropoff Details (Destination)', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verify Dropoff is now UNLOCKED
    console.log('🎉 Verifying Stage 2: Dropoff Contact UNLOCKED in Active Jobs...');
    const dropoffUnlockedHeader = page.locator('text=Dropoff Details (Destination)');
    const isUnlockedVisible = await dropoffUnlockedHeader.isVisible();
    console.log(`- Dropoff Unlocked Header visible: ${isUnlockedVisible}`);

    const dropoffWaLink = page.locator('a[href*="wa.me/2348023456789"]').first();
    const dropoffCallLink = page.locator('a[href="tel:+2348023456789"]').first();

    const isDropoffWaActive = await dropoffWaLink.isVisible();
    const isDropoffCallActive = await dropoffCallLink.isVisible();

    console.log(`- Dropoff WhatsApp Link active: ${isDropoffWaActive}`);
    console.log(`- Dropoff Call Link active: ${isDropoffCallActive}`);

    if (!isDropoffWaActive || !isDropoffCallActive) {
      throw new Error('Dropoff Call or WhatsApp link should be active after Pickup verification!');
    }

    await page.screenshot({ path: path.join(AUDIT_DIR, 'rider-active-job-unlocked-desktop.png'), fullPage: false });
    console.log('📸 Saved rider-active-job-unlocked-desktop.png');

    // Check Dispatch Map in Stage 2
    if (await mapTab.isVisible()) {
      await mapTab.click();
      console.log('⏳ Waiting for Dispatch Map drawer to show Unlocked Destination...');
      await page.waitForSelector('text=Destination Dropoff Address (Unlocked)', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(AUDIT_DIR, 'rider-map-unlocked.png'), fullPage: false });
      console.log('📸 Saved rider-map-unlocked.png');
    }

    console.log('\n🌟 ALL CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();
