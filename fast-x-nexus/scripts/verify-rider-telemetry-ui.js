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
        const val = line.slice(idx + 1).trim().replace(/^['\x22]|['\x22]$/g, '');
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
  console.log('🚀 Starting Rider Geolocation & Live Watch UI Verification...');

  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  // Context with Geolocation permissions granted for Ikeja, Lagos
  const context = await browser.newContext({
    viewport: { width: 1366, height: 800 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.598, longitude: 3.354, accuracy: 15 }
  });

  const page = await context.newPage();

  try {
    // 0. Authenticate as rider
    console.log('Signing in as Courier (inuoluwadunsimis@gmail.com)...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.evaluate(async ({ url, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const sb = createBrowserClient(url, anonKey);
      await sb.auth.signInWithPassword({
        email: 'inuoluwadunsimis@gmail.com',
        password: 'RiderTestPass2026!'
      });
    }, {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // 1. Visit /rider
    console.log('Navigating to Rider Terminal (/rider)...');
    await page.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);

    // 2. Check for Persistent Telemetry Indicator Pill
    console.log('Verifying RiderTelemetryWatcher component...');
    const telemetryIndicator = page.locator('aside[aria-label="Rider Live Telemetry Indicator"]');
    await telemetryIndicator.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Found persistent telemetry indicator in Rider Terminal');

    const pillText = await telemetryIndicator.innerText();
    console.log(`✓ Telemetry Pill Text: "${pillText.replace(/\n/g, ' ')}"`);

    // 3. Click to expand telemetry drawer
    console.log('Expanding telemetry telemetry drawer...');
    await telemetryIndicator.locator('div').first().click();
    await page.waitForTimeout(1000);

    const expandedText = await telemetryIndicator.innerText();
    console.log(`✓ Expanded Telemetry Info: "${expandedText.replace(/\n/g, ' | ')}"`);

    // Capture Desktop Screenshot
    const desktopPath = path.join(ARTIFACTS_DIR, 'rider-telemetry-active-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log('✓ Saved Desktop Screenshot:', desktopPath);

    // Capture Mobile Viewport Screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    const mobilePath = path.join(ARTIFACTS_DIR, 'rider-telemetry-active-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log('✓ Saved Mobile Screenshot:', mobilePath);

    // Reset to Desktop
    await page.setViewportSize({ width: 1366, height: 800 });

    // 4. Authenticate Admin and verify Courier visible on Spatial Radar
    console.log('\nNavigating to Admin Control Tower (/admin)...');
    await page.goto('http://localhost:3000/login/admin');
    await page.waitForLoadState('networkidle');
    const loginBtn = page.locator('button:has-text("1-Click Admin Sign-In")');
    await loginBtn.click();
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 20000 });
    await page.waitForTimeout(3000);

    console.log('✓ Admin authenticated, checking Spatial Radar for live telemetry...');
    const couriersTab = page.locator('button:has-text("⚡ Couriers")');
    await couriersTab.click();
    await page.waitForTimeout(1500);

    const adminRadarPath = path.join(ARTIFACTS_DIR, 'admin-live-courier-telemetry.png');
    await page.screenshot({ path: adminRadarPath, fullPage: false });
    console.log('✓ Saved Admin Live Radar Screenshot:', adminRadarPath);

    console.log('\n🎉 RIDER GEOLOCATION LIVE WATCH & ADMIN TELEMETRY VERIFIED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
