import { test, expect } from '@playwright/test';

test.describe('UI Improvements Verification', () => {
  test.beforeEach(async ({ page }) => {
    // All tests start at the root page, already logged in.
    await page.goto('/');
    // Wait for the main content to ensure the app has loaded post-login
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('should display the improved empty state correctly', async ({ page }) => {
    // The app starts with an empty list by default after login
    const emptyStateLocator = page.locator('div.text-center.py-12');
    await expect(emptyStateLocator).toBeVisible({ timeout: 10000 });

    // Check for the new font on the body
    const bodyFont = await page.evaluate("window.getComputedStyle(document.body).fontFamily");
    expect(bodyFont).toContain('Noto Sans JP');

    await page.screenshot({ path: 'jules-scratch/verification/01_empty_state.png' });
  });

  test('should display roast cards with new icons', async ({ page }) => {
    // Manually render a sample roast card
    await page.evaluate(() => {
      const sampleRoast = {
        id: 'sample-1',
        roastDate: '2024-01-15',
        beanName: 'エチオピア イルガチェフェ G1',
        roastLevel: 'シティロースト',
        totalRoastTime: '10:30',
        overallRating: 4.5,
        isFavorite: true,
        ratings: { flavor: 4, bitterness: 3, acidity: 5, sweetness: 4, body: 3 }
      };
      window.eventBus.emit('roasts:render-list', { roasts: [sampleRoast] });
    });

    const cardLocator = page.locator('div.roast-card');
    await expect(cardLocator).toBeVisible();

    // Check for one of the new icons
    const editButtonIcon = cardLocator.locator('.edit-btn svg');
    await expect(editButtonIcon).toBeVisible();

    await page.screenshot({ path: 'jules-scratch/verification/02_roast_card.png' });
  });

  test('should display enhanced focus on form inputs', async ({ page }) => {
    // Show the form
    await page.locator('#addNewRoastButton').click();

    const formLocator = page.locator('#roastFormSection');
    await expect(formLocator).toBeVisible();

    // Find an input, focus it, and take a screenshot
    const weightInput = page.locator('#greenBeanWeight');
    await weight_input.focus();

    // Check the box-shadow style
    const boxShadow = await weight_input.evaluate(element => {
        return window.getComputedStyle(element).boxShadow;
    });
    // The color is rgb(245, 158, 11)
    expect(boxShadow).toContain('rgb(245, 158, 11)');

    await page.screenshot({ path: 'jules-scratch/verification/03_form_focus.png' });
  });
});
