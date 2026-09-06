const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  console.log('1. Navigating to http://localhost:3000/login/admin...');
  await page.goto('http://localhost:3000/login/admin');
  await page.waitForLoadState('networkidle');
  
  await page.screenshot({ path: 'public/admin-login-desktop.png' });
  console.log('✓ Desktop screenshot taken: public/admin-login-desktop.png');
  
  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'public/admin-login-mobile.png' });
  console.log('✓ Mobile screenshot taken: public/admin-login-mobile.png');
  
  // Verify footer has Admin Login link
  console.log('2. Verifying Footer links on homepage...');
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  const footerLinks = await page.$$eval('footer a', els => els.map(e => ({ text: e.innerText.trim(), href: e.href })));
  const adminFooterLinks = footerLinks.filter(l => l.text.toLowerCase().includes('admin'));
  console.log('✓ Admin links found in Footer:', adminFooterLinks);

  // Verify login page has Admin link
  console.log('3. Verifying Login page quicklink...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  const loginLinks = await page.$$eval('a', els => els.map(e => ({ text: e.innerText.trim(), href: e.href })));
  const adminLoginLinks = loginLinks.filter(l => l.text.toLowerCase().includes('admin'));
  console.log('✓ Admin links on /login:', adminLoginLinks);

  // 4. Test 1-click admin login button interaction
  console.log('4. Testing 1-click admin login interaction on /login/admin...');
  await page.goto('http://localhost:3000/login/admin');
  await page.waitForLoadState('networkidle');
  
  const quickButton = page.locator('button:has-text("1-Click Admin Sign-In")');
  await quickButton.click();
  console.log('Clicked 1-click admin login button.');
  
  // Wait for redirect or navigation to /admin
  try {
    await page.waitForURL('**/admin', { timeout: 8000 });
    console.log('✓ Successfully authenticated and navigated to:', page.url());
    await page.screenshot({ path: 'public/admin-dashboard-after-login.png' });
    console.log('✓ Dashboard screenshot saved: public/admin-dashboard-after-login.png');
  } catch (e) {
    console.log('Current URL after click:', page.url());
  }

  await browser.close();
}

run().catch(console.error);
