/**
 * /scripts/test-view-map.js
 * Fast X Nexus — Capture Dispatch Map View with Playwright
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

async function main() {
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: authData } = await userClient.auth.signInWithPassword({
    email: 'inuoluwadunsimis@gmail.com',
    password: 'RiderTestPass2026!',
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    geolocation: { latitude: 6.5744, longitude: 3.3692 },
    permissions: ['geolocation'],
  });

  const projectRef = 'ghqcnztahdnezejvdklf';
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = encodeURIComponent(JSON.stringify(authData.session));

  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();
  await page.goto('http://localhost:3000/rider', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Click Dispatch Map in Sidebar
  console.log('Clicking Dispatch Map in Sidebar...');
  await page.locator('button:has-text("DISPATCH MAP")').click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/test_dispatch_map.png' });
  console.log('Screenshot saved to test_dispatch_map.png');

  await browser.close();
}

main().catch(console.error);
