import { test, expect } from '@playwright/test';
import { mockLogin } from './auth-helper';

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
  });

  test('should switch between languages', async ({ page }) => {
    // Find language selector dropdown
    const languageButton = page.locator('button:has(.anticon-global)');
    await expect(languageButton).toBeVisible();
    
    // Click to open dropdown
    await languageButton.click();
    
    // Wait for dropdown menu
    await page.waitForSelector('.ant-dropdown-menu', { state: 'visible' });
    
    // Switch to French
    await page.locator('.ant-dropdown-menu-item:has-text("Français")').click();
    await page.waitForTimeout(500);
    
    // Verify language changed
    let htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('fr');
    
    // Check if text changed (navigation items should be translated)
    // This assumes translations are loaded
    
    // Switch to Arabic
    await languageButton.click();
    await page.waitForSelector('.ant-dropdown-menu', { state: 'visible' });
    await page.locator('.ant-dropdown-menu-item:has-text("العربية")').click();
    await page.waitForTimeout(500);
    
    // Verify RTL mode is activated
    htmlLang = await page.locator('html').getAttribute('lang');
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlLang).toBe('ar');
    expect(htmlDir).toBe('rtl');
    
    // Switch back to English
    await languageButton.click();
    await page.waitForSelector('.ant-dropdown-menu', { state: 'visible' });
    await page.locator('.ant-dropdown-menu-item:has-text("English")').click();
    await page.waitForTimeout(500);
    
    // Verify back to LTR
    htmlLang = await page.locator('html').getAttribute('lang');
    const finalDir = await page.locator('html').getAttribute('dir');
    expect(htmlLang).toBe('en');
    expect(finalDir).toBe('ltr');
  });

  test('should toggle RTL/LTR mode', async ({ page }) => {
    // Find RTL toggle button
    const rtlButton = page.locator('button:has(.anticon-translation)');
    await expect(rtlButton).toBeVisible();
    
    // Get initial direction
    const initialDir = await page.locator('html').getAttribute('dir');
    
    // Click RTL/LTR toggle
    await rtlButton.click();
    await page.waitForTimeout(500);
    
    // Check direction changed
    const newDir = await page.locator('html').getAttribute('dir');
    expect(newDir).not.toBe(initialDir);
    
    // Verify layout adjustments for RTL
    if (newDir === 'rtl') {
      // Sidebar should be on the right
      const sider = page.locator('.ant-layout-sider');
      const siderStyle = await sider.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          right: style.right,
          left: style.left
        };
      });
      expect(siderStyle.right).toBe('0px');
    }
  });

  test('should persist language preference', async ({ page }) => {
    // Switch to French
    const languageButton = page.locator('button:has(.anticon-global)');
    await languageButton.click();
    await page.waitForSelector('.ant-dropdown-menu', { state: 'visible' });
    await page.locator('.ant-dropdown-menu-item:has-text("Français")').click();
    await page.waitForTimeout(500);
    
    // Verify language changed
    let htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('fr');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if language persisted
    htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('fr');
  });
});