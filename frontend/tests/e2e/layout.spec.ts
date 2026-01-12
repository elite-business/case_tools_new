import { test, expect } from '@playwright/test';
import { mockLogin } from './auth-helper';

test.describe('Layout and Navigation', () => {
  test('login page should be full screen', async ({ page }) => {
    await page.goto('/login');
    
    // Check if login container takes full viewport
    const loginContainer = page.locator('div').first();
    const viewportSize = page.viewportSize();
    
    if (viewportSize) {
      const containerBox = await loginContainer.boundingBox();
      
      if (containerBox) {
        // Login should take full width and height
        expect(containerBox.width).toBeGreaterThanOrEqual(viewportSize.width - 10);
        expect(containerBox.height).toBeGreaterThanOrEqual(viewportSize.height - 10);
      }
    }
    
    // Check login card is visible and centered
    const loginCard = page.locator('.ant-card').first();
    await expect(loginCard).toBeVisible();
    
    // Check form elements
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('dashboard should have proper layout', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    
    // Check sidebar is visible
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toBeVisible();
    
    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check content area
    const content = page.locator('.ant-layout-content');
    await expect(content).toBeVisible();
    
    // Check background is not white in default mode
    const contentBg = await content.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should have gray background (not pure white)
    expect(contentBg).not.toBe('rgb(255, 255, 255)');
  });

  test('sidebar should collapse and expand', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    
    // Find collapse button
    const collapseButton = page.locator('button:has(.anticon-menu-fold), button:has(.anticon-menu-unfold)').first();
    
    // Get initial sidebar width
    const sidebar = page.locator('.ant-layout-sider');
    const initialWidth = await sidebar.evaluate(el => (el as HTMLElement).offsetWidth);
    
    // Click to toggle
    await collapseButton.click();
    await page.waitForTimeout(300); // Wait for animation
    
    // Check width changed
    const newWidth = await sidebar.evaluate(el => (el as HTMLElement).offsetWidth);
    expect(newWidth).not.toBe(initialWidth);
    
    // Toggle back
    await collapseButton.click();
    await page.waitForTimeout(300);
    
    const finalWidth = await sidebar.evaluate(el => (el as HTMLElement).offsetWidth);
    expect(finalWidth).toBe(initialWidth);
  });

  test('navigation menu should be functional', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    
    // Check menu items are visible
    const menuItems = page.locator('.ant-menu-item');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Check submenu expansion (Alerts menu)
    const alertsMenu = page.locator('.ant-menu-submenu:has-text("Alerts")');
    if (await alertsMenu.isVisible()) {
      await alertsMenu.click();
      await page.waitForTimeout(300);
      
      // Check submenu items are visible
      const submenuItems = page.locator('.ant-menu-item:has-text("Active Alerts")');
      await expect(submenuItems).toBeVisible();
    }
  });

  test('header components should be interactive', async ({ page }) => {
    await mockLogin(page);
    await page.goto('/dashboard');
    
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
    
    // Check notification dropdown
    const notificationButton = page.locator('button:has(.anticon-bell)');
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();
    
    // Wait for dropdown
    await page.waitForSelector('.ant-dropdown', { state: 'visible' });
    const dropdown = page.locator('.ant-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Close dropdown
    await page.keyboard.press('Escape');
    
    // Check user menu
    const userButton = page.locator('button:has(.ant-avatar)');
    await expect(userButton).toBeVisible();
  });

  test('mobile menu should work', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await mockLogin(page);
    await page.goto('/dashboard');
    
    // Mobile menu button should be visible
    const mobileMenuButton = page.locator('button:has(.anticon-menu), button:has(.anticon-close)').first();
    await expect(mobileMenuButton).toBeVisible();
    
    // Click to open drawer
    await mobileMenuButton.click();
    await page.waitForTimeout(300);
    
    // Check drawer is visible
    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toBeVisible();
    
    // Check menu items in drawer
    const drawerMenu = drawer.locator('.ant-menu');
    await expect(drawerMenu).toBeVisible();
    
    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Drawer should be hidden
    await expect(drawer).not.toBeVisible();
  });
});