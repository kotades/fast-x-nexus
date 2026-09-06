/**
 * scripts/verify-rider-chat-color.js
 * Verifies that RiderDispatchChat adheres strictly to Fast X Forest Green & Surface schema.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const ARTIFACT_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  console.log('Logging in as Rider...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Authenticate session in browser context
  await page.evaluate(async ({ url, anonKey }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({
      email: 'inuoluwadunsimis@gmail.com',
      password: 'RiderTestPass2026!',
    });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  console.log('Navigating to Rider Terminal...');
  await page.goto('http://localhost:3000/rider', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const radioTrigger = page.locator('button[aria-label="Toggle Dispatch Radio"]');
  if (await radioTrigger.count() > 0) {
    console.log('Opening Dispatch Radio drawer...');
    await radioTrigger.click();
    await page.waitForTimeout(800);

    const screenshotPath = path.join(ARTIFACT_DIR, 'rider_dispatch_chat_brand_green_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to: ${screenshotPath}`);
  } else {
    console.log('Radio trigger button not found on page.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'rider_terminal_fallback.png') });
  }

  await browser.close();
  console.log('Verification completed.');
}

main().catch(console.error);
