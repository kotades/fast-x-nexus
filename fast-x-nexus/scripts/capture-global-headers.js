const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.resolve(__dirname, '../public/audit/global-header');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

async function run() {
  console.log('🚀 Capturing Global Header across public & portal pages...');
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page Desktop
  const deskCtx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  });
  const deskPage = await deskCtx.newPage();

  console.log('📸 Capturing Landing Page Desktop...');
  await deskPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(1000);
  await deskPage.screenshot({ path: path.join(AUDIT_DIR, 'desktop-landing.png') });

  console.log('📸 Capturing About Page Desktop...');
  await deskPage.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(1000);
  await deskPage.screenshot({ path: path.join(AUDIT_DIR, 'desktop-about.png') });

  console.log('📸 Capturing Tracking Page Desktop...');
  await deskPage.goto('http://localhost:3000/tracking', { waitUntil: 'networkidle' });
  await deskPage.waitForTimeout(1000);
  await deskPage.screenshot({ path: path.join(AUDIT_DIR, 'desktop-tracking.png') });

  await deskCtx.close();

  // 2. Mobile Viewports
  const mobCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobPage = await mobCtx.newPage();

  console.log('📱 Capturing Landing Page Mobile...');
  await mobPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(1000);
  await mobPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-landing.png') });

  console.log('📱 Capturing Mobile Menu Drawer Open...');
  // Click the 3D F logo or toggle button
  const toggleBtn = await mobPage.$('button[aria-label*="navigation menu"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await mobPage.waitForTimeout(500);
    await mobPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-menu-drawer.png') });
  }

  console.log('📱 Capturing Tracking Page Mobile...');
  await mobPage.goto('http://localhost:3000/tracking', { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(1000);
  await mobPage.screenshot({ path: path.join(AUDIT_DIR, 'mobile-tracking.png') });

  await mobCtx.close();
  await browser.close();

  console.log('✅ Screenshots successfully saved in public/audit/global-header/');
}

run().catch(console.error);
