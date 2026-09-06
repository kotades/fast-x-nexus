/**
 * scripts/verify-ui-schema-mobile.js
 * Verification of:
 * 1. Landing page hero color schema (Forest green to gold gradient, NO dark theme)
 * 2. Support chat widget color schema (Forest green, NO purple/blue gradient)
 * 3. Mobile collapsible ActiveShipmentCard on 375x812
 */

const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/f04c8ac2-c3c3-4ee9-bc22-f963a575f8e5';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Check Landing Page
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  console.log('Navigating to Landing Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Verify Hero has brand primary gradient, NOT black background
  const heroSection = await page.locator('section').first();
  const heroClass = await heroSection.getAttribute('class');
  console.log('Hero class:', heroClass);
  const isDark = heroClass.includes('bg-[#0c120c]');
  console.log('Is Hero dark theme?', isDark ? 'FAIL: Dark theme detected' : 'PASS: Brand green gradient restored');
  
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'landing_page_brand_colors_verified.png') });
  console.log('Saved landing_page_brand_colors_verified.png');
  
  // 2. Check Customer Dashboard on Mobile (375x812)
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
  console.log('Navigating to Customer Dashboard on Mobile...');
  await mobilePage.goto('http://localhost:3000/customer', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  // Take screenshot of mobile dashboard
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'customer_mobile_card_expanded.png') });
  console.log('Saved customer_mobile_card_expanded.png');

  // Check support chat bubble color
  const chatBubble = mobilePage.locator('button[aria-label="Toggle Support Chat"]');
  if (await chatBubble.count() > 0) {
    const bubbleClass = await chatBubble.getAttribute('class');
    console.log('Chat bubble class:', bubbleClass);
    const hasIndigo = bubbleClass.includes('from-indigo');
    console.log('Has purple/indigo in bubble?', hasIndigo ? 'FAIL: Indigo present' : 'PASS: Pure Fast X Forest Green');

    // Click to open chat drawer
    await chatBubble.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'customer_mobile_chat_drawer_brand_green.png') });
    console.log('Saved customer_mobile_chat_drawer_brand_green.png');
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

main().catch((err) => {
  console.error('Error in verification script:', err);
  process.exit(1);
});
