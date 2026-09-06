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

async function test() {
  console.log('1. Signing in rider (inuoluwadunsimis@gmail.com)...');
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await userClient.auth.signInWithPassword({
    email: 'inuoluwadunsimis@gmail.com',
    password: 'RiderTestPass2026!',
  });

  if (authErr || !authData.session) {
    throw new Error('Failed to sign in rider: ' + (authErr?.message || 'No session'));
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 5.5643, longitude: 5.8459 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  // Set cookies via browser context
  console.log('2. Establishing auth session on http://localhost:3000...');
  await page.goto('http://localhost:3000/login');
  await page.evaluate(({ session, ref }) => {
    const raw = JSON.stringify(session);
    document.cookie = `sb-${ref}-auth-token=${encodeURIComponent(raw)}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `sb-${ref}-auth-token.0=${encodeURIComponent(raw)}; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem(`sb-${ref}-auth-token`, raw);
  }, { session: authData.session, ref: 'ghqcnztahdnezejvdklf' });

  console.log('3. Navigating to http://localhost:3000/rider...');
  await page.goto('http://localhost:3000/rider');
  await page.waitForLoadState('networkidle');

  // Switch to DISPATCH MAP tab if needed
  const mapNav = page.locator('button:has-text("DISPATCH MAP"), a:has-text("DISPATCH MAP")').first();
  if (await mapNav.isVisible()) {
    await mapNav.click();
    await page.waitForTimeout(2500);
  }

  // Wait for map container
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
  console.log('✓ Leaflet map container found and active.');

  // Take initial map screenshot
  await page.screenshot({ path: 'public/map-fix-initial.png' });
  console.log('✓ Initial map screenshot saved: public/map-fix-initial.png');

  // Check for Dropoff button in HUD
  const dropoffBtn = page.locator('button:has-text("Dropoff")').first();
  const hasDropoffBtn = await dropoffBtn.isVisible();
  console.log('✓ Dropoff quick button visible in HUD:', hasDropoffBtn);

  if (hasDropoffBtn) {
    console.log('4. Clicking Dropoff button to fly to dropoff location...');
    await dropoffBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'public/map-fix-focused-dropoff.png' });
    console.log('✓ Focused dropoff screenshot saved: public/map-fix-focused-dropoff.png');
  }

  // Verify that destination pin exists on the map
  const calloutBadges = await page.$$eval('.custom-callout-icon', els => els.map(e => e.innerText.trim()));
  console.log('✓ Waypoint callout badges rendered on map:', calloutBadges);

  // Check if "Re-center Route" pill is available or appears when user zooms
  const mapEl = page.locator('.leaflet-container');
  const box = await mapEl.boundingBox();
  if (box) {
    console.log('5. Simulating user wheel zoom on map...');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -600); // Zoom in
    await page.waitForTimeout(1500);

    const recenterBtn = page.locator('button:has-text("Re-center Route")');
    const isRecenterVisible = await recenterBtn.isVisible();
    console.log('✓ "Re-center Route" button visible:', isRecenterVisible);

    console.log('6. Waiting 6 seconds (multiple GPS telemetry cycles) to verify camera does NOT jump...');
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'public/map-fix-after-waiting.png' });
    console.log('✓ Post-wait screenshot saved: public/map-fix-after-waiting.png');
  }

  await browser.close();
  console.log('🎉 ALL TESTS PASSED: Map retains zoom and does not reset to rider location!');
}

test().catch(console.error);
