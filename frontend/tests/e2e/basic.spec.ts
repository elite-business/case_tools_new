import { test, expect } from '@playwright/test';
import { mockLogin } from './auth-helper';

test.describe('Basic UI Tests', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/login');
    
    // Check login form elements
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    // Check login page is full screen
    const loginContainer = page.locator('div').first();
    const viewportSize = page.viewportSize();
    if (viewportSize) {
      const containerBox = await loginContainer.boundingBox();
      if (containerBox) {
        expect(containerBox.width).toBeGreaterThanOrEqual(viewportSize.width - 10);
      }
    }
  });

  test('dashboard loads with proper layout after auth', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check main layout components
    const sidebar = page.locator('.ant-layout-sider').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    
    const content = page.locator('.ant-layout-content').first();
    await expect(content).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for theme toggle to be visible
    const themeToggle = page.locator('.ant-switch').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    // Get initial theme
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('class');
    
    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // Check theme changed
    const newTheme = await html.getAttribute('class');
    if (initialTheme?.includes('dark')) {
      expect(newTheme).not.toContain('dark');
    } else {
      expect(newTheme).toContain('dark');
    }
  });

  test('navigation menu works', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check menu exists
    const menu = page.locator('.ant-menu').first();
    await expect(menu).toBeVisible({ timeout: 10000 });
    
    // Check menu items are visible
    const dashboardItem = page.locator('.ant-menu-item:has-text("Dashboard")').first();
    await expect(dashboardItem).toBeVisible();
    
    // Check expandable menus work
    const casesMenu = page.locator('.ant-menu-submenu:has-text("Cases")').first();
    if (await casesMenu.isVisible()) {
      await casesMenu.click();
      await page.waitForTimeout(500);
      
      // Check submenu appears
      const activeCases = page.locator('.ant-menu-item:has-text("Active Cases")').first();
      await expect(activeCases).toBeVisible();
    }
  });

  test('sidebar collapse works', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find collapse button
    const collapseButton = page.locator('button:has(.anticon-menu-fold), button:has(.anticon-menu-unfold)').first();
    await expect(collapseButton).toBeVisible({ timeout: 10000 });
    
    // Get initial sidebar width
    const sidebar = page.locator('.ant-layout-sider').first();
    const initialBox = await sidebar.boundingBox();
    const initialWidth = initialBox?.width || 0;
    
    // Collapse sidebar
    await collapseButton.click();
    await page.waitForTimeout(500);
    
    // Check width changed
    const newBox = await sidebar.boundingBox();
    const newWidth = newBox?.width || 0;
    expect(newWidth).not.toBe(initialWidth);
  });
});