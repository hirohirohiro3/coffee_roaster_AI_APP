import os
import asyncio
import subprocess
from playwright.async_api import async_playwright, expect

async def run_verification():
    server_process = None
    try:
        # Start the local server
        print("Starting local server...")
        server_process = await asyncio.create_subprocess_shell(
            'python -m http.server 8080',
            cwd='.', # Run from the public directory
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

            # Wait for the login form to be visible, if it appears
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


            # Wait for the page to load and the button to be visible
            manage_beans_button = page.locator('#openBeanStockModalButton')
            await expect(manage_beans_button).to_be_visible(timeout=10000)
            print("Main page content is visible.")

            # Take a screenshot of the initial Japanese state
            print("Taking Japanese screenshot...")
            await page.screenshot(path="jules-scratch/verification/verification_ja.png")
            print("Japanese screenshot saved.")

            # Find and click the English language button
            print("Switching to English...")
            english_button = page.get_by_role("button", name="English")
            await english_button.click()

            # Wait for the text to update to English
            print("Waiting for text to update...")
            await expect(manage_beans_button).to_have_text("Manage Green Beans", timeout=5000)
            print("Text updated to English.")

            # Take a screenshot of the English state
            print("Taking English screenshot...")
            await page.screenshot(path="jules-scratch/verification/verification_en.png")
            print("English screenshot saved.")

            await browser.close()

    finally:
        if server_process:
            print("Stopping server...")
            server_process.kill()
            await server_process.wait()
            print("Server stopped.")

if __name__ == "__main__":
    asyncio.run(run_verification())
