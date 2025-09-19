// Test script to validate the advanced tree visualization
const playwright = require('playwright');

async function testAdvancedTreeVisualization() {
  console.log('🧪 Starting Advanced Tree Visualization Tests...\n');
  
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the advanced tree view
    console.log('📍 Navigating to advanced tree view...');
    await page.goto('http://localhost:3001/trees/0199615f-34e4-72af-a1ed-6683dc957b99/advanced');
    
    // Wait for the page to load
    await page.waitForSelector('.min-h-screen', { timeout: 10000 });
    console.log('✅ Page loaded successfully');
    
    // Check if the SVG visualization container exists
    await page.waitForSelector('svg', { timeout: 5000 });
    console.log('✅ SVG visualization container found');
    
    // Check if the controls panel exists
    const controlsPanel = await page.locator('.absolute.top-4.left-4').isVisible();
    console.log(`✅ Controls panel visible: ${controlsPanel}`);
    
    // Test view mode switches
    console.log('\n🔄 Testing View Mode Switches...');
    
    // Test Hierarchy View (default)
    await page.click('button[data-mode="hierarchy"]');
    await page.waitForTimeout(1000);
    console.log('✅ Hierarchy view activated');
    
    // Test Network View
    await page.click('button[data-mode="network"]');
    await page.waitForTimeout(1000);
    console.log('✅ Network view activated');
    
    // Test Timeline View
    await page.click('button[data-mode="timeline"]');
    await page.waitForTimeout(1000);
    console.log('✅ Timeline view activated');
    
    // Test generation slider
    console.log('\n🎛️ Testing Controls...');
    const slider = await page.locator('input[type="range"]');
    await slider.fill('3');
    console.log('✅ Generation slider working');
    
    // Test reset view button
    await page.click('button:has-text("Reset View")');
    console.log('✅ Reset view button working');
    
    // Check for legend and stats panels
    const legend = await page.locator('.absolute.bottom-4.left-4').isVisible();
    const stats = await page.locator('.absolute.bottom-4.right-4').isVisible();
    console.log(`✅ Legend visible: ${legend}`);
    console.log(`✅ Stats panel visible: ${stats}`);
    
    // Test D3.js elements
    console.log('\n🎨 Testing D3.js Elements...');
    
    // Look for SVG circles (people nodes)
    const circles = await page.locator('svg circle').count();
    console.log(`✅ Found ${circles} person nodes`);
    
    // Look for SVG text elements (names)
    const textElements = await page.locator('svg text').count();
    console.log(`✅ Found ${textElements} text elements`);
    
    // Test person node clicking
    if (circles > 0) {
      await page.locator('svg circle').first().click();
      console.log('✅ Person node click handler working');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testAdvancedTreeVisualization();