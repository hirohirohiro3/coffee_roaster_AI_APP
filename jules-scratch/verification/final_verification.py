import asyncio
import subprocess
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

            # --- Take Screenshots of Key Changes ---

            # Screenshot 1: Light Mode & New Button Style
            await page.locator('#addNewRoastButton').scroll_into_view_if_needed()
            await page.screenshot(path="jules-scratch/verification/01_light_mode.png")
            print("Screenshot 1: Light mode captured.")

            # Screenshot 2: Dark Mode
            await page.locator('#theme-toggle').click()
            await asyncio.sleep(0.5) # Wait for animation
            await page.screenshot(path="jules-scratch/verification/02_dark_mode.png")
            print("Screenshot 2: Dark mode captured.")

            # Screenshot 3: Open modal to check animation and styling
            await page.locator('#openBeanStockModalButton').click()
            await asyncio.sleep(0.5) # Wait for animation
            await page.screenshot(path="jules-scratch/verification/03_modal_animation.png")
            print("Screenshot 3: Modal animation captured.")
            await page.locator('#closeBeanStockModalButton').click()
            await asyncio.sleep(0.5)

            # Screenshot 4: Graph Fill
            # Need to render a profile to see a graph
            await page.evaluate("""
                const sampleRoast = {
                    id: 'sample-1', roastDate: '2024-01-15', beanName: 'エチオピア イルガチェフェ G1',
                    roastLevel: 'シティロースト', totalRoastTime: '10:30', overallRating: 4.5, isFavorite: true,
                    beanTempLog: '100,120,140,160,180,200,210,215,220,225',
                    firstCrackTime: '08:30'
                };
                window.eventBus.emit('ui:show-profile-modal', sampleRoast);
            """)
            await asyncio.sleep(0.5) # Wait for modal and chart
            await page.screenshot(path="jules-scratch/verification/04_graph_fill.png")
            print("Screenshot 4: Graph fill captured.")

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
