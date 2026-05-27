import { chromium } from 'playwright';
import * as path from 'path';

async function testBrowser() {
  console.log('Launching browser to test video playback and console errors...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  // Listen to page errors
  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err);
  });

  // Listen to network request failures
  page.on('requestfailed', request => {
    console.error(`BROWSER REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('Navigating to https://citasya-seven.vercel.app ...');
    await page.goto('https://citasya-seven.vercel.app/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for video / animations to load
    
    // Check if the video element exists and get its status
    const videoStats = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (!video) return { exists: false };
      return {
        exists: true,
        paused: video.paused,
        ended: video.ended,
        src: video.src,
        currentSrc: video.currentSrc,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error ? video.error.message : null
      };
    });

    console.log('Video stats inside browser:', videoStats);

    // Take screenshot to inspect visually
    const screenshotPath = path.resolve('C:/Users/alteu/.gemini/antigravity/brain/82821ff4-3d9f-4538-9699-87264bbcc988/browser_test.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('Error during browser test:', error);
  } finally {
    await browser.close();
  }
}

testBrowser();
