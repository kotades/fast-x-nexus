/**
 * /scripts/capture-new-header.js
 * Captures mobile (375x812) and desktop (1280x800) screenshots of the new floating island header
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
const AUDIT_DIR = path.resolve(__dirname, '../public/audit');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

const RIDER_EMAIL = 'inuoluwadunsimis@gmail.com';
const RIDER_PASS = 'RiderTestPass2026!';

async function run() {
  console.log('🚀 Capturing New Header Layout...');
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile (375x812)
  console.log('📱 Mobile Viewport (375x812)...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const mobilePage = await mobileCtx.newPage();

  await mobilePage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({ email, password });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: RIDER_EMAIL,
    password: RIDER_PASS,
  });

  await mobilePage.addInitScript(() => {
    sessionStorage.setItem('fastx_rider_active_view', 'route_map');
  });

  await mobilePage.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2500);

  const mobileHeader = mobilePage.locator('header').first();
  const mobileHeaderBox = await mobileHeader.boundingBox();
  console.log('Mobile Header Bounding Box:', mobileHeaderBox);

  const mobileImgPath = path.join(AUDIT_DIR, 'new-header-mobile.png');
  await mobilePage.screenshot({ path: mobileImgPath, animations: 'disabled' });
  console.log(`📸 Saved mobile screenshot to ${mobileImgPath}`);

  // Test clicking the 3D F logo menu trigger
  const fMenuBtn = mobilePage.locator('button[aria-label="Toggle navigation menu"]').first();
  if (await fMenuBtn.isVisible()) {
    console.log('🎯 Tapping 3D F Logo Menu button...');
    await fMenuBtn.click();
    await mobilePage.waitForTimeout(800);
    const drawerImgPath = path.join(AUDIT_DIR, 'new-header-drawer-open.png');
    await mobilePage.screenshot({ path: drawerImgPath, animations: 'disabled' });
    console.log(`📸 Saved drawer open screenshot to ${drawerImgPath}`);
  }

  // 2. Desktop (1280x800)
  console.log('💻 Desktop Viewport (1280x800)...');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  const desktopPage = await desktopCtx.newPage();

  await desktopPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1000);

  await desktopPage.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({ email, password });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email: RIDER_EMAIL,
    password: RIDER_PASS,
  });

  await desktopPage.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(2500);

  const desktopImgPath = path.join(AUDIT_DIR, 'new-header-desktop.png');
  await desktopPage.screenshot({ path: desktopImgPath, animations: 'disabled' });
  console.log(`📸 Saved desktop screenshot to ${desktopImgPath}`);

  await browser.close();
  console.log('🎉 Screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
