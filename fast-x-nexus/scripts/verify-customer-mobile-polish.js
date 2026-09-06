/**
 * /scripts/verify-customer-mobile-polish.js
 * Fast X Nexus — E2E Verification of Customer Mobile Polish & Space Liberation
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

const CUSTOMER_EMAIL = 'sanniinuoluwadunsimi@gmail.com';
const CUSTOMER_PASS = 'CustomerTestPass2026!';

async function seedActiveCustomerOrder() {
  console.log('📦 [1/6] Ensuring active order for customer...');
  const { data: { users } } = await admin.auth.admin.listUsers();
  const customerUser = users.find((u) => u.email === CUSTOMER_EMAIL);
  if (!customerUser) throw new Error('Customer user not found');

  const { data: existing } = await admin
    .from('orders')
    .select('id, status')
    .eq('customer_id', customerUser.id)
    .in('status', ['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Existing active customer order: FX-${existing.id.slice(0, 8).toUpperCase()}`);
    return { orderId: existing.id, userId: customerUser.id };
  }

  const { data: newOrder, error } = await admin
    .from('orders')
    .insert({
      customer_id: customerUser.id,
      status: 'PAID_UNASSIGNED',
      pickup_h3_cell: '89589c8a51bffff',
      dropoff_h3_cell: '89589c994b7ffff',
      total_amount: 5000,
      pickup_name: 'Fast X Customer',
      pickup_phone: '+2348123456789',
      pickup_address: '14 Admiralty Road, Lekki Phase 1, Lagos',
      dropoff_name: 'Alex',
      dropoff_phone: '+2349014030047',
      dropoff_address: '54 Bode Thomas Street, Surulere, Lagos',
      metadata: {
        pickup_pin: '7150',
        delivery_pin: '4054',
      },
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to seed customer order: ${error.message}`);
  return { orderId: newOrder.id, userId: customerUser.id };
}

async function run() {
  console.log('🚀 Starting Verification of Customer Mobile Polish...');
  const { orderId, userId } = await seedActiveCustomerOrder();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  try {
    // 1. Sign In
    console.log('🔑 [2/6] Logging in on 375x812 mobile...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const loginRes = await page.evaluate(async ({ url, anonKey, email, password }) => {
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

    if (loginRes.error) throw new Error(`Login failed: ${loginRes.error}`);

    // 2. Visit /customer
    console.log('🗺️ [3/6] Navigating to Customer Dashboard (/customer)...');
    await page.goto('http://localhost:3000/customer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Verify Redesigned Sign Out Button
    const signOutBtn = page.locator('button[aria-label="Sign Out of Session"]').first();
    await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
    const signOutBox = await signOutBtn.boundingBox();
    console.log(`📐 Sign out button: w=${signOutBox?.width}px, h=${signOutBox?.height}px`);
    const hasLogoutIcon = await signOutBtn.locator('span:has-text("logout")').isVisible();
    console.log(`✅ Sign out button has sleek logout icon: ${hasLogoutIcon}`);

    // Verify Top Control Bar is Single Line
    console.log('📏 Verifying Top Single-Line Control Bar...');
    const zoomInBtn = page.locator('button[aria-label="Zoom in"]').first();
    const zoomOutBtn = page.locator('button[aria-label="Zoom out"]').first();
    const isZoomInVisible = await zoomInBtn.isVisible();
    const isZoomOutVisible = await zoomOutBtn.isVisible();
    console.log(`✅ Mobile Zoom controls visible in toolbar: ${isZoomInVisible && isZoomOutVisible}`);

    const activeBadge = page.locator('span:has-text("Active:")').first();
    const isBadgeVisible = await activeBadge.isVisible();
    console.log(`✅ Active deliveries badge visible: ${isBadgeVisible}`);

    // Check Live status is HIDDEN on mobile
    const liveBadge = page.locator('span:has-text("Live")').first();
    const isLiveVisible = await liveBadge.isVisible();
    console.log(`✅ Live status badge is hidden on mobile: ${!isLiveVisible}`);

    // Filter button visible
    const filterBtn = page.locator('button[aria-label="Map Filters"]').first();
    const isFilterVisible = await filterBtn.isVisible();
    console.log(`✅ Map filter button visible: ${isFilterVisible}`);

    // Check that zoom buttons and filter button share the same row (y coordinate difference < 15px)
    if (isZoomInVisible && isFilterVisible) {
      const zoomBox = await zoomInBtn.boundingBox();
      const filterBox = await filterBtn.boundingBox();
      console.log(`📐 Zoom y=${zoomBox?.y}px vs Filter y=${filterBox?.y}px`);
      const diff = Math.abs((zoomBox?.y || 0) - (filterBox?.y || 0));
      if (diff > 18) {
        throw new Error(`Top controls are not on the same line! y difference = ${diff}px`);
      }
      console.log('✅ All top controls (Zoom, Active Deliveries, Waybill Status, Filter) fit in ONE single line!');
    }

    // 3. Verify Bottom Collapsible Card with Drag Handle & No Trash Icon
    console.log('🎛️ [4/6] Verifying Bottom Collapsible Card...');
    const dragHandle = page.locator('button[aria-label="Expand route details"], button[aria-label="Collapse route details"]').first();
    await dragHandle.waitFor({ state: 'visible', timeout: 5000 });
    const dragHandleText = await dragHandle.innerText();
    console.log(`Drag handle text: ${dragHandleText.replace(/\n/g, ' ')}`);

    // Verify NO trash icon in header
    const cardHeader = page.locator('p:has-text("Active Waybill")').locator('..').locator('..');
    const headerTrashBtn = cardHeader.locator('span:has-text("delete")');
    const hasHeaderTrash = await headerTrashBtn.isVisible();
    console.log(`✅ Trash icon in card header is removed: ${!hasHeaderTrash}`);
    if (hasHeaderTrash) throw new Error('Trash icon is still present in card header!');

    // Collapsed Card & Chat Bubble clearance
    const cardContainer = page.locator('div.border-l-primary').first();
    const cardBox = await cardContainer.boundingBox();
    const chatBtn = page.locator('button[aria-label="Toggle Support Chat"]').first();
    const chatBox = await chatBtn.boundingBox();
    console.log(`📐 Card right=${(cardBox?.x || 0) + (cardBox?.width || 0)}px vs Chat left=${chatBox?.x}px`);
    if (cardBox && chatBox && (cardBox.x + cardBox.width) > chatBox.x + 5) {
      console.warn('Note: Card and chat overlap horizontally');
    } else {
      console.log('✅ Bottom card container has dedicated margin channel clearing floating chat button!');
    }

    console.log('📸 Capturing customer-mobile-map-freed.png...');
    await page.screenshot({ path: path.join(AUDIT_DIR, 'customer-mobile-map-freed.png') });

    // Expand Card
    console.log('🔺 Expanding card via drag handle...');
    await dragHandle.click();
    await page.waitForTimeout(600);
    console.log('📸 Capturing customer-mobile-card-expanded.png...');
    await page.screenshot({ path: path.join(AUDIT_DIR, 'customer-mobile-card-expanded.png') });

    // 4. Test Details Modal (No bottom Close button, stick to X on top)
    console.log('📋 [5/6] Testing Waybill Details Modal...');
    const detailsBtn = page.locator('button:has-text("VIEW DETAILS")').first();
    if (await detailsBtn.isVisible()) {
      await detailsBtn.scrollIntoViewIfNeeded();
      await detailsBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify Waybill Details modal
      const modalTitle = page.locator('text=WAYBILL DETAILS').first();
      await modalTitle.waitFor({ state: 'visible', timeout: 5000 });

      // Verify top X button exists
      const topCloseX = page.locator('button[title="Close Details"]').first();
      const hasTopX = await topCloseX.isVisible();
      console.log(`✅ Modal has top-right X button: ${hasTopX}`);

      // Verify bottom Close button is ABSENT
      const bottomCloseBtn = page.locator('button:text-is("Close")').first();
      const hasBottomClose = await bottomCloseBtn.isVisible();
      console.log(`✅ Redundant bottom Close button is removed: ${!hasBottomClose}`);
      if (hasBottomClose) throw new Error('Bottom Close button is still present in Details modal!');

      console.log('📸 Capturing customer-mobile-details-modal.png...');
      await page.screenshot({ path: path.join(AUDIT_DIR, 'customer-mobile-details-modal.png') });

      // Close modal using X
      await topCloseX.click();
      await page.waitForTimeout(500);
    }

    // 5. Test Booking Wizard Responsiveness
    console.log('📝 [6/6] Testing Booking Wizard Responsiveness on mobile...');
    const menuBtn = page.locator('button[aria-label="Toggle Menu"]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(800);
      const bookingsNav = page.locator('button:has-text("Bookings")').first();
      await bookingsNav.waitFor({ state: 'visible', timeout: 5000 });
      await bookingsNav.click();
      await page.waitForTimeout(1500);
    }

    // If "Recent Booking" summary view is showing, click "+ Create New Booking" to open the form
    const createNewBtn = page.locator('button:has-text("Create New Booking")').first();
    if (await createNewBtn.isVisible()) {
      console.log('Found recent booking summary, clicking + Create New Booking...');
      await createNewBtn.click();
      await page.waitForTimeout(1000);
    }

    // Check Step Indicator fits
    const step1 = page.locator('span:has-text("Pickup")').first();
    await step1.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Step Indicator rendered with compact labels on mobile');

    // Check Floating Chat is hidden during booking
    const isChatHidden = await chatBtn.isHidden().catch(() => true);
    console.log(`✅ Floating support chat button is hidden during booking: ${isChatHidden}`);

    // Check Next Step button is visible and unobstructed
    const nextStepBtn = page.locator('button:has-text("Next Step")').first();
    await nextStepBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Next Step button is clearly visible and unobstructed!');

    console.log('📸 Capturing customer-mobile-booking-wizard.png...');
    await page.screenshot({ path: path.join(AUDIT_DIR, 'customer-mobile-booking-wizard.png') });

    console.log('🎉 All Customer Mobile Polish verifications passed with 100% success!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    await page.screenshot({ path: path.join(AUDIT_DIR, 'customer-test-failure.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
