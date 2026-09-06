const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('1. Logging in as Admin via /login/admin...');
  await page.goto('http://localhost:3000/login/admin');
  await page.waitForLoadState('networkidle');

  const quickBtn = page.locator('button:has-text("1-Click Admin Sign-In")');
  await quickBtn.click();
  await page.waitForURL(url => url.pathname === '/admin', { timeout: 10000 });
  console.log('✓ Successfully logged in and on /admin! URL:', page.url());

  console.log('2. Navigating to Spatial Radar tab...');
  await page.goto('http://localhost:3000/admin?tab=radar');
  await page.waitForLoadState('networkidle');

  // Wait for map and tiles to load
  await page.waitForTimeout(4000);

  // Check map elements
  const mapContainer = page.locator('.leaflet-container');
  const count = await mapContainer.count();
  console.log('Leaflet MapContainer count on /admin?tab=radar:', count);

  const tileInfo = await page.evaluate(() => {
    const tile = document.querySelector('.leaflet-tile');
    const container = document.querySelector('.leaflet-container');
    if (!tile || !container) {
      return { 
        found: false, 
        tileCount: document.querySelectorAll('.leaflet-tile').length,
        hasContainer: !!container,
        containerHTML: container ? container.outerHTML.slice(0, 300) : null
      };
    }
    const tileStyle = window.getComputedStyle(tile);
    const containerStyle = window.getComputedStyle(container);
    return {
      found: true,
      tileCount: document.querySelectorAll('.leaflet-tile').length,
      tilePosition: tileStyle.position,
      tileWidth: tileStyle.width,
      tileHeight: tileStyle.height,
      containerWidth: containerStyle.width,
      containerHeight: containerStyle.height,
      containerOverflow: containerStyle.overflow,
    };
  });
  console.log('Leaflet rendering diagnostics:', tileInfo);

  // Test clicking sector buttons
  const islandBtn = page.locator('button:has-text("Island / Lekki")');
  if (await islandBtn.isVisible()) {
    await islandBtn.click();
    console.log('✓ Clicked "Island / Lekki" sector jump button');
    await page.waitForTimeout(1500);
  }

  // Take screenshot of the fixed spatial board
  await page.screenshot({ path: 'public/admin-spatial-board-desktop.png', fullPage: false });
  console.log('✓ Desktop screenshot saved: public/admin-spatial-board-desktop.png');

  // Test mobile view
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'public/admin-spatial-board-mobile.png', fullPage: false });
  console.log('✓ Mobile screenshot saved: public/admin-spatial-board-mobile.png');

  await browser.close();
  console.log('✓ Spatial Board verification completed successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
