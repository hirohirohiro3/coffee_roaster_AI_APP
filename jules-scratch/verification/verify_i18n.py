import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        file_path = os.path.abspath('public/index.html')
        await page.goto(f'file://{file_path}')

        await expect(page.locator('#main-content')).to_be_visible(timeout=10000)

        # Use a more robust selector for the language button
        english_button_selector = 'button[data-lang="en"]'
        await expect(page.locator(english_button_selector)).to_be_visible()
        await page.locator(english_button_selector).click()

        # After clicking, wait for some text to be translated to confirm the change
        # The "Add New Roast" button is a good candidate
        await expect(page.locator('button[data-i18n-key="addNewRoast"]')).to_have_text("Add New Roast", timeout=5000)

        # --- Verification 1: Check empty roast list page ---
        empty_add_button = page.locator('#addNewRoastButtonEmpty')
        await expect(empty_add_button).to_have_text("Record First Roast")
        await page.screenshot(path="jules-scratch/verification/verify_i18n_emptylist.png")

        # --- Verification 2: Check Roast Form ---
        await page.locator('button[data-i18n-key="addNewRoast"]').click()
        await expect(page.locator('#roastFormSection')).to_be_visible()
        await page.locator('#aiIntegration').scroll_into_view_if_needed()

        ai_prompt_button = page.locator('button[data-i18n-key="createAiPrompt"]')
        await expect(ai_prompt_button).to_have_text("🤖 Create & Copy AI Prompt")

        await page.locator('#roastForm').screenshot(path="jules-scratch/verification/verify_i18n_form.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
