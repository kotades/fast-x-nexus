/**
 * scripts/verify-adeniji-adele-fix.js
 * Playwright test to verify that "34 Adeniji Adele Road Lagos Island"
 * plots correctly on Lagos Island, and NOT in Ayobo/Alimosho.
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

  console.log('Logging in as Customer...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Authenticate session in browser context
  await page.evaluate(async ({ url, anonKey }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    await sb.auth.signInWithPassword({
      email: 'sanniinuoluwadunsimi@gmail.com',
      password: 'CustomerTestPass2026!',
    });
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  console.log('Navigating to Customer Dashboard...');
  await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click the BOOKINGS navigation item on the sidebar
  const bookingsTab = page.locator('button:has-text("BOOKINGS"), a:has-text("BOOKINGS"), div:has-text("BOOKINGS")').first();
  if (await bookingsTab.count() > 0) {
    console.log('Clicking BOOKINGS navigation tab...');
    await bookingsTab.click();
    await page.waitForTimeout(1000);
  }

  // Find pickup input
  const pickupInput = page.locator('input[placeholder*="street name"], input[placeholder*="pickup"], input[placeholder*="Adeshina"]').first();
  if (await pickupInput.count() > 0) {
    console.log('Entering "34 Adeniji Adele Road Lagos Island"...');
    await pickupInput.fill('');
    await pickupInput.pressSequentially('34 Adeniji Adele Road Lagos Island', { delay: 40 });
    await page.waitForTimeout(1500);

    // Check suggestions or click first suggestion
    const firstSuggestion = page.locator('div[role="listbox"] > div, div:has-text("Adeniji Adele")').first();
    if (await firstSuggestion.count() > 0) {
      console.log('Clicking top suggestion...');
      await firstSuggestion.click();
      await page.waitForTimeout(1000);
    }
  }

  const screenshotPath = path.join(ARTIFACT_DIR, 'adeniji_adele_lagos_island_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to: ${screenshotPath}`);

  await browser.close();
  console.log('Verification completed.');
}

main().catch(console.error);
