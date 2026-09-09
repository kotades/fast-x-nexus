const { chromium } = require('playwright');
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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ARTIFACTS_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

async function run() {
  console.log('🚀 Starting Step 2: Paystack Courier Payout UI Verification...');

  // 1. Find a rider profile
  const { data: riders, error: riderErr } = await supabase
    .from('profiles')
    .select('id, metadata')
    .eq('role', 'rider')
    .limit(1);

  if (riderErr) {
    console.error('Error fetching rider:', riderErr);
  }

  if (!riders || riders.length === 0) {
    throw new Error('No rider profile found in database');
  }

  const rider = riders[0];
  const riderName = rider.metadata?.full_name || 'Babatunde Alabi';
  console.log(`Using rider: ${riderName} (${rider.id})`);

  const crypto = require('crypto');
  const seedOrderId = crypto.randomUUID();
  const { data: customerProfiles } = await supabase.from('profiles').select('id').eq('role', 'customer').limit(1);
  const customerId = customerProfiles?.[0]?.id || rider.id;

  const { error: insErr } = await supabase.from('orders').insert({
    id: seedOrderId,
    customer_id: customerId,
    rider_id: rider.id,
    status: 'DELIVERED',
    pickup_address: '12 Kofo Abayomi, Victoria Island, Lagos',
    dropoff_address: 'Admiralty Way, Lekki Phase 1, Lagos',
    pickup_name: 'VI Hub Test',
    dropoff_name: 'Lekki Test',
    pickup_phone: '+2348011223344',
    dropoff_phone: '+2348099887766',
    pickup_h3_cell: '8882db2d41fffff',
    dropoff_h3_cell: '8882db2d41fffff',
    total_amount: 15000,
    metadata: {
      escrow_allocated: true,
      payout_status: 'PENDING',
    },
  });

  if (insErr) {
    console.error('Failed to seed order:', insErr);
    throw insErr;
  }
  console.log(`✓ Seeded delivered order ${seedOrderId} (₦15,000 -> ₦10,500 courier escrow)`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();

  try {
    page.on('console', (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[Browser PageError]: ${err.message}`));

    // 2. Authenticate as Admin
    console.log('Authenticating admin session via /login/admin...');
    await page.goto('http://localhost:3000/login/admin');
    await page.waitForLoadState('networkidle');
    const loginBtn = page.locator('button:has-text("1-Click Admin Sign-In")');
    await loginBtn.click();
    console.log('Clicked login button, waiting for redirect to /admin...');
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    console.log('✓ Admin authenticated, current URL:', page.url());

    // 3. Switch to Escrow & Ledger Tab
    console.log('Switching to Escrow & Ledger tab via sidebar...');
    const ledgerNavBtn = page.locator('button:has-text("Escrow & Ledger")');
    await ledgerNavBtn.waitFor({ state: 'visible', timeout: 10000 });
    await ledgerNavBtn.click();
    await page.waitForTimeout(2000);

    // 4. Verify Payout Disbursements Section
    console.log('Checking Paystack Direct Courier Disbursements card...');
    const sectionHeader = page.locator('h4:has-text("Paystack Direct Courier Disbursements")');
    await sectionHeader.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Section header found: Paystack Direct Courier Disbursements');

    // Verify Disburse button is present for courier
    const disburseBtn = page.locator('button:has-text("Disburse")').first();
    await disburseBtn.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✓ Found Disburse button, clicking...');
    await disburseBtn.click();

    // 5. Verify DisbursePayoutModal
    const modalTitle = page.locator('h2:has-text("Paystack Direct Escrow Payout")');
    await modalTitle.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✓ DisbursePayoutModal opened successfully!');

    // Check bank dropdown and NUBAN input
    const bankSelect = page.locator('select');
    await bankSelect.waitFor({ state: 'visible', timeout: 5000 });
    const nubanInput = page.locator('input[placeholder="e.g. 0123456789"]');
    await nubanInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Bank dropdown and NUBAN input are visible!');

    // Test bank selection & NUBAN input
    await bankSelect.selectOption({ label: 'Guaranty Trust Bank' });
    await nubanInput.fill('0123456789');
    await page.waitForTimeout(2000);

    // Check verification status
    const verifiedBadge = page.locator('text=Verified by Paystack');
    await verifiedBadge.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✓ NUBAN Account resolution successfully verified by Paystack!');

    // Capture Desktop Screenshot
    const desktopPath = path.join(ARTIFACTS_DIR, 'admin-payout-disburse-modal-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log('✓ Saved Desktop Screenshot:', desktopPath);

    // Capture Mobile Screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    const mobilePath = path.join(ARTIFACTS_DIR, 'admin-payout-disburse-modal-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log('✓ Saved Mobile Screenshot:', mobilePath);

    console.log('🎉 Step 2 UI Verification Succeeded 100%!');
  } finally {
    // Clean up seed order
    await supabase.from('orders').delete().eq('id', seedOrderId);
    console.log('✓ Cleaned up seed order');
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
