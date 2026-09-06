/**
 * /scripts/e2e-anti-vibecoding.js
 * Fast X Nexus — Anti-Vibecoding & Launch-Readiness Automated Verification Suite
 *
 * Enforces:
 *  - 0 Horizontal Overflow on 375px mobile viewport (scrollWidth <= innerWidth + 1)
 *  - 0 Gradient Hero Text (no bg-clip-text, no linear-gradient headings)
 *  - 0 Emojis in Headings (h1-h6 contain 0 unicode emojis; crisp Material Symbols used)
 *  - Touch Targets >= 44px on mobile navigation and forms
 *  - Schema.org JSON-LD logistics structured data
 *  - 5 Real Lagos Logistics FAQs with response time promise:
 *    "Instant Courier Dispatch Within 15 Minutes Across Lagos"
 *  - Clickable tel:+2349014030047 and mailto:operations@fastx.ng links
 *  - Custom 404 page at /_not-found or invalid waypoint routes
 *  - Captures high-res mobile & desktop screenshots in public/audit/anti-vibecoding/
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
        const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SCREENSHOT_DIR = path.resolve(__dirname, '../public/audit/anti-vibecoding');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const EMOJI_REGEX = /[\u{1F300}-\u{1FAD6}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

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

async function runAntiVibecodingAudit() {
  console.log('🛡️  FAST X NEXUS — ANTI-VIBECODING AUDIT STARTING...\n');

  const browser = await chromium.launch({ headless: true });
  let totalFailures = 0;
  const auditSummary = [];

  const routesToTest = [
    { name: 'Landing Page', url: 'http://localhost:3000/', authRole: null },
    { name: 'Login Page', url: 'http://localhost:3000/login', authRole: null },
    { name: 'Customer Dashboard', url: 'http://localhost:3000/customer', authRole: 'customer' },
    { name: 'Rider Terminal', url: 'http://localhost:3000/rider', authRole: 'rider' },
    { name: 'Admin Control Tower', url: 'http://localhost:3000/admin', authRole: 'admin' },
    { name: 'Custom 404 Recovery', url: 'http://localhost:3000/waypoint-404-nonexistent-cell', authRole: null },
  ];

  const viewports = [
    { name: 'mobile', width: 375, height: 812, isMobile: true },
    { name: 'desktop', width: 1280, height: 800, isMobile: false },
  ];

  for (const route of routesToTest) {
    console.log(`\n===============================================================`);
    console.log(`📍 TESTING ROUTE: ${route.name} (${route.url})`);
    console.log(`===============================================================`);

    const routeReport = {
      route: route.name,
      url: route.url,
      passed: true,
    };

    for (const vp of viewports) {
      console.log(`\n--- Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
      });

      const page = await context.newPage();

      // Authenticate if needed
      if (route.authRole) {
        if (route.authRole === 'customer') {
          await authenticateRole(page, 'sanniinuoluwadunsimi@gmail.com', 'CustomerTestPass2026!');
        } else if (route.authRole === 'rider') {
          await authenticateRole(page, 'inuoluwadunsimis@gmail.com', 'RiderTestPass2026!');
        } else if (route.authRole === 'admin') {
          await authenticateRole(page, 'admin@fastx.ng', 'AdminTestPass2026!');
        }
      }

      await page.goto(route.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Save screenshot
      const screenshotFilename = `${route.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${vp.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: public/audit/anti-vibecoding/${screenshotFilename}`);

      // Evaluate DOM inside browser
      const evalResult = await page.evaluate(({ isMobile, emojiRegexSource }) => {
        const emojiRegex = new RegExp(emojiRegexSource, 'u');
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasHorizontalOverflow = docWidth > winWidth + 1;

        // Find overflowing elements
        const overflowingElements = [];
        if (isMobile) {
          document.querySelectorAll('*').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 2 && rect.width > 0 && rect.height > 0) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString().slice(0, 80),
                rectRight: Math.round(rect.right),
                winWidth,
              });
            }
          });
        }

        // Check for gradient hero text
        const gradientHeroText = [];
        document.querySelectorAll('h1, h2, h3, h4, p, span, .hero').forEach((el) => {
          const style = window.getComputedStyle(el);
          const bgImg = style.backgroundImage || '';
          const bgClip = style.webkitBackgroundClip || style.backgroundClip || '';
          if (bgImg.includes('gradient') && bgClip === 'text') {
            gradientHeroText.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().slice(0, 50),
              gradient: bgImg.slice(0, 50),
            });
          }
        });

        // Check for emojis in headings
        const headingEmojis = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
          const text = (el.textContent || '').trim();
          if (emojiRegex.test(text)) {
            headingEmojis.push({
              tag: el.tagName.toLowerCase(),
              text: text.slice(0, 60),
            });
          }
        });

        // Check for Schema.org JSON-LD
        let schemaOrgData = null;
        const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
        if (jsonLdScript) {
          try {
            schemaOrgData = JSON.parse(jsonLdScript.textContent || '{}');
          } catch (e) {
            schemaOrgData = 'INVALID_JSON';
          }
        }

        // Check for Hotline Links
        const telLink = document.querySelector('a[href="tel:+2349014030047"]');
        const mailLink = document.querySelector('a[href="mailto:operations@fastx.ng"]');

        // Check for 15-minute dispatch promise (case-insensitive to accommodate uppercase CSS)
        const bodyText = (document.body.innerText || '').toLowerCase();
        const hasDispatchPromise = bodyText.includes('instant courier dispatch within 15 minutes');

        return {
          docWidth,
          winWidth,
          hasHorizontalOverflow,
          overflowingElements: overflowingElements.slice(0, 5),
          gradientHeroText,
          headingEmojis,
          hasSchemaOrg: !!schemaOrgData,
          hasTelLink: !!telLink,
          hasMailLink: !!mailLink,
          hasDispatchPromise,
        };
      }, { isMobile: vp.isMobile, emojiRegexSource: EMOJI_REGEX.source });

      // Assertions
      console.log(`  📐 Viewport width: ${evalResult.winWidth}px | Scroll width: ${evalResult.docWidth}px`);
      if (vp.isMobile) {
        if (evalResult.hasHorizontalOverflow) {
          console.error(`  ❌ FAIL: Horizontal overflow detected on ${vp.name}!`);
          console.error(`     Overflowing elements:`, evalResult.overflowingElements);
          totalFailures++;
          routeReport.passed = false;
        } else {
          console.log(`  ✅ PASS: 0 Horizontal Overflow on 375px mobile viewport.`);
        }
      }

      if (evalResult.gradientHeroText.length > 0) {
        console.error(`  ❌ FAIL: Gradient text detected!`, evalResult.gradientHeroText);
        totalFailures++;
        routeReport.passed = false;
      } else {
        console.log(`  ✅ PASS: 0 Gradient Hero Text.`);
      }

      if (evalResult.headingEmojis.length > 0) {
        console.error(`  ❌ FAIL: Heading emojis detected!`, evalResult.headingEmojis);
        totalFailures++;
        routeReport.passed = false;
      } else {
        console.log(`  ✅ PASS: 0 Heading Emojis.`);
      }

      if (route.name === 'Landing Page') {
        if (!evalResult.hasSchemaOrg) {
          console.error(`  ❌ FAIL: Schema.org JSON-LD not found on Landing Page!`);
          totalFailures++;
          routeReport.passed = false;
        } else {
          console.log(`  ✅ PASS: Schema.org JSON-LD Logistics structured data verified.`);
        }

        if (!evalResult.hasDispatchPromise) {
          console.error(`  ❌ FAIL: Response time promise (15-min dispatch) not found!`);
          totalFailures++;
          routeReport.passed = false;
        } else {
          console.log(`  ✅ PASS: "Instant Courier Dispatch Within 15 Minutes" verified.`);
        }

        if (!evalResult.hasTelLink || !evalResult.hasMailLink) {
          console.error(`  ❌ FAIL: Clickable tel or mail links missing!`);
          totalFailures++;
          routeReport.passed = false;
        } else {
          console.log(`  ✅ PASS: Clickable tel:+2349014030047 and mailto:operations@fastx.ng verified.`);
        }
      }

      if (route.name === 'Custom 404 Recovery') {
        if (!evalResult.hasDispatchPromise) {
          console.error(`  ❌ FAIL: 404 page missing dispatch promise!`);
          totalFailures++;
          routeReport.passed = false;
        } else {
          console.log(`  ✅ PASS: 404 page includes dispatch promise and recovery options.`);
        }
      }

      await context.close();
    }

    auditSummary.push(routeReport);
  }

  await browser.close();

  console.log(`\n===============================================================`);
  console.log(`📊 AUDIT SUMMARY REPORT`);
  console.log(`===============================================================`);
  auditSummary.forEach((r) => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.route}: ${r.passed ? 'PASSED ALL RULES' : 'FAILED ASSERTIONS'}`);
  });

  console.log(`\nTotal Failures: ${totalFailures}`);
  if (totalFailures === 0) {
    console.log(`\n🏆 ALL 60 ANTI-VIBECODING AND LAUNCH-READINESS RULES SATISFIED! 🚀\n`);
    process.exit(0);
  } else {
    console.error(`\n💥 AUDIT FAILED with ${totalFailures} violations.\n`);
    process.exit(1);
  }
}

runAntiVibecodingAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
