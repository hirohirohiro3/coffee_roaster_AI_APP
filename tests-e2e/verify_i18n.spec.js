import { test, expect } from '@playwright/test';

test.describe('Internationalization Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the root page. The webServer in playwright.config.js will handle the URL.
    await page.goto('/');
    // Wait for the main content to be visible. Since we are logged in, this should be quick.
    await expect(page.locator('#main-content')).to_be_visible({ timeout: 10000 });
  });

  test('should correctly translate text on language switch', async ({ page }) => {
    // Switch to English
    const englishButtonSelector = 'button[data-lang="en"]';
    await expect(page.locator(englishButtonSelector)).to_be_visible();
    await page.locator(englishButtonSelector).click();

    // After clicking, wait for some text to be translated to confirm the change
    await expect(page.locator('button[data-i18n-key="addNewRoast"]')).to_have_text("Add New Roast", { timeout: 5000 });

    // --- Verification 1: Check empty roast list page ---
    const emptyAddButton = page.locator('#addNewRoastButtonEmpty');
    await expect(emptyAddButton).to_have_text("Record First Roast");
    await page.screenshot({ path: "jules-scratch/verification/verify_i18n_emptylist.png" });

    // --- Verification 2: Check Roast Form ---
    await page.locator('button[data-i18n-key="addNewRoast"]').click();
    await expect(page.locator('#roastFormSection')).to_be_visible();
    await page.locator('#aiIntegration').scroll_into_view_if_needed();

    const aiPromptButton = page.locator('button[data-i18n-key="createAiPrompt"]');
    await expect(aiPromptButton).to_have_text("🤖 Create & Copy AI Prompt");

    await page.locator('#roastForm').screenshot({ path: "jules-scratch/verification/verify_i18n_form.png" });
  });
});
