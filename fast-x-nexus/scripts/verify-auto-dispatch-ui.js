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
  console.log('🚀 Starting Auto-Dispatch Modal Visual & E2E Inspection...');

  // 1. Setup seed waybills
  await supabase.from('orders').delete().ilike('pickup_name', '%Tech Depot Ikeja%');
  await supabase.from('orders').delete().ilike('pickup_name', '%Express Hub Ikeja%');

  const { data: customerProfiles } = await supabase.from('profiles').select('id').eq('role', 'customer').limit(1);
  const customerId = customerProfiles?.[0]?.id || 'cdf9d7e3-c90d-47c3-b6ae-c29eeb5e9732';

  const crypto = require('crypto');
  const testId1 = crypto.randomUUID();
  const testId2 = crypto.randomUUID();

  await supabase.from('orders').insert([
    {
      id: testId1,
      customer_id: customerId,
      status: 'PAID_UNASSIGNED',
      pickup_address: 'Computer Village, Ikeja, Lagos',
      dropoff_address: 'Allen Avenue, Ikeja, Lagos',
      pickup_name: 'Tech Depot Ikeja',
      dropoff_name: 'Retail Store Allen',
      pickup_phone: '+2348011112222',
      dropoff_phone: '+2348033334444',
      pickup_h3_cell: '8882db2d41fffff',
      dropoff_h3_cell: '8882db2d41fffff',
      total_amount: 5500,
    },
    {
      id: testId2,
      customer_id: customerId,
      status: 'PAID_UNASSIGNED',
      pickup_address: 'Awolowo Way, Ikeja, Lagos',
      dropoff_address: 'Opebi Road, Ikeja, Lagos',
      pickup_name: 'Express Hub Ikeja',
      dropoff_name: 'Corporate Tower Opebi',
      pickup_phone: '+2348055556666',
      dropoff_phone: '+2348077778888',
      pickup_h3_cell: '8882db2d41fffff',
      dropoff_h3_cell: '8882db2d41fffff',
      total_amount: 7500,
    },
  ]);
  console.log('✓ Seeded 2 test waybills for UI preview');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();

  // 2. Authenticate as Admin
  console.log('Authenticating admin session via /login/admin...');
  await page.goto('http://localhost:3000/login/admin');
  await page.waitForLoadState('networkidle');
  const loginBtn = page.locator('button:has-text("1-Click Admin Sign-In")');
  await loginBtn.click();
  await page.waitForURL('**/admin', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  console.log('✓ Admin authenticated, current URL:', page.url());

  await page.waitForTimeout(2000);

  // 3. Test opening from Radar Map operations bar first
  console.log('Testing Auto-Dispatch button from Live Spatial Radar...');
  const radarDispatchBtn = page.locator('button:has-text("AUTO-DISPATCH (")');
  await radarDispatchBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✓ Found Radar Auto-Dispatch button:', await radarDispatchBtn.innerText());
  await radarDispatchBtn.click();

  // 4. Wait for modal to open and preview to finish loading
  console.log('Waiting for AutoDispatchModal to open and compute H3 matches...');
  const modalHeading = page.locator('h2:has-text("1-Click Batch Auto-Dispatch Engine")');
  await modalHeading.waitFor({ state: 'visible', timeout: 8000 });
  console.log('✓ Modal opened successfully from Spatial Radar!');

  // Wait until loading finishes (looking for matches or confirm button)
  const confirmBtn = page.locator('button:has-text("CONFIRM & DISPATCH")');
  await confirmBtn.waitFor({ state: 'visible', timeout: 20000 });
  console.log('✓ Spatial allocations computed! Confirm button text:', await confirmBtn.innerText());

  // Capture Desktop Screenshot
  const desktopPath = path.join(ARTIFACTS_DIR, 'admin-auto-dispatch-modal-desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log('✓ Saved Desktop Screenshot:', desktopPath);

  // Capture Mobile Viewport Screenshot
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const mobilePath = path.join(ARTIFACTS_DIR, 'admin-auto-dispatch-modal-mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log('✓ Saved Mobile Screenshot:', mobilePath);

  // 5. Test Click Confirm & Dispatch
  console.log('Testing batch dispatch execution via modal...');
  await confirmBtn.click();

  // Wait for success banner
  const successBanner = page.locator('text=Batch Dispatch Completed');
  await successBanner.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✓ Success banner displayed in modal!');

  const successPath = path.join(ARTIFACTS_DIR, 'admin-auto-dispatch-success.png');
  await page.screenshot({ path: successPath });
  console.log('✓ Saved Success Screenshot:', successPath);

  // 6. Cleanup
  await supabase.from('orders').delete().in('id', [testId1, testId2]);
  console.log('✓ Cleaned up test waybills');

  await browser.close();
  console.log('\n🎉 Auto-Dispatch UI Playwright inspection passed completely!\n');
}

run().catch((err) => {
  console.error('Playwright inspection error:', err);
  process.exit(1);
});
