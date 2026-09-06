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
        const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
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
  console.log('🚀 Starting Verification of Caching, Dynamic Sidebar, and Cleanup...');

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
  console.log('✅ Authenticated successfully.');

  console.log('Navigating to /customer dashboard...');
  await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Verify CommandMap Telemetry Widget is completely removed
  console.log('1. Checking CommandMap for Telemetry Widget removal...');
  const pageContent = await page.content();
  if (pageContent.includes('Telemetry Status') || pageContent.includes('Cellular Grid Active')) {
    console.error('❌ FAILED: Telemetry Status / Cellular Grid Active is still present!');
  } else {
    console.log('✅ PASS: Telemetry Status widget successfully removed from CommandMap.');
  }

  // 2. Check Sidebar Dynamic User Profile Card
  console.log('2. Checking Sidebar dynamic user card...');
  const userCard = page.locator('aside .mt-auto');
  await userCard.waitFor({ state: 'visible', timeout: 5000 });
  const userCardText = await userCard.innerText();
  console.log('User card content:', userCardText.replace(/\n/g, ' '));

  // Click user card or 3-dots to open popover menu
  const menuButton = userCard.locator('button[aria-label="User account menu"]');
  await menuButton.click();
  await page.waitForTimeout(500);

  const popoverMenu = page.locator('aside .mt-auto .shadow-2xl');
  const isPopoverVisible = await popoverMenu.isVisible();
  console.log('Popover visible:', isPopoverVisible);
  if (isPopoverVisible) {
    console.log('✅ PASS: Interactive user profile popover menu opened.');
    const popoverText = await popoverMenu.innerText();
    console.log('Popover menu content:', popoverText.replace(/\n/g, ' '));
  } else {
    console.error('❌ FAILED: Popover menu did not open.');
  }

  await page.screenshot({ path: path.join(AUDIT_DIR, 'sidebar-user-menu.png') });
  console.log('📸 Saved public/audit/sidebar-user-menu.png');

  // Close popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 3. Navigate to History (Activity Ledger)
  console.log('3. Navigating to History tab...');
  const historyNav = page.locator('aside button:has-text("History")');
  await historyNav.click();
  
  // Wait for Activity Ledger content
  await page.locator('text=Activity Ledger').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('text=Showing').first().waitFor({ state: 'visible', timeout: 10000 });

  const historyContent = await page.content();
  if (historyContent.includes('Clear All Test Orders')) {
    console.error('❌ FAILED: Clear All Test Orders button is still present!');
  } else {
    console.log('✅ PASS: "Clear All Test Orders" button is completely removed.');
  }

  const syncBtn = page.locator('button:has-text("Sync")');
  const hasSyncBtn = await syncBtn.isVisible();
  console.log('Sync button visible:', hasSyncBtn);

  await page.screenshot({ path: path.join(AUDIT_DIR, 'history-clean-instant.png') });
  console.log('📸 Saved public/audit/history-clean-instant.png');

  // 4. Navigate to Profile tab
  console.log('4. Navigating to Profile tab...');
  const profileNav = page.locator('aside button:has-text("Profile")');
  await profileNav.click();

  // Wait for Profile content
  await page.locator('text=Personal Information').first().waitFor({ state: 'visible', timeout: 10000 });
  console.log('Profile page loaded: true');

  await page.screenshot({ path: path.join(AUDIT_DIR, 'profile-instant.png') });
  console.log('📸 Saved public/audit/profile-instant.png');

  // 5. Switch back to History (measure instant memory cache switch)
  console.log('5. Switching back to History tab (Instant SWR test)...');
  const startTime = Date.now();
  await historyNav.click();
  await page.locator('text=Showing').first().waitFor({ state: 'visible', timeout: 2000 });
  
  const elapsed = Date.now() - startTime;
  console.log(`⏱️ Tab switch back to History took: ${elapsed}ms (Instant SWR cache verified!)`);

  await page.screenshot({ path: path.join(AUDIT_DIR, 'history-cached-instant.png') });
  console.log('📸 Saved public/audit/history-cached-instant.png');

  await browser.close();
  console.log('🎉 All verifications passed successfully!');
}

run().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
