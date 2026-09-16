const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5/mobile-audit';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const PUBLIC_ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'booking', path: '/booking' },
  { name: 'tracking', path: '/tracking' },
  { name: 'about', path: '/about' },
  { name: 'solutions', path: '/solutions' },
  { name: 'fleet', path: '/fleet' },
  { name: 'network', path: '/network' },
  { name: 'contact', path: '/contact' },
  { name: 'login', path: '/login' },
  { name: 'login-admin', path: '/login/admin' },
  { name: 'onboarding-rider', path: '/onboarding/rider' },
  { name: 'not-found', path: '/_not-found' },
];

async function run() {
  console.log('📱 Starting Mobile Responsiveness Audit on Public Pages (375x812)...');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const auditResults = [];

  for (const route of PUBLIC_ROUTES) {
    console.log(`\nAuditing ${route.name} (${route.path})...`);
    try {
      await page.goto(`http://localhost:3001${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      // 1. Check for horizontal overflow
      const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth;

        // Find elements that bleed past window width
        const overflowingElements = [];
        if (hasOverflow) {
          const allEls = document.querySelectorAll('*');
          allEls.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
                id: el.id,
                right: rect.right,
                width: rect.width
              });
            }
          });
        }

        return {
          hasOverflow,
          docWidth,
          winWidth,
          overflowDelta: docWidth - winWidth,
          overflowingElements: overflowingElements.slice(0, 5)
        };
      });

      // 2. Check touch targets under 44px
      const touchTargetIssues = await page.evaluate(() => {
        const clickable = document.querySelectorAll('button, a, input, select, textarea');
        const smallTargets = [];
        clickable.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 40 || rect.height < 40) {
              smallTargets.push({
                tag: el.tagName.toLowerCase(),
                text: el.innerText ? el.innerText.trim().slice(0, 30) : '',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                className: typeof el.className === 'string' ? el.className.slice(0, 40) : ''
              });
            }
          }
        });
        return smallTargets.slice(0, 5);
      });

      // 3. Capture screenshot
      const screenshotPath = path.join(ARTIFACTS_DIR, `${route.name}-mobile-375.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`  - Overflow: ${overflowInfo.hasOverflow ? `❌ YES (+${overflowInfo.overflowDelta}px)` : '✅ None'}`);
      console.log(`  - Touch targets <40px: ${touchTargetIssues.length > 0 ? `⚠️ ${touchTargetIssues.length} found` : '✅ OK'}`);
      console.log(`  - Screenshot saved: ${screenshotPath}`);

      auditResults.push({
        route: route.path,
        name: route.name,
        overflow: overflowInfo,
        smallTouchTargets: touchTargetIssues,
        screenshot: screenshotPath
      });
    } catch (err) {
      console.error(`  ❌ Error auditing ${route.name}:`, err.message);
    }
  }

  // 4. Test Mobile Menu Drawer Specifically on Landing Page
  console.log('\nTesting Mobile Navigation Drawer Interaction...');
  try {
    await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const menuToggle = page.locator('button[aria-label*="mobile menu"]').first();
    await menuToggle.click();
    await page.waitForTimeout(600);

    // Verify links inside drawer
    const drawerLinks = await page.evaluate(() => {
      const drawer = document.querySelector('div[class*="fixed inset-x-0 top-[72px]"]');
      if (!drawer) return { found: false, links: [] };
      const anchors = Array.from(drawer.querySelectorAll('a'));
      return {
        found: true,
        links: anchors.map(a => ({
          href: a.getAttribute('href'),
          text: a.innerText.trim(),
          height: Math.round(a.getBoundingClientRect().height)
        }))
      };
    });

    const menuScreenshotPath = path.join(ARTIFACTS_DIR, 'landing-menu-opened-mobile-v2.png');
    await page.screenshot({ path: menuScreenshotPath });
    console.log(`  - Drawer Found: ${drawerLinks.found ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Drawer Links Count: ${drawerLinks.links.length}`);
    console.log(`  - Screenshot saved: ${menuScreenshotPath}`);
  } catch (err) {
    console.error('  ❌ Error testing mobile drawer:', err.message);
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('📱 AUDIT SUMMARY REPORT');
  console.log('================================================================');
  console.log(JSON.stringify(auditResults, null, 2));
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
