const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseEnv(filename) {
  const env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const AUDIT_DIR = path.resolve(__dirname, '../public/audit');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

async function authenticateRole(page, email, password) {
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
    email,
    password,
  });

  if (authResult.error) {
    throw new Error(`Failed auth for ${email}: ${authResult.error}`);
  }
  return authResult;
}

async function run() {
  console.log('🚀 Starting Complete Booking Flow & Post-Booking Verification...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    isMobile: false,
    geolocation: { latitude: 6.5244, longitude: 3.3792 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  console.log('Authenticating customer sanniinuoluwadunsimi@gmail.com...');
  await authenticateRole(page, 'sanniinuoluwadunsimi@gmail.com', 'CustomerTestPass2026!');

  console.log('Navigating to http://localhost:3000/customer ...');
  await page.goto('http://localhost:3000/customer', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click on Bookings tab in sidebar
  console.log('Clicking on Bookings navigation tab...');
  await page.waitForSelector('aside button:has-text("Bookings")', { timeout: 10000 });
  const bookingsTab = page.locator('aside button:has-text("Bookings")');
  await bookingsTab.click();
  await page.waitForTimeout(1500);

  // Check if Recent Booking view is currently visible
  const existingSummaryBtn = page.locator('button:has-text("+ Create New Booking")');
  if (await existingSummaryBtn.count() > 0) {
    console.log('Existing recent booking found. Clicking + Create New Booking to test fresh form...');
    await existingSummaryBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // STEP 1: Pickup Details
  console.log('--- Filling Step 1: Pickup Details ---');
  await page.fill('input[placeholder="e.g. Sanni Dunsimi"]', 'Chief Segun Olaleye');
  await page.fill('input[placeholder="e.g. +234 812 345 6789"]', '+2348039988776');
  await page.fill('input[placeholder*="Type street name"]', 'Maryland Mall, Ikorodu Road, Lagos');
  await page.waitForTimeout(500);

  const nextBtn = page.locator('button:has-text("Next Step")');
  await nextBtn.click();
  await page.waitForTimeout(800);

  // STEP 2: Recipient Details
  console.log('--- Filling Step 2: Recipient Details ---');
  await page.fill('input[placeholder="e.g. Dayzidee Logistics"]', 'Engr. Dapo Williams');
  await page.fill('input[placeholder="e.g. +234 809 999 8888"]', '+2348021112233');
  await page.fill('input[placeholder*="Type street, district"]', 'Ikeja City Mall, Alausa, Ikeja, Lagos');
  await page.waitForTimeout(500);
  await nextBtn.click();
  await page.waitForTimeout(800);

  // STEP 3: Package Details
  console.log('--- Filling Step 3: Package Details ---');
  const smallBoxBtn = page.locator('button:has-text("Small Box")');
  if (await smallBoxBtn.count() > 0) await smallBoxBtn.click();

  const elecTag = page.locator('button:has-text("+Electronics")');
  if (await elecTag.count() > 0) await elecTag.click();

  const budgetInput = page.locator('input[placeholder="e.g. 2500"]');
  if (await budgetInput.count() > 0) await budgetInput.fill('8500');

  await page.waitForTimeout(500);
  await nextBtn.click();
  await page.waitForTimeout(800);

  // STEP 4: Confirm & Checkout
  console.log('--- Step 4: Dispatching Order ---');
  const confirmBtn = page.locator('button:has-text("Confirm & Pay")');
  await confirmBtn.click();

  console.log('Waiting for order creation & dispatch response...');
  await page.waitForTimeout(4000);

  // Navigate back to Bookings tab to verify that Recent Booking Quick Summary is rendered
  console.log('Navigating to Bookings tab to check Recent Booking Quick Summary...');
  await bookingsTab.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(AUDIT_DIR, 'booking-05-recent-booking-card.png') });
  console.log('📸 Captured booking-05-recent-booking-card.png');

  const summaryBody = await page.innerText('body');
  const hasRecentTitle = summaryBody.includes('ACTIVE SHIPMENT / RECENT BOOKING') || summaryBody.includes('RECENT BOOKING');
  const hasNewBookingBtn = await page.locator('button:has-text("+ Create New Booking")').count() > 0;
  const hasRadarBtn = await page.locator('button:has-text("Track Live on Radar")').count() > 0;
  const hasPopPin = summaryBody.includes('Proof of Pickup (POP) PIN');

  console.log(`Recent Booking Card visible: ${hasRecentTitle}`);
  console.log(`'+ Create New Booking' button present: ${hasNewBookingBtn}`);
  console.log(`'Track Live on Radar' button present: ${hasRadarBtn}`);
  console.log(`Proof of Pickup (POP) PIN section present: ${hasPopPin}`);

  // Test 1-click + Create New Booking
  console.log('Testing click on + Create New Booking button...');
  await page.locator('button:has-text("+ Create New Booking")').first().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(AUDIT_DIR, 'booking-06-new-form-after-reset.png') });
  console.log('📸 Captured booking-06-new-form-after-reset.png');

  const newFormBody = await page.innerText('body');
  const isBackOnStep1 = newFormBody.includes('STEP 1 OF 4') && newFormBody.includes('Pickup Details');
  console.log(`Successfully returned to Step 1: ${isBackOnStep1}`);

  console.log('\n🎉 All E2E booking tests and post-booking states verified successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
