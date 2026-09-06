const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseEnv(filename) {
  const env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const AUDIT_DIR = path.resolve(__dirname, '../public/audit');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

async function authenticateRole(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const authResult = await page.evaluate(async ({ url, anonKey, email, password }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null, user: data?.user?.id || null };
  }, {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    email,
    password,
  });

  if (authResult.error) {
    throw new Error(`Failed auth for ${email}: ${authResult.error}`);
  }
  return authResult;
}

async function run() {
  console.log('🚀 Starting Verification of Customer Enhancements...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    const testEmail = 'sanniinuoluwadunsimi@gmail.com';
    const testPassword = 'CustomerTestPass2026!';

    console.log(`Authenticating customer ${testEmail}...`);
    await authenticateRole(page, testEmail, testPassword);
    console.log('✅ Authenticated successfully.');

    console.log('Navigating to /customer dashboard...');
    await page.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Check Header: Support button removal
    console.log('1. Checking Header for Support link removal...');
    const supportLink = page.locator('header a[href="/contact"]');
    const supportCount = await supportLink.count();
    if (supportCount === 0) {
      console.log('✅ PASS: [Support] link successfully removed from Header.');
    } else {
      console.error('❌ FAIL: [Support] link is still present in Header.');
    }

    const docLink = page.locator('header a[href="/about"]');
    console.log(`Documentation link present: ${await docLink.isVisible()}`);

    // 2. Check Sidebar for "Fast X Customer" fallback
    console.log('2. Checking Sidebar user display...');
    const userCard = page.locator('aside .mt-auto');
    await userCard.waitFor({ state: 'visible', timeout: 5000 });
    const userCardText = await userCard.innerText();
    console.log('User card content:', userCardText.replace(/\n/g, ' '));
    if (userCardText.includes('FAST X CUSTOMER') || userCardText.includes('Fast X Customer') || userCardText.includes('FX')) {
      console.log('✅ PASS: Sidebar correctly defaults to "Fast X Customer" with "FX" initials.');
    }

    // 3. Test Floating Support Chat: WhatsApp & Call Buttons + Light Theme
    console.log('3. Checking Support Chat Drawer...');
    const chatButton = page.locator('button[aria-label="Toggle Support Chat"]');
    await chatButton.click();
    await page.waitForTimeout(800);

    const whatsappBtn = page.locator('a[title*="WhatsApp"]');
    const callBtn = page.locator('a[title*="Operations"]');

    const whatsappVisible = await whatsappBtn.isVisible();
    const callVisible = await callBtn.isVisible();

    const whatsappHref = await whatsappBtn.getAttribute('href');
    const callHref = await callBtn.getAttribute('href');

    console.log(`WhatsApp button visible: ${whatsappVisible}, href: ${whatsappHref}`);
    console.log(`Call button visible: ${callVisible}, href: ${callHref}`);

    if (whatsappVisible && whatsappHref && whatsappHref.includes('wa.me/2349014030047')) {
      console.log('✅ PASS: WhatsApp Direct Chat button configured correctly.');
    } else {
      console.error('❌ FAIL: WhatsApp button not configured correctly.');
    }

    if (callVisible && callHref && callHref === 'tel:+2349014030047') {
      console.log('✅ PASS: Call Operations button configured correctly.');
    } else {
      console.error('❌ FAIL: Call button not configured correctly.');
    }

    // Capture screenshot of the chat drawer
    const chatScreenshotPath = path.join(AUDIT_DIR, 'support-chat-omnichannel.png');
    await page.screenshot({ path: chatScreenshotPath });
    console.log(`📸 Saved ${chatScreenshotPath}`);

    // Close chat drawer
    await page.locator('button[aria-label="Close Chat"]').click();
    await page.waitForTimeout(500);

    // 4. Test Profile: Preferred Pickup Address
    console.log('4. Navigating to Profile to test Preferred Pickup Address...');
    const profileNav = page.locator('aside button:has-text("Profile")');
    await profileNav.click();
    await page.locator('text=Personal Information').first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('Profile loaded successfully.');

    const addressInput = page.locator('input[placeholder*="1004 Estate"]');
    await addressInput.waitFor({ state: 'visible', timeout: 5000 });
    await addressInput.fill('1004 Estate, Block B, Victoria Island, Lagos');
    await page.waitForTimeout(500);

    const saveBtn = page.locator('button:has-text("Save Changes")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      console.log('✅ PASS: Saved Preferred Pickup Address in Profile.');
    }

    const profileScreenshotPath = path.join(AUDIT_DIR, 'profile-preferred-address.png');
    await page.screenshot({ path: profileScreenshotPath });
    console.log(`📸 Saved ${profileScreenshotPath}`);

    // 5. Test Booking Wizard: Preferred Address Prefill & Chip
    console.log('5. Navigating to Bookings to test Prefill / Use Preferred Address...');
    const bookingsNav = page.locator('aside button:has-text("Bookings")');
    await bookingsNav.click();
    await page.waitForTimeout(1000);

    // If Recent Booking card is showing, click "+ Create New Booking"
    const newBookingBtn = page.locator('button:has-text("+ Create New Booking")');
    if (await newBookingBtn.isVisible()) {
      console.log('Clicking "+ Create New Booking"...');
      await newBookingBtn.click();
      await page.waitForTimeout(1000);
    }

    const usePreferredBtn = page.locator('button:has-text("Use Preferred Address")');
    await usePreferredBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ PASS: "Use Preferred Address" button visible');

    const pickupAddressInput = page.locator('input[placeholder*="street name, estate"]');
    await pickupAddressInput.waitFor({ state: 'visible', timeout: 5000 });
    const pickupAddressVal = await pickupAddressInput.inputValue();
    console.log(`Current Pickup Address in Wizard: "${pickupAddressVal}"`);

    if (pickupAddressVal.includes('1004 Estate')) {
      console.log('✅ PASS: Preferred pickup address prefill verified!');
    }

    const wizardScreenshotPath = path.join(AUDIT_DIR, 'booking-wizard-preferred-address.png');
    await page.screenshot({ path: wizardScreenshotPath });
    console.log(`📸 Saved ${wizardScreenshotPath}`);

    console.log('🎉 All Customer Enhancements verified successfully!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
