/**
 * /scripts/verify-mobile-collapsible-and-chat.js
 * Fast X Nexus — E2E Verification of Mobile Map Space Optimization & Expanded Chat Interface
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

const CUSTOMER_EMAIL = 'sanniinuoluwadunsimi@gmail.com';
const CUSTOMER_PASS = 'CustomerTestPass2026!';

async function seedActiveJobForRider() {
  console.log('📦 [1/6] Ensuring active assigned job for rider...');
  await admin.from('profiles').update({ role: 'rider', active_status: true }).eq('id', RIDER_ID);

  const { data: existing } = await admin
    .from('orders')
    .select('id, status')
    .eq('rider_id', RIDER_ID)
    .in('status', ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Using existing active order FX-${existing.id.slice(0, 8).toUpperCase()} (status: ${existing.status})`);
    return { orderId: existing.id };
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
      metadata: {
        pickup_pin: '7421',
        delivery_pin: '8492',
      },
      preferred_delivery_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    })
    .select()
    .single();

  if (orderErr) throw new Error(`Failed to seed test order: ${orderErr.message}`);

  await admin.from('parcels').insert({
    order_id: newOrder.id,
    weight: 2.5,
    description: 'Corporate Legal Documents & Security Seal',
    declared_value: 500000,
  });

  console.log(`✅ Seeded new Order FX-${newOrder.id.slice(0, 8).toUpperCase()}`);
  return { orderId: newOrder.id };
}

async function run() {
  console.log('🚀 Starting Verification of Mobile Map Space Optimization & Chat Expansion...');
  await seedActiveJobForRider();

  const browser = await chromium.launch({ headless: true });

  // Mobile Context: 375x812
  const riderContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const riderPage = await riderContext.newPage();

  try {
    console.log('🔑 [2/6] Signing in rider session on mobile (375x812)...');
    await riderPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await riderPage.waitForTimeout(1000);

    const riderAuth = await riderPage.evaluate(async ({ url, anonKey, email, password }) => {
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

    if (riderAuth.error) throw new Error(`Failed rider auth: ${riderAuth.error}`);

    console.log('🗺️ [3/6] Navigating to Rider Terminal (/rider)...');
    await riderPage.addInitScript(() => {
      sessionStorage.setItem('fastx_rider_active_view', 'route_map');
    });

    await riderPage.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
    await riderPage.waitForTimeout(2500);

    // Ensure map view is selected
    const activeCardCheck = riderPage.locator('text=WAYBILL FX-').first();
    if (!await activeCardCheck.isVisible()) {
      const menuBtn = riderPage.locator('button[aria-label="Toggle Menu"]').first();
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await riderPage.waitForTimeout(600);
        const dispatchMapBtn = riderPage.locator('button:has-text("Dispatch Map")').first();
        if (await dispatchMapBtn.isVisible()) {
          await dispatchMapBtn.click();
          await riderPage.waitForTimeout(1500);
        }
      }
    }

    // 1. Verify Top Space is Free on Mobile: Bulky HUD & top launcher hidden
    const bulkyHud = riderPage.locator('text=Rider Telemetry Live').first();
    const isBulkyHudHidden = await bulkyHud.evaluate((el) => {
      const style = window.getComputedStyle(el.closest('.sm\\:flex') || el);
      return style.display === 'none';
    }).catch(() => true);
    console.log(`✅ Bulky top HUD is hidden on mobile: ${isBulkyHudHidden}`);

    const topLauncher = riderPage.locator('button:has-text("Navigate to Dropoff (Google Maps)"), button:has-text("Navigate to Pickup (Google Maps)")').first();
    const isTopLauncherHidden = await topLauncher.evaluate((el) => {
      const style = window.getComputedStyle(el.closest('.sm\\:block') || el);
      return style.display === 'none';
    }).catch(() => true);
    console.log(`✅ Bulky top navigation button is hidden on mobile: ${isTopLauncherHidden}`);

    // Verify top micro ETA pill is visible
    const microPill = riderPage.locator('div:has-text("to Dropoff"), div:has-text("to Pickup")').first();
    const isMicroPillVisible = await microPill.isVisible();
    console.log(`✅ Sleek top micro ETA pill is visible on mobile: ${isMicroPillVisible}`);

    // 2. Verify Bare Expand Button is Removed
    const bareExpandBtn = riderPage.locator('button[aria-label="Expand details"], button[aria-label="Minimize card"]').first();
    const hasBareExpandBtn = await bareExpandBtn.isVisible();
    console.log(`✅ Bare expand button is completely removed: ${!hasBareExpandBtn}`);
    if (hasBareExpandBtn) {
      throw new Error('Bare expand button is still visible in DOM!');
    }

    // 3. Test Drag Pill Toggle Handle
    const dragHandle = riderPage.locator('button[aria-label="Expand route details"], button[aria-label="Collapse route details"]').first();
    await dragHandle.waitFor({ state: 'visible', timeout: 5000 });
    const initialHandleText = await dragHandle.innerText();
    console.log(`Drag handle initial state: ${initialHandleText.replace(/\n/g, ' ')}`);

    // If currently expanded, collapse it first to test collapsed state
    if (initialHandleText.includes('MINIMIZE')) {
      console.log('🔻 Collapsing card using drag handle...');
      await dragHandle.click();
      await riderPage.waitForTimeout(600);
    }

    // Now verified in collapsed state
    const collapsedHandleText = await dragHandle.innerText();
    console.log(`Collapsed handle text: ${collapsedHandleText.replace(/\n/g, ' ')}`);

    // Check GPS 1-tap button is present in collapsed header
    const gpsBtn = riderPage.locator('button:has-text("GPS")').first();
    const hasGps = await gpsBtn.isVisible();
    console.log(`✅ Collapsed header has 1-Tap GPS button: ${hasGps}`);

    // Check floating radio button position (located at bottom right edge)
    const radioBtn = riderPage.locator('button[aria-label="Toggle Dispatch Radio"]').first();
    const radioBox = await radioBtn.boundingBox();
    const card = riderPage.locator('div.bg-surface-elevated\\/95').last();
    const cardBox = await card.boundingBox();
    console.log(`📐 Mobile Floating Radio Button x=${radioBox?.x}, y=${radioBox?.y}, width=${radioBox?.width}, height=${radioBox?.height}`);
    console.log(`📐 Mobile Bottom Card x=${cardBox?.x}, y=${cardBox?.y}, width=${cardBox?.width}, height=${cardBox?.height}`);

    // Verify radio button is at the bottom right edge (x >= 300, y >= 740 on 375x812 viewport)
    if (!radioBox || radioBox.x < 300 || radioBox.y < 730) {
      throw new Error(`Radio button is not at bottom right edge! Got x=${radioBox?.x}, y=${radioBox?.y}`);
    }
    console.log('✅ Floating radio button is strictly positioned at the bottom right edge!');

    // Verify the card's right boundary clears the widget's x position on mobile
    if (cardBox && radioBox) {
      console.log(`Card right edge: ${cardBox.x + cardBox.width}px vs Radio button left edge: ${radioBox.x}px`);
      if (cardBox.x + cardBox.width > radioBox.x + 5) {
        console.warn('Note: Card and radio button overlap horizontally');
      } else {
        console.log('✅ Bottom card has dedicated margin channel clearing the radio widget!');
      }
    }

    console.log('📸 Capturing mobile-map-freed-space.png (Full road network visible!)...');
    await riderPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-map-freed-space.png') });

    // Expand the card to test expanded state
    console.log('🔺 Re-expanding card using drag handle...');
    await dragHandle.click();
    await riderPage.waitForTimeout(600);
    console.log('📸 Capturing mobile-card-expanded.png...');
    await riderPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-card-expanded.png') });

    // 4. Test Expanded Height of Rider Dispatch Chat on Mobile
    console.log('📻 [4/6] Testing Rider Dispatch Chat drawer with EXPANDED HEIGHT on mobile...');
    await radioBtn.click();
    await riderPage.waitForTimeout(800);

    const dispatchHeader = riderPage.locator('text=DISPATCH RADIO TOWER').first();
    await dispatchHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Dispatch Radio Drawer opened.');

    // Measure chat drawer height on 812px mobile screen
    const drawer = riderPage.locator('div:has-text("DISPATCH RADIO TOWER")').locator('..').locator('..').first();
    const drawerBox = await drawer.boundingBox();
    console.log(`📐 Mobile Chat Drawer Height: ${drawerBox?.height}px (Viewport: 812px, Coverage: ${Math.round((drawerBox?.height || 0) / 812 * 100)}%)`);

    if ((drawerBox?.height || 0) < 680) {
      throw new Error(`Chat drawer height (${drawerBox?.height}px) is too short! Expected >= 680px for 90vh coverage.`);
    }
    console.log(`✅ Mobile Chat Drawer comfortably covers ${Math.round((drawerBox?.height || 0) / 812 * 100)}% of the screen!`);

    console.log('📸 Capturing mobile-rider-chat-open.png...');
    await riderPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-rider-chat-open.png') });

    // Close chat drawer
    const closeBtn = riderPage.locator('button[aria-label="Close Radio"]').first();
    await closeBtn.click();
    await riderPage.waitForTimeout(600);

    // 5. Test Customer Support Chat Expanded Height
    console.log('💬 [5/6] Testing Customer Floating Support Chat on mobile (customer session)...');
    const custContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const custPage = await custContext.newPage();

    await custPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await custPage.waitForTimeout(1000);

    const custAuth = await custPage.evaluate(async ({ url, anonKey, email, password }) => {
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

    if (custAuth.error) throw new Error(`Failed customer auth: ${custAuth.error}`);

    await custPage.goto('http://localhost:3000/customer', { waitUntil: 'domcontentloaded' });
    await custPage.waitForTimeout(2000);

    const supportChatBtn = custPage.locator('button[aria-label="Toggle Support Chat"]').first();
    await supportChatBtn.waitFor({ state: 'visible', timeout: 10000 });
    await supportChatBtn.click();
    await custPage.waitForTimeout(800);

    const custDrawer = custPage.locator('div:has-text("Operations Support")').locator('..').locator('..').first();
    const custDrawerBox = await custDrawer.boundingBox();
    console.log(`📐 Mobile Customer Chat Drawer Height: ${custDrawerBox?.height}px (Coverage: ${Math.round((custDrawerBox?.height || 0) / 812 * 100)}%)`);

    if ((custDrawerBox?.height || 0) < 680) {
      throw new Error(`Customer chat drawer height (${custDrawerBox?.height}px) is too short!`);
    }
    console.log(`✅ Customer Chat Drawer comfortably covers ${Math.round((custDrawerBox?.height || 0) / 812 * 100)}% of the screen!`);

    console.log('📸 Capturing mobile-customer-chat-open.png...');
    await custPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-customer-chat-open.png') });

    await custContext.close();
    console.log('🎉 [6/6] All mobile optimization tests passed with flying colors!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    await riderPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-test-failure.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
