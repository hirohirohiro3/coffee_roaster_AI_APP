from playwright.sync_api import sync_playwright, expect

def run_verification():
    """
    This script verifies the real-time log table functionality by
    first performing a mock login to make the UI visible.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server URL
        page.goto("http://localhost:8000")

        # 1. Perform a mock login to make the main UI visible
        # The application's auth logic is client-side for this test env,
        # so we just need to trigger the login flow.
        page.locator("#loginEmail").fill("test@example.com")
        page.locator("#loginPassword").fill("password123")
        page.locator("#loginButton").click()

        # 2. Wait for the main content to be visible after login
        start_button_selector = "#startPauseTimerButton"
        expect(page.locator(start_button_selector)).to_be_visible(timeout=10000)

        # 3. Start the timer to enable logging
        page.locator(start_button_selector).click()

        # Make the temperature input form visible (app does this on timer start)
        page.evaluate("document.querySelector('#tempInputForm').style.display = 'flex'")
        page.evaluate("document.querySelector('#realtimeLogTableContainer').style.display = 'block'")

        # 4. Log the first temperature entry
        page.locator("#realtimeBeanTemp").fill("160")
        page.locator("#logRealtimeTempButton").click()

        # 5. Assert that the table has exactly one row
        expect(page.locator("#realtimeLogTable tbody tr")).to_have_count(1)

        # 6. Log the second temperature entry
        page.wait_for_timeout(1000) # Wait 1 second for timer
        page.locator("#realtimeBeanTemp").fill("165")
        page.locator("#logRealtimeTempButton").click()

        # 7. Assert that the table now has two rows
        expect(page.locator("#realtimeLogTable tbody tr")).to_have_count(2)

        # 8. Verify the content of the second row
        second_row = page.locator("#realtimeLogTable tbody tr").nth(1)
        expect(second_row.locator("td").nth(1)).to_contain_text("165.0")

        # 9. Take a screenshot for visual confirmation
        screenshot_path = "jules-scratch/verification/verification.png"
        page.screenshot(path=screenshot_path)

        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run_verification()
