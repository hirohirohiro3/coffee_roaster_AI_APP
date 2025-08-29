import asyncio
import subprocess
from playwright.async_api import async_playwright, expect
import os

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
        await asyncio.sleep(2)
        print("Server started on http://localhost:8080")

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # --- Login ---
            print("Navigating to login page...")
            await page.goto('http://localhost:8080/index.html')

            try:
                await expect(page.locator('#loginForm')).to_be_visible(timeout=5000)
                print("Login form found. Attempting login...")
                await page.locator('#loginEmail').fill('test@example.com')
                await page.locator('#loginPassword').fill('testpass123')
                await page.locator('#loginButton').click()
                await expect(page.locator('#main-content')).to_be_visible(timeout=10000)
                print("Login successful.")
            except Exception:
                print("Login form not found or login failed, assuming direct access to main page.")

            # --- Japanese Screenshots ---
            print("Capturing Japanese screenshots...")
            # Ensure page is in Japanese
            await page.get_by_role("button", name="日本語").click()
            await asyncio.sleep(1) # Wait for UI to update

            # Screenshot 1: Roast List (JA)
            await page.screenshot(path="01_roast_list_ja.png")
            print("Screenshot 1: Roast List (JA) captured.")

            # Screenshot 2: Roast Form (JA)
            await page.locator('#addNewRoastButton').click()
            await expect(page.locator('#roastForm')).to_be_visible(timeout=5000)
            await page.screenshot(path="02_roast_form_ja.png")
            print("Screenshot 2: Roast Form (JA) captured.")
            await page.locator('#cancelEditButton').click()
            await expect(page.locator('#roastForm')).to_be_hidden(timeout=5000)

            # --- English Screenshots ---
            print("Switching to English and capturing screenshots...")
            await page.get_by_role("button", name="English").click()
            await asyncio.sleep(1) # Wait for UI to update

            # Screenshot 3: Roast List (EN)
            await page.screenshot(path="03_roast_list_en.png")
            print("Screenshot 3: Roast List (EN) captured.")

            # Screenshot 4: Roast Form (EN)
            await page.locator('#addNewRoastButton').click()
            await expect(page.locator('#roastForm')).to_be_visible(timeout=5000)
            await page.screenshot(path="04_roast_form_en.png")
            print("Screenshot 4: Roast Form (EN) captured.")

            await browser.close()
            print("Playwright sequence complete.")

    finally:
        if server_process:
            print("Stopping server...")
            server_process.kill()
            await server_process.wait()
            print("Server stopped.")

if __name__ == '__main__':
    asyncio.run(main())
