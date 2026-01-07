import { test, expect } from '@playwright/test';
import { mockLogin } from './auth-helper';

test.describe('Theme Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
  });

  test('should toggle dark/light mode', async ({ page }) => {
    // Check initial state
    const html = page.locator('html');
    
    // Find the theme toggle switch
    const themeToggle = page.locator('.ant-switch').first();
    await expect(themeToggle).toBeVisible();
    
    // Get initial theme
    const initialTheme = await html.getAttribute('class');
    
    // Click to toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500); // Wait for transition
    
    // Check if theme changed
    const newTheme = await html.getAttribute('class');
    
    if (initialTheme?.includes('dark')) {
      expect(newTheme).not.toContain('dark');
    } else {
      expect(newTheme).toContain('dark');
    }
    
    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    const finalTheme = await html.getAttribute('class');
    expect(finalTheme).toBe(initialTheme);
  });

  test('should persist theme preference after reload', async ({ page }) => {
    // Set dark mode
    const themeToggle = page.locator('.ant-switch').first();
    const html = page.locator('html');
    
    const initialTheme = await html.getAttribute('class');
    
    // Toggle theme if not dark
    if (!initialTheme?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Verify dark mode is active
    const darkTheme = await html.getAttribute('class');
    expect(darkTheme).toContain('dark');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if theme persisted
    const themeAfterReload = await html.getAttribute('class');
    expect(themeAfterReload).toContain('dark');
  });

  test('should apply correct colors in dark mode', async ({ page }) => {
    // Enable dark mode
    const themeToggle = page.locator('.ant-switch').first();
    const html = page.locator('html');
    
    const initialTheme = await html.getAttribute('class');
    if (!initialTheme?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Check background colors
    const layout = page.locator('.ant-layout');
    const layoutBg = await layout.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Dark mode should have dark background
    expect(layoutBg).toMatch(/rgb\(0, 0, 0\)|rgba?\(20, 20, 20/);
    
    // Check text colors
    const text = page.locator('.ant-typography').first();
    if (await text.isVisible()) {
      const textColor = await text.evaluate(el => 
        window.getComputedStyle(el).color
      );
      // Dark mode should have light text
      expect(textColor).toMatch(/rgb\(255, 255, 255\)|rgba?\(255, 255, 255/);
    }
  });
});