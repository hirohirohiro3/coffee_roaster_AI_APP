import asyncio
import subprocess
from playwright.async_api import async_playwright, expect
import os

async def main():
    server_process = None
    try:
        print("Starting local server...")
        server_process = await asyncio.create_subprocess_shell(
            'python -m http.server 8080',
            cwd='public',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        await asyncio.sleep(2)
        print("Server started.")

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            print("Navigating to login page...")
            await page.goto('http://localhost:8080/index.html')

            try:
                await expect(page.locator('#loginForm')).to_be_visible(timeout=10000)
                print("Logging in...")
                await page.locator('#loginEmail').fill('test@example.com')
                await page.locator('#loginPassword').fill('testpass123')
                await page.locator('#loginButton').click()
                await expect(page.locator('#main-content')).to_be_visible(timeout=15000)
                print("Login successful.")
            except Exception:
                print("Login form not found, proceeding.")

            print("Switching to English...")
            await page.get_by_role("button", name="English").click()
            await asyncio.sleep(1)

            print("Capturing English roast list screenshot...")
            await page.screenshot(path="roast_list_en.png")
            print("Roast list screenshot saved.")

            print("Capturing English roast form screenshot...")
            await page.locator('#addNewRoastButton').click()
            await expect(page.locator('#roastForm')).to_be_visible(timeout=5000)
            await page.screenshot(path="roast_form_en.png")
            print("Roast form screenshot saved.")

            await browser.close()
            print("Verification complete.")

    finally:
        if server_process:
            print("Stopping server...")
            server_process.kill()
            await server_process.wait()
            print("Server stopped.")

if __name__ == '__main__':
    asyncio.run(main())
