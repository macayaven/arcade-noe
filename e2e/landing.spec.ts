import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display three game play buttons', async ({ page }) => {
    await page.goto('/'); // Assuming default port 3000 or configured base URL

    const snakeButton = page.locator('#play-snake');
    const flappyButton = page.locator('#play-flappy');
    const breakoutButton = page.locator('#play-breakout');

    await expect(snakeButton).toBeVisible();
    await expect(snakeButton).toHaveText('Play Snake');

    await expect(flappyButton).toBeVisible();
    await expect(flappyButton).toHaveText('Play Flappy Bird');

    await expect(breakoutButton).toBeVisible();
    await expect(breakoutButton).toHaveText('Play Breakout');
  });
});
