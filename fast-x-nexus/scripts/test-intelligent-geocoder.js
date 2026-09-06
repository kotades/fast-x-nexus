/**
 * scripts/test-intelligent-geocoder.js
 * Fast X Nexus — Intelligent Open-Source Geocoder & Landmark Precision Test
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

async function runTest() {
  console.log('🧹 [1/4] Resetting test database state...');
  await admin.from('rider_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('parcels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('🚀 [2/4] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  // Login as Customer
  console.log('🔑 [3/4] Authenticating customer...');
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1000);
  await page.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({ email, password });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: 'sanniinuoluwadunsimi@gmail.com',
    password: 'CustomerTestPass2026!',
  });

  await page.goto('http://localhost:3000/customer', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Navigate to Bookings
  await page.locator('button:has-text("BOOKINGS"), a:has-text("BOOKINGS")').first().click();
  await page.waitForTimeout(1500);

  // Test 1: Noisy Pickup Address
  console.log('📍 Testing Noisy Pickup Address entry with NLP landmark extraction...');
  const inputs1 = await page.locator('input').all();
  if (inputs1.length >= 3) {
    await inputs1[0].fill('Chief Adebayo');
    await inputs1[1].fill('08023344556');
    await inputs1[2].fill('Beside Total Filling Station, 4b Adeshina Balogun Street, off Oreyo Bus Stop, Igbogbo, Ikorodu');
  }
  await page.waitForTimeout(1200);

  // Capture Autocomplete dropdown with detected location node and closest landmark note
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/nlp_pickup_autocomplete.png' });
  console.log('NLP pickup screenshot captured!');

  await page.locator('button:has-text("Next Step")').first().click();
  await page.waitForTimeout(1000);

  // Test 2: Typo-laden Dropoff Address
  console.log('🏁 Testing Typo-laden Dropoff Address entry with fuzzy matcher...');
  const inputs2 = await page.locator('input').all();
  if (inputs2.length >= 3) {
    await inputs2[0].fill('Madam Folake');
    await inputs2[1].fill('08099887766');
    await inputs2[2].fill('Opposite Zenith Bank, Nepa junction jakande estat isolo Lagos');
  }
  await page.waitForTimeout(1200);

  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/nlp_dropoff_autocomplete.png' });
  console.log('NLP dropoff screenshot captured!');

  await page.locator('button:has-text("Next Step")').first().click();
  await page.waitForTimeout(1000);

  // Step 3: Package Details
  await page.locator('button:has-text("Next Step")').first().click();
  await page.waitForTimeout(1000);

  // Step 4: Checkout
  await page.locator('button:has-text("Confirm & Pay")').first().click();
  await page.waitForTimeout(3500);

  // Capture final Customer Command Map
  await page.goto('http://localhost:3000/customer', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/nlp_command_map_verified.png' });
  console.log('Final intelligent command map captured!');

  await browser.close();
}

runTest();
