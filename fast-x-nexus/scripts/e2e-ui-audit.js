/**
 * /scripts/e2e-ui-audit.js
 * Fast X Nexus — Playwright E2E UI/UX Design Audit & Telemetry Suite
 *
 * Inspects all 5 core surfaces across Desktop (1366x768) & Mobile (375x812):
 *  1. Landing Page (http://localhost:3000/)
 *  2. Login & Auth (http://localhost:3000/login)
 *  3. Customer Dashboard & Booking Wizard (http://localhost:3000/customer)
 *  4. Rider Terminal (http://localhost:3000/rider)
 *  5. Admin Control Tower (http://localhost:3000/admin)
 *
 * Captures high-resolution visual screenshots and performs rigorous automated
 * audits against WCAG 2.1 AA/AAA, UI-UX-Pro-Max, and Superpowers design standards.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse environment variables
function parseEnv(filename) {
  const env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Paths for screenshots
const PUBLIC_AUDIT_DIR = path.resolve(__dirname, '../public/audit');
const ARTIFACT_AUDIT_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/81fd792a-7319-4878-9fbd-0c978a292bf5/audit';
const AUDIT_REPORT_PATH = path.resolve(__dirname, '../public/audit/audit-report.json');

fs.mkdirSync(PUBLIC_AUDIT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_AUDIT_DIR, { recursive: true });

async function saveScreenshot(page, filename, options = {}) {
  const publicPath = path.join(PUBLIC_AUDIT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_AUDIT_DIR, filename);
  
  await page.screenshot({ path: publicPath, ...options });
  fs.copyFileSync(publicPath, artifactPath);
  console.log(`📸 [Screenshot Saved]: ${filename}`);
}

// Ensure seeded DB state for rich UI visualization
async function seedAuditData() {
  console.log('🌱 Seeding rich audit data into Supabase...');

  const customerId = '146c79bf-1e11-4ccd-8b58-5cdfb763cadd'; // sanniinuoluwadunsimi@gmail.com
  const riderId = '589d8701-f284-4e40-823d-ee57e8459788';    // inuoluwadunsimis@gmail.com

  // 1. Update rider location to now
  await admin.from('rider_locations').upsert({
    rider_id: riderId,
    latitude: 6.5744,
    longitude: 3.3692,
    h3_cell: '8924300aa4bffff',
    updated_at: new Date().toISOString(),
  });

  // 2. Ensure we have at least one unassigned order for rider job pool & admin pool
  const { data: existingPool } = await admin
    .from('orders')
    .select('id')
    .eq('status', 'PAID_UNASSIGNED')
    .limit(1);

  if (!existingPool || existingPool.length === 0) {
    const { data: poolOrder } = await admin.from('orders').insert({
      customer_id: customerId,
      status: 'PAID_UNASSIGNED',
      pickup_h3_cell: '8924300aa4bffff',
      dropoff_h3_cell: '8924300aa4b0000',
      total_amount: 18500,
      pickup_name: 'Dr. Adeyemi Adeleke (Maryland Mall)',
      pickup_phone: '+2348031122334',
      pickup_address: 'Maryland Mall, Ikorodu Road, Lagos',
      dropoff_name: 'Chief Babatunde Sanwo (Ikoyi Crescent)',
      dropoff_phone: '+2348099887766',
      dropoff_address: '14 Alexander Avenue, Ikoyi, Lagos',
      preferred_delivery_time: new Date(Date.now() + 7200000).toISOString(),
    }).select().single();

    if (poolOrder) {
      await admin.from('parcels').insert({
        order_id: poolOrder.id,
        weight: 3.2,
        description: 'Pharmaceutical Bio-Samples (Cold Chain)',
        declared_value: 850000,
      });
    }
  }

  // 3. Ensure we have at least one active in-transit order for Customer & Rider active tabs
  const { data: existingActive } = await admin
    .from('orders')
    .select('id')
    .in('status', ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'])
    .limit(1);

  if (!existingActive || existingActive.length === 0) {
    const { data: activeOrder } = await admin.from('orders').insert({
      customer_id: customerId,
      rider_id: riderId,
      status: 'IN_TRANSIT',
      pickup_h3_cell: '8924300aa4bffff',
      dropoff_h3_cell: '8924300aa4b0000',
      total_amount: 28000,
      pickup_name: 'Engr. Dapo Williams (Ikeja City Mall)',
      pickup_phone: '+2348021112233',
      pickup_address: 'Obafemi Awolowo Way, Ikeja, Lagos',
      dropoff_name: 'Hajiya Amina Bello (Victoria Garden City)',
      dropoff_phone: '+2348065554433',
      dropoff_address: 'Victoria Garden City, Lekki-Epe Expressway, Lagos',
      preferred_delivery_time: new Date(Date.now() + 3600000).toISOString(),
    }).select().single();

    if (activeOrder) {
      await admin.from('parcels').insert({
        order_id: activeOrder.id,
        weight: 6.8,
        description: 'Server Blades & Fiber Optic Transceivers',
        declared_value: 4200000,
      });
    }
  }

  console.log('✅ Audit data seeded successfully.');
}

// In-browser automated UX and Accessibility evaluator
async function runDomAudit(page, pageName, viewportName) {
  return await page.evaluate(({ pageName, viewportName }) => {
    const auditResults = {
      page: pageName,
      viewport: viewportName,
      url: window.location.href,
      documentTitle: document.title,
      timestamp: new Date().toISOString(),
      viewportDimensions: { width: window.innerWidth, height: window.innerHeight },
      scrollDimensions: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      overflowingElements: [],
      smallTouchTargets: [],
      formIssues: [],
      typographySample: [],
      headingsHierarchy: [],
      imagesAudit: [],
      unlabeledButtons: [],
    };

    // 1. Check for horizontal overflow elements
    const allElements = Array.from(document.querySelectorAll('*'));
    allElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 4 && rect.width > 0 && rect.height > 0) {
        auditResults.overflowingElements.push({
          tagName: el.tagName.toLowerCase(),
          className: (el.className || '').toString().slice(0, 100),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    auditResults.overflowingElements = auditResults.overflowingElements.slice(0, 10);

    // 2. Touch targets on interactive elements (< 44x44px for mobile standard)
    const interactive = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
    interactive.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 40);
        if (rect.width < 44 || rect.height < 44) {
          auditResults.smallTouchTargets.push({
            tagName: el.tagName.toLowerCase(),
            text,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            classes: (el.className || '').toString().slice(0, 80),
          });
        }
      }
    });
    auditResults.smallTouchTargets = auditResults.smallTouchTargets.slice(0, 15);

    // Unlabeled buttons
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach((btn) => {
      const text = (btn.innerText || '').trim();
      const aria = btn.getAttribute('aria-label');
      const title = btn.getAttribute('title');
      if (!text && !aria && !title) {
        auditResults.unlabeledButtons.push({
          html: btn.outerHTML.slice(0, 100),
          classes: (btn.className || '').toString().slice(0, 80),
        });
      }
    });

    // 3. Form input ergonomics
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    inputs.forEach((input) => {
      const id = input.id;
      const hasAssociatedLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
      const hasParentLabel = !!input.closest('label');
      const ariaLabel = input.getAttribute('aria-label');
      const placeholder = input.getAttribute('placeholder');
      const inputMode = input.getAttribute('inputmode');
      const type = input.getAttribute('type') || 'text';

      if (!hasAssociatedLabel && !hasParentLabel && !ariaLabel) {
        auditResults.formIssues.push({
          type,
          id: id || null,
          placeholder: placeholder || null,
          issue: 'Missing explicit label or aria-label (placeholder-only or unlabelled)',
        });
      }

      if ((type === 'tel' || type === 'number') && !inputMode) {
        auditResults.formIssues.push({
          type,
          id: id || null,
          issue: 'Missing inputmode for virtual mobile keyboard optimization',
        });
      }
    });

    // 4. Typography font families and styles
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, p, span, button')).slice(0, 25);
    headings.forEach((el) => {
      const style = window.getComputedStyle(el);
      auditResults.typographySample.push({
        tag: el.tagName.toLowerCase(),
        fontFamily: style.fontFamily.split(',')[0].replace(/['\"]/g, '').trim(),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
      });
    });

    // 5. Headings structure
    const headingTags = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
    headingTags.forEach((h) => {
      auditResults.headingsHierarchy.push({
        level: h.tagName.toLowerCase(),
        text: (h.innerText || '').trim().slice(0, 50),
      });
    });

    // 6. Image audit (alt tags, broken src)
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach((img) => {
      auditResults.imagesAudit.push({
        src: img.src.slice(0, 100),
        alt: img.alt || null,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        hasAlt: !!img.alt && img.alt.trim().length > 0,
        isBroken: img.naturalWidth === 0 && img.src.length > 0,
      });
    });

    return auditResults;
  }, { pageName, viewportName });
}

// Helper to authenticate session in page context
async function authenticateRole(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

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

async function runFullAudit() {
  console.log('🚀 Starting Fast X Nexus Comprehensive UI/UX Design Audit...');
  await seedAuditData();

  const auditReport = {
    generatedAt: new Date().toISOString(),
    pagesAudited: [],
  };

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    {
      name: 'desktop',
      width: 1366,
      height: 768,
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    },
    {
      name: 'mobile',
      width: 375,
      height: 812,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  ];

  for (const vp of viewports) {
    console.log(`\n==================================================`);
    console.log(`🔍 AUDITING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`==================================================`);

    // ----------------------------------------------------
    // 1. LANDING PAGE
    // ----------------------------------------------------
    {
      console.log(`\n📄 [1/5] Auditing Landing Page (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Capture desktop/mobile screenshots
      await saveScreenshot(page, `01-landing-${vp.name}-full.png`, { fullPage: true });
      await saveScreenshot(page, `01-landing-${vp.name}-viewport.png`, { fullPage: false });

      // If mobile, try opening the mobile navigation menu
      if (vp.name === 'mobile') {
        const menuButton = page.locator('button[aria-label="Toggle mobile menu"], button:has(.material-symbols-outlined:text-is("menu"))');
        if (await menuButton.count() > 0) {
          console.log('   Opening Landing mobile menu drawer...');
          try {
            await menuButton.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(600);
            await saveScreenshot(page, `01-landing-mobile-drawer.png`, { fullPage: false });
          } catch (e) {
            console.log('   Could not open landing mobile drawer:', e.message);
          }
        }
      }

      const domAudit = await runDomAudit(page, 'Landing', vp.name);
      domAudit.consoleErrors = consoleErrors;
      auditReport.pagesAudited.push(domAudit);
      await context.close();
    }

    // ----------------------------------------------------
    // 2. LOGIN PAGE
    // ----------------------------------------------------
    {
      console.log(`\n📄 [2/5] Auditing Login & Auth Page (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await saveScreenshot(page, `02-login-${vp.name}-phone.png`, { fullPage: false });

      // Switch to Magic Link tab
      const emailTab = page.locator('button:has-text("Magic Link")');
      if (await emailTab.count() > 0) {
        console.log('   Switching to Login Magic Link Tab...');
        try {
          await emailTab.first().click({ force: true, timeout: 5000 });
          await page.waitForTimeout(600);
          await saveScreenshot(page, `02-login-${vp.name}-magiclink.png`, { fullPage: false });
        } catch (e) {
          console.log('   Could not switch to Magic Link tab:', e.message);
        }
      }

      const domAudit = await runDomAudit(page, 'Login', vp.name);
      domAudit.consoleErrors = consoleErrors;
      auditReport.pagesAudited.push(domAudit);
      await context.close();
    }

    // ----------------------------------------------------
    // 3. CUSTOMER DASHBOARD & BOOKING WIZARD
    // ----------------------------------------------------
    {
      console.log(`\n📄 [3/5] Auditing Customer Dashboard & Booking Wizard (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: vp.deviceScaleFactor,
        geolocation: { latitude: 6.5244, longitude: 3.3792 },
        permissions: ['geolocation'],
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Authenticate Customer
      await authenticateRole(page, 'sanniinuoluwadunsimi@gmail.com', 'CustomerTestPass2026!');
      await page.goto('http://localhost:3000/customer', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Capture Command Map view
      await saveScreenshot(page, `03-customer-${vp.name}-command-map.png`, { fullPage: false });

      if (vp.name === 'mobile') {
        const menuBtn = page.locator('header button:has(.material-symbols-outlined:text-is("menu")), button[aria-label="Toggle Menu"]');
        if (await menuBtn.count() > 0) {
          console.log('   Opening Customer mobile sidebar drawer...');
          try {
            await menuBtn.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(800);
            await saveScreenshot(page, `03-customer-mobile-drawer.png`, { fullPage: false });

            // Navigate to Booking Wizard from drawer
            const bookingInDrawer = page.locator('aside button:has-text("Bookings")');
            if (await bookingInDrawer.count() > 0) {
              console.log('   Clicking Bookings in drawer...');
              await bookingInDrawer.first().click({ force: true, timeout: 5000 });
              await page.waitForTimeout(1500);
              await saveScreenshot(page, `03-customer-mobile-booking-step1.png`, { fullPage: false });
            }

            // Open drawer again and navigate to History
            await menuBtn.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(800);
            const historyInDrawer = page.locator('aside button:has-text("History")');
            if (await historyInDrawer.count() > 0) {
              console.log('   Clicking History in drawer...');
              await historyInDrawer.first().click({ force: true, timeout: 5000 });
              await page.waitForTimeout(1500);
              await saveScreenshot(page, `03-customer-mobile-activity-ledger.png`, { fullPage: false });
            }
          } catch (e) {
            console.log('   Customer mobile drawer interaction error:', e.message);
          }
        }
      } else {
        // Desktop navigation: Wait for sidebar items to mount
        try {
          await page.waitForSelector('aside button:has-text("Bookings")', { timeout: 8000 });
          const bookingNav = page.locator('aside button:has-text("Bookings")');
          if (await bookingNav.count() > 0) {
            console.log('   Navigating to Customer Booking Wizard...');
            await bookingNav.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(1500);
            await saveScreenshot(page, `03-customer-desktop-booking-step1.png`, { fullPage: false });
          }

          const historyNav = page.locator('aside button:has-text("History")');
          if (await historyNav.count() > 0) {
            console.log('   Navigating to Customer Activity Ledger...');
            await historyNav.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(1500);
            await saveScreenshot(page, `03-customer-desktop-activity-ledger.png`, { fullPage: false });
          }
        } catch (e) {
          console.log('   Desktop Customer navigation error:', e.message);
        }
      }

      const domAudit = await runDomAudit(page, 'Customer', vp.name);
      domAudit.consoleErrors = consoleErrors;
      auditReport.pagesAudited.push(domAudit);
      await context.close();
    }

    // ----------------------------------------------------
    // 4. RIDER TERMINAL
    // ----------------------------------------------------
    {
      console.log(`\n📄 [4/5] Auditing Rider Terminal (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: vp.deviceScaleFactor,
        geolocation: { latitude: 6.5744, longitude: 3.3692 },
        permissions: ['geolocation'],
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Authenticate Rider
      await authenticateRole(page, 'inuoluwadunsimis@gmail.com', 'RiderTestPass2026!');
      await page.goto('http://localhost:3000/rider', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Default: Job Pool
      await saveScreenshot(page, `04-rider-${vp.name}-job-pool.png`, { fullPage: false });

      if (vp.name === 'mobile') {
        const menuBtn = page.locator('header button:has(.material-symbols-outlined:text-is("menu")), button[aria-label="Toggle Menu"]');
        if (await menuBtn.count() > 0) {
          console.log('   Opening Rider mobile sidebar drawer...');
          try {
            await menuBtn.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(800);
            await saveScreenshot(page, `04-rider-mobile-drawer.png`, { fullPage: false });

            // Navigate to Active Jobs from drawer
            const activeJobsInDrawer = page.locator('aside button:has-text("Active Jobs")');
            if (await activeJobsInDrawer.count() > 0) {
              console.log('   Clicking Active Jobs in drawer...');
              await activeJobsInDrawer.first().click({ force: true, timeout: 5000 });
              await page.waitForTimeout(1500);
              await saveScreenshot(page, `04-rider-mobile-active-jobs.png`, { fullPage: false });
            }

            // Open drawer again and navigate to Dispatch Map
            await menuBtn.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(800);
            const mapInDrawer = page.locator('aside button:has-text("Dispatch Map")');
            if (await mapInDrawer.count() > 0) {
              console.log('   Clicking Dispatch Map in drawer...');
              await mapInDrawer.first().click({ force: true, timeout: 5000 });
              await page.waitForTimeout(1500);
              await saveScreenshot(page, `04-rider-mobile-dispatch-map.png`, { fullPage: false });
            }
          } catch (e) {
            console.log('   Rider mobile drawer error:', e.message);
          }
        }
      } else {
        // Desktop navigation: Wait for sidebar items to mount
        try {
          await page.waitForSelector('aside button:has-text("Active Jobs")', { timeout: 8000 });
          const activeJobsNav = page.locator('aside button:has-text("Active Jobs")');
          if (await activeJobsNav.count() > 0) {
            console.log('   Navigating to Rider Active Jobs...');
            await activeJobsNav.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(1500);
            await saveScreenshot(page, `04-rider-desktop-active-jobs.png`, { fullPage: false });
          }

          const mapNav = page.locator('aside button:has-text("Dispatch Map")');
          if (await mapNav.count() > 0) {
            console.log('   Navigating to Rider Dispatch Map...');
            await mapNav.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(1500);
            await saveScreenshot(page, `04-rider-desktop-dispatch-map.png`, { fullPage: false });
          }
        } catch (e) {
          console.log('   Desktop Rider navigation error:', e.message);
        }
      }

      const domAudit = await runDomAudit(page, 'Rider', vp.name);
      domAudit.consoleErrors = consoleErrors;
      auditReport.pagesAudited.push(domAudit);
      await context.close();
    }

    // ----------------------------------------------------
    // 5. ADMIN CONTROL TOWER
    // ----------------------------------------------------
    {
      console.log(`\n📄 [5/5] Auditing Admin Control Tower (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        deviceScaleFactor: vp.deviceScaleFactor,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Authenticate Admin
      await authenticateRole(page, 'admin@fastx.ng', 'AdminTestPass2026!');
      await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Overview / Metrics & Pipeline
      await saveScreenshot(page, `05-admin-${vp.name}-overview.png`, { fullPage: false });
      await saveScreenshot(page, `05-admin-${vp.name}-full.png`, { fullPage: true });

      if (vp.name === 'mobile') {
        const menuBtn = page.locator('header button:has(.material-symbols-outlined:text-is("menu")), button[aria-label="Toggle Menu"]');
        if (await menuBtn.count() > 0) {
          console.log('   Opening Admin mobile sidebar drawer...');
          try {
            await menuBtn.first().click({ force: true, timeout: 5000 });
            await page.waitForTimeout(800);
            await saveScreenshot(page, `05-admin-mobile-drawer.png`, { fullPage: false });
            // Click outside at x: 340, y: 200
            await page.mouse.click(340, 200);
            await page.waitForTimeout(400);
          } catch (e) {
            console.log('   Admin mobile drawer error:', e.message);
          }
        }
      }

      // Scroll to Fleet Radar Map
      const radarSection = page.locator('h2:has-text("Fleet Radar"), h3:has-text("Fleet Radar"), div:has-text("FLEET RADAR")');
      if (await radarSection.count() > 0) {
        await radarSection.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        await saveScreenshot(page, `05-admin-${vp.name}-radar.png`, { fullPage: false });
      }

      const domAudit = await runDomAudit(page, 'Admin', vp.name);
      domAudit.consoleErrors = consoleErrors;
      auditReport.pagesAudited.push(domAudit);
      await context.close();
    }
  }

  await browser.close();

  // Save JSON report
  fs.writeFileSync(AUDIT_REPORT_PATH, JSON.stringify(auditReport, null, 2));
  fs.writeFileSync(path.join(ARTIFACT_AUDIT_DIR, 'audit-report.json'), JSON.stringify(auditReport, null, 2));
  console.log(`\n✅ Audit Complete! Structured report saved to ${AUDIT_REPORT_PATH}`);
}

runFullAudit().catch((err) => {
  console.error('❌ UI Audit encountered a fatal error:', err);
  process.exit(1);
});
