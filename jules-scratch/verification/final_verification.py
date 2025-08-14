import asyncio
import subprocess
import time
from playwright.async_api import async_playwright, expect

async def main():
    server_process = None
    try:
        # 1. Start the local server
        print("Starting local server...")
        server_process = await asyncio.create_subprocess_shell(
            'python -m http.server 8080',
            cwd='public',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        # Give the server a moment to start
        await asyncio.sleep(2)
        print("Server started.")

        # 2. Run the Playwright sequence
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # --- Login ---
            await page.goto('http://localhost:8080/')
            await expect(page.locator('#loginForm')).toBeVisible()
            await page.locator('#loginEmail').fill('test@example.com')
            await page.locator('#loginPassword').fill('testpass123')
            await page.locator('#loginButton').click()
            await expect(page.locator('#main-content')).toBeVisible({ 'timeout': 10000 })
            print("Login successful.")

            # --- Take Screenshots ---

            # Screenshot 1: Empty state
            # The app starts in the empty state after login
            empty_state_locator = page.locator('div.text-center.py-12')
            await expect(empty_state_locator).toBeVisible()
            body_font = await page.evaluate("window.getComputedStyle(document.body).fontFamily")
            if 'Noto Sans JP' not in body_font:
                raise Exception(f"Incorrect font detected: {body_font}")
            await page.screenshot(path="jules-scratch/verification/01_empty_state.png")
            print("Screenshot 1: Empty state captured.")

            # Screenshot 2: Roast card with icons
            await page.evaluate("""
                const sampleRoast = { id: 'sample-1', roastDate: '2024-01-15', beanName: 'エチオピア イルガチェフェ G1', roastLevel: 'シティロースト', totalRoastTime: '10:30', overallRating: 4.5, isFavorite: true, ratings: { flavor: 4, bitterness: 3, acidity: 5, sweetness: 4, body: 3 } };
                window.eventBus.emit('roasts:render-list', { roasts: [sampleRoast] });
            """)
            card_locator = page.locator('div.roast-card')
            await expect(card_locator).toBeVisible()
            await page.screenshot(path="jules-scratch/verification/02_roast_card.png")
            print("Screenshot 2: Roast card captured.")

            # Screenshot 3: Form input focus
            await page.locator('#addNewRoastButton').click()
            form_locator = page.locator('#roastFormSection')
            await expect(form_locator).toBeVisible()
            weight_input = page.locator('#greenBeanWeight')
            await weight_input.focus()
            await asyncio.sleep(0.3) # Wait for focus style
            await page.screenshot(path="jules-scratch/verification/03_form_focus.png")
            print("Screenshot 3: Form input focus captured.")

            await browser.close()
            print("Playwright sequence complete.")

    finally:
        # 3. Stop the server
        if server_process:
            print("Stopping server...")
            server_process.kill()
            await server_process.wait()
            print("Server stopped.")

if __name__ == '__main__':
    asyncio.run(main())
