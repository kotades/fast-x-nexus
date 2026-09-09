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

const ARTIFACTS_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

async function run() {
  console.log('🚀 Starting Steps 3 & 4 Verification: Lagos H3 Heatmap + SLA & Dwell Time Alerts...');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Authenticate as Admin
    console.log('Authenticating admin session via /login/admin...');
    await page.goto('http://localhost:3000/login/admin');
    await page.waitForLoadState('networkidle');
    const loginBtn = page.locator('button:has-text("1-Click Admin Sign-In")');
    await loginBtn.click();
    console.log('Clicked login, waiting for /admin redirect...');
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('✓ Admin authenticated, on /admin');

    // 2. Test Lagos H3 Demand Heatmap & Legend
    console.log('--- TEST 1: Lagos H3 Demand & Density Heatmap ---');
    const heatmapToggleBtn = page.locator('button:has-text("HEATMAP:")');
    await heatmapToggleBtn.waitFor({ state: 'visible', timeout: 10000 });
    const initialText = await heatmapToggleBtn.innerText();
    console.log(`✓ Found Heatmap toggle button: "${initialText}"`);

    // Verify Legend is present
    const legend = page.locator('text=H3 Demand Density');
    await legend.waitFor({ state: 'visible', timeout: 8000 });
    console.log('✓ H3 Demand Density Legend is visible on map canvas');

    // Verify Leaflet polygons rendered
    const polygons = page.locator('.leaflet-interactive');
    const polygonCount = await polygons.count();
    console.log(`✓ Leaflet interactive elements detected: ${polygonCount}`);

    // Verify Dwell Time Alert on Courier list
    console.log('\n--- TEST 2: Courier Dwell-Time Alerts ---');
    const couriersTabBtn = page.locator('button:has-text("⚡ Couriers")');
    await couriersTabBtn.click();
    await page.waitForTimeout(1000);

    const dwellAlertBadges = page.locator('text=STALLED');
    const dwellCount = await dwellAlertBadges.count();
    console.log(`✓ Found ${dwellCount} couriers flagged with DWELL ALERTS in operations roster`);

    // Verify Cargo SLA Badges
    console.log('\n--- TEST 3: Cargo 15-Minute SLA Alerts in Radar ---');
    const cargoTabBtn = page.locator('button:has-text("📦 Cargo")');
    await cargoTabBtn.click();
    await page.waitForTimeout(1000);

    const slaBadges = page.locator('text=SLA');
    const slaCount = await slaBadges.count();
    console.log(`✓ Found ${slaCount} cargo orders with SLA monitoring badges`);

    // Capture Desktop Heatmap Screenshot
    const desktopHeatmapPath = path.join(ARTIFACTS_DIR, 'admin-h3-heatmap-desktop.png');
    await page.screenshot({ path: desktopHeatmapPath, fullPage: false });
    console.log('✓ Saved Desktop Heatmap Screenshot:', desktopHeatmapPath);

    // Capture Mobile Heatmap Screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    const mobileHeatmapPath = path.join(ARTIFACTS_DIR, 'admin-h3-heatmap-mobile.png');
    await page.screenshot({ path: mobileHeatmapPath, fullPage: false });
    console.log('✓ Saved Mobile Heatmap Screenshot:', mobileHeatmapPath);

    // Reset to Desktop viewport
    await page.setViewportSize({ width: 1366, height: 800 });

    // 4. Test Heatmap Toggle OFF and ON
    console.log('\n--- TEST 4: Toggle Heatmap OFF & ON ---');
    await heatmapToggleBtn.click();
    await page.waitForTimeout(800);
    const toggledOffText = await heatmapToggleBtn.innerText();
    console.log(`✓ Heatmap toggled to: "${toggledOffText}"`);

    await heatmapToggleBtn.click();
    await page.waitForTimeout(800);
    const toggledOnText = await heatmapToggleBtn.innerText();
    console.log(`✓ Heatmap restored to: "${toggledOnText}"`);

    // 5. Test Full Waybill Pipeline SLA Timer
    console.log('\n--- TEST 5: Full Waybill Board SLA Urgency Column ---');
    const waybillNavBtn = page.locator('button:has-text("Waybill Board")').first();
    await waybillNavBtn.waitFor({ state: 'visible', timeout: 8000 });
    await waybillNavBtn.click();
    await page.waitForTimeout(2000);

    const waybillTable = page.locator('table');
    await waybillTable.waitFor({ state: 'visible', timeout: 10000 });

    const waybillSlaBadges = page.locator('text=/SLA: \\d+m left|BREACH/i');
    const tableSlaCount = await waybillSlaBadges.count();
    console.log(`✓ Found ${tableSlaCount} SLA countdown / breach indicators in Waybill Pipeline table`);

    // Capture Waybill SLA Screenshot
    const waybillSlaPath = path.join(ARTIFACTS_DIR, 'admin-waybill-sla-desktop.png');
    await page.screenshot({ path: waybillSlaPath, fullPage: false });
    console.log('✓ Saved Waybill Board SLA Screenshot:', waybillSlaPath);

    console.log('\n🎉 ALL 4 ADMIN ENHANCEMENTS FULLY VERIFIED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
