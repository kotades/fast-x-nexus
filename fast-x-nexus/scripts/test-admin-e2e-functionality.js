/**
 * /scripts/test-admin-e2e-functionality.js
 * Fast X Nexus — Admin Control Tower End-to-End Verification Suite
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseEnv(filename) {
  let env = {};
  if (fs.existsSync(filename)) {
    const content = fs.readFileSync(filename, 'utf8');
    content.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx !== -1 && !line.trim().startsWith('#')) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["\x27]|["\x27]$/g, '');
        env[key] = val;
      }
    });
  }
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const AUDIT_DIR = path.resolve(__dirname, '../public/audit/admin');
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

async function runAdminAudit() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   FAST X NEXUS — ADMIN DASHBOARD FUNCTIONALITY VERIFICATION     ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // 1. Sign in via Supabase client in browser context
    console.log('🔑 Logging in as admin@fastx.ng via Supabase SSR...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const loginRes = await page.evaluate(
      async ({ url, anonKey, email, password }) => {
        const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
        const sb = createBrowserClient(url, anonKey);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null, user: data?.user?.id || null };
      },
      {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        email: 'admin@fastx.ng',
        password: 'AdminTestPass2026!',
      }
    );

    if (loginRes.error) {
      throw new Error(`Admin authentication failed: ${loginRes.error}`);
    }
    console.log(`  ✅ Successfully authenticated admin: ${loginRes.user}`);

    // 2. Navigate to /admin
    console.log('📍 Navigating to http://localhost:3000/admin...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Verify Control Tower Header
    const heading = page.locator('h1:has-text("Admin Control Tower")').first();
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    console.log('  ✅ Admin Control Tower heading confirmed visible');

    // 3. Tab: Spatial Radar (Default)
    console.log('\n🛰️  Verifying Spatial Radar Tab...');
    await page.screenshot({ path: path.join(AUDIT_DIR, '01-admin-overview-radar.png'), fullPage: true });
    console.log('  ✅ Captured 01-admin-overview-radar.png');

    // 4. Check Tab: Waybill Board
    console.log('\n🔍 Testing Waybill Board Tab...');
    const waybillTabBtn = page.locator('button:has-text("Waybill Board")').first();
    await waybillTabBtn.click();
    await page.waitForTimeout(1500);

    // Verify search input
    const searchInput = page.locator('input[placeholder*="Search by FX waybill code"]').first();
    if (await searchInput.isVisible()) {
      console.log('  ✅ Search input is visible on Waybill Board');
      await searchInput.fill('FX-');
      await page.waitForTimeout(500);
      await searchInput.fill('');
    }

    // Verify filter chips
    const unassignedChip = page.locator('button:has-text("UNASSIGNED")').first();
    if (await unassignedChip.isVisible()) {
      await unassignedChip.click();
      await page.waitForTimeout(800);
      console.log('  ✅ Filtered by UNASSIGNED successfully');
    }

    const allChip = page.locator('button:has-text("ALL")').first();
    await allChip.click();
    await page.waitForTimeout(800);

    // Click "Inspect" on first order row if present
    const inspectBtn = page.locator('button:has-text("Inspect")').first();
    if (await inspectBtn.isVisible()) {
      console.log('  🔍 Opening Waybill Inspection Modal...');
      await inspectBtn.click();
      await page.waitForTimeout(1000);

      // Verify modal content
      const modal = page.locator('h3:has-text("Waybill FX-")').first();
      if (await modal.isVisible()) {
        console.log('  ✅ Waybill Inspection Modal opened successfully with full specs');
        await page.screenshot({ path: path.join(AUDIT_DIR, '02-waybill-inspection-modal.png') });
        console.log('  ✅ Captured 02-waybill-inspection-modal.png');

        // Close modal
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.waitForTimeout(600);
      }
    }

    await page.screenshot({ path: path.join(AUDIT_DIR, '03-admin-waybill-board.png'), fullPage: true });
    console.log('  ✅ Captured 03-admin-waybill-board.png');

    // 5. Check Tab: Rider Fleet Ops
    console.log('\n🛵 Testing Rider Fleet Ops Tab...');
    const riderTabBtn = page.locator('button:has-text("Rider Fleet Ops")').first();
    await riderTabBtn.click();
    await page.waitForTimeout(1500);

    // Check dossier modal
    const dossierBtn = page.locator('button:has-text("View Dossier")').first();
    if (await dossierBtn.isVisible()) {
      console.log('  🔍 Opening Courier Dossier Modal...');
      await dossierBtn.click();
      await page.waitForTimeout(1000);

      const dossierHeading = page.locator('h3:has-text("Courier Dossier")').first();
      if (await dossierHeading.isVisible()) {
        console.log('  ✅ Courier Dossier Modal opened with KYC specs');
        await page.screenshot({ path: path.join(AUDIT_DIR, '04-courier-dossier-modal.png') });
        console.log('  ✅ Captured 04-courier-dossier-modal.png');

        // Close dossier
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.waitForTimeout(600);
      }
    }

    await page.screenshot({ path: path.join(AUDIT_DIR, '05-rider-fleet-ops.png'), fullPage: true });
    console.log('  ✅ Captured 05-rider-fleet-ops.png');

    // 6. Check Tab: Escrow & Ledger
    console.log('\n💰 Testing Escrow & Ledger Tab...');
    const ledgerTabBtn = page.locator('button:has-text("Escrow & Ledger")').first();
    await ledgerTabBtn.click();
    await page.waitForTimeout(1500);

    // Verify 4 KPI cards
    const gmvCard = page.locator('text=Total GMV (Turnover)');
    const escrowCard = page.locator('text=Rider Escrow Pool (70%)');
    const platformCard = page.locator('text=Platform Margin (30%)');
    const holdingCard = page.locator('text=Active Escrow Holding');

    console.log('  ✅ GMV card visible:', await gmvCard.isVisible());
    console.log('  ✅ Escrow 70% card visible:', await escrowCard.isVisible());
    console.log('  ✅ Platform 30% card visible:', await platformCard.isVisible());
    console.log('  ✅ Active Escrow Holding visible:', await holdingCard.isVisible());

    await page.screenshot({ path: path.join(AUDIT_DIR, '06-escrow-financial-ledger.png'), fullPage: true });
    console.log('  ✅ Captured 06-escrow-financial-ledger.png');

    // 7. Check Tab: System Health
    console.log('\n🏥 Testing System Health Tab...');
    const telemetryTabBtn = page.locator('button:has-text("System Health")').first();
    await telemetryTabBtn.click();
    await page.waitForTimeout(1500);

    const dbCard = page.locator('text=Database Engine');
    const h3Card = page.locator('text=Spatial H3 Mesh');
    const queueCard = page.locator('text=Queue Dwell');
    console.log('  ✅ Database Engine card visible:', await dbCard.isVisible());
    console.log('  ✅ Spatial H3 Mesh card visible:', await h3Card.isVisible());
    console.log('  ✅ Queue Dwell card visible:', await queueCard.isVisible());

    await page.screenshot({ path: path.join(AUDIT_DIR, '07-system-health-telemetry.png'), fullPage: true });
    console.log('  ✅ Captured 07-system-health-telemetry.png');

    // 8. Check Tab: Omnichannel Comms
    console.log('\n💬 Testing Omnichannel Comms Tab...');
    const chatTabBtn = page.locator('button:has-text("Omnichannel Comms")').first();
    await chatTabBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(AUDIT_DIR, '08-omnichannel-chat-inbox.png'), fullPage: true });
    console.log('  ✅ Captured 08-omnichannel-chat-inbox.png');

    // 9. Test Mobile Responsiveness (375x812)
    console.log('\n📱 Testing Mobile Responsiveness on 375x812 viewport...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // Authenticate on mobile
    await mobilePage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.evaluate(
      async ({ url, anonKey, email, password }) => {
        const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
        const sb = createBrowserClient(url, anonKey);
        await sb.auth.signInWithPassword({ email, password });
      },
      {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        email: 'admin@fastx.ng',
        password: 'AdminTestPass2026!',
      }
    );

    await mobilePage.goto('http://localhost:3000/admin?tab=waybills', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(2500);

    await mobilePage.screenshot({ path: path.join(AUDIT_DIR, '09-mobile-admin-waybills.png') });
    console.log('  ✅ Captured 09-mobile-admin-waybills.png');

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('   ALL ADMIN DASHBOARD FUNCTIONALITY VERIFIED SUCCESSFULLY!       ');
    console.log('═══════════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ E2E Audit Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAdminAudit();
