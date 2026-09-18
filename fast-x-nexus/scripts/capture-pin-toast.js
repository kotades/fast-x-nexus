const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

async function captureToast() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(
      'https://gocvbdsmlyskzcfqowuf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvY3ZiZHNtbHlza3pjZnFvd3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjk4MTcsImV4cCI6MjA4ODAwOTgxN30.iK29Z6Z-9P4dI0UjQ2jW8_VfN-g-r2t1a4o6o8w1x1U'
    );
    await sb.auth.signInWithPassword({
      email: 'sanniinuoluwadunsimi@gmail.com',
      password: 'CustomerTestPass2026!'
    });
  });

  await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Expand card
  const handle = page.locator('[aria-label="Expand route details"]').first();
  await handle.click();
  await page.waitForTimeout(600);

  // Click on the PIN box
  const pinBox = page.locator('text=TAP TO COPY').first();
  await pinBox.click();
  await page.waitForTimeout(150);

  // Capture toast
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-pin-copied-toast.png'), fullPage: false });
  console.log('✅ PIN toast screenshot captured successfully!');

  await browser.close();
}

captureToast().catch(console.error);
