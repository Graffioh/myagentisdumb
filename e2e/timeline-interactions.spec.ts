import { test, expect } from '@playwright/test';
import { setupWithSnapshot } from './helpers';

test.describe('Timeline Zoom and Pan', () => {
  test.beforeEach(async ({ page }) => {
    await setupWithSnapshot(page);
  });

  test('should render timeline with default zoom', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const timelineBars = await page.locator('.timeline-bar').count();
    expect(timelineBars).toBeGreaterThan(0);
  });

  test('should zoom in with mouse wheel', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const scrollContainer = page.locator('.timeline-scroll-container').first();
    const timelineTracks = page.locator('.timeline-tracks').first();

    const initialTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await scrollContainer.dispatchEvent('wheel', { deltaY: -100, clientX: 200, clientY: 300 });

    const zoomedTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    expect(zoomedTrackWidth).toBeGreaterThan(initialTrackWidth);
  });

  test('should zoom out with mouse wheel', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const scrollContainer = page.locator('.timeline-scroll-container').first();
    const timelineTracks = page.locator('.timeline-tracks').first();

    const initialTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await scrollContainer.dispatchEvent('wheel', { deltaY: 100, clientX: 200, clientY: 300 });

    const zoomedTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    expect(zoomedTrackWidth).toBeLessThan(initialTrackWidth);
  });

  test('should pan with mouse drag', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const scrollContainer = page.locator('.timeline-scroll-container').first();

    const box = await scrollContainer.boundingBox();
    if (!box) throw new Error('Scroll container not visible');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await scrollContainer.dispatchEvent('mousedown', { clientX: startX, clientY: startY, button: 0 });

    const hasDraggingClass = await scrollContainer.evaluate(el => el.classList.contains('dragging'));
    expect(hasDraggingClass).toBe(true);

    await page.locator('body').dispatchEvent('mousemove', { clientX: startX + 100, clientY: startY });

    await page.waitForTimeout(50);

    const scrollLeftAfterDrag = await scrollContainer.evaluate(el => el.scrollLeft);

    await page.locator('body').dispatchEvent('mouseup', { clientX: startX + 100, clientY: startY });

    const hasDraggingClassAfter = await scrollContainer.evaluate(el => el.classList.contains('dragging'));
    expect(hasDraggingClassAfter).toBe(false);
  });

  test('should maintain zoom state per invocation group', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });

    const groupCount = await page.locator('.invocation-group').count();

    if (groupCount < 2) {
      test.skip();
      return;
    }

    await page.click('.invocation-group:nth-child(1) .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const firstScrollContainer = page.locator('.timeline-scroll-container').nth(0);
    const firstTimelineTracks = page.locator('.timeline-tracks').nth(0);
    const firstInitialTrackWidth = await firstTimelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await firstScrollContainer.dispatchEvent('wheel', { deltaY: -100, clientX: 200, clientY: 300 });

    const firstZoomedTrackWidth = await firstTimelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await page.click('.invocation-group:nth-child(2) .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const secondScrollContainer = page.locator('.timeline-scroll-container').nth(1);
    const secondTimelineTracks = page.locator('.timeline-tracks').nth(1);
    const secondInitialTrackWidth = await secondTimelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await secondScrollContainer.dispatchEvent('wheel', { deltaY: -100, clientX: 200, clientY: 300 });

    const secondZoomedTrackWidth = await secondTimelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    expect(firstZoomedTrackWidth).toBeGreaterThan(firstInitialTrackWidth);
    expect(secondZoomedTrackWidth).toBeGreaterThan(secondInitialTrackWidth);
  });

  test('should reset zoom on page reload', async ({ page }) => {
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const scrollContainer = page.locator('.timeline-scroll-container').first();
    const timelineTracks = page.locator('.timeline-tracks').first();

    const initialTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    await scrollContainer.dispatchEvent('wheel', { deltaY: -200, clientX: 200, clientY: 300 });

    const zoomedTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    expect(zoomedTrackWidth).toBeGreaterThan(initialTrackWidth);

    await page.reload();
    await setupWithSnapshot(page);
    await page.waitForSelector('.invocation-group', { timeout: 5000 });
    await page.click('.invocation-group:first-child .action-button');
    await page.waitForSelector('.timeline-container', { timeout: 3000 });

    const reloadedTrackWidth = await timelineTracks.evaluate(el => {
      return el.getBoundingClientRect().width;
    });

    expect(reloadedTrackWidth).toBe(initialTrackWidth);
  });
});
