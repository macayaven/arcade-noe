import { test, expect } from '@playwright/test';

test.describe('Arcade Landing Page', () => {
  test('should display three game buttons', async ({ page }) => {
    // Navigate to the landing page.
    // Assuming the frontend is served on port 3001, as per previous tasks.
    await page.goto('http://localhost:3001/');

    // Wait for the page to load and check for the game buttons.
    // We'll look for buttons with the text "Play".
    // This assumes the buttons are identifiable by their text content.
    // If this is not unique enough, more specific selectors might be needed.
    const gameButtons = page.getByRole('button', { name: /Play/i });

    // Expect three such buttons to be visible.
    await expect(gameButtons).toHaveCount(3);

    // Additionally, ensure each of these buttons is visible.
    for (let i = 0; i < 3; i++) {
      await expect(gameButtons.nth(i)).toBeVisible();
    }
  });
});
