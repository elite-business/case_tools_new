import { Page } from '@playwright/test';

export async function mockLogin(page: Page) {
  // Set a mock authentication cookie to bypass login
  await page.context().addCookies([
    {
      name: 'token',
      value: 'mock-jwt-token-for-testing',
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

export async function performLogin(page: Page, username = 'admin', password = 'admin') {
  await page.goto('/login');
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 5000 });
}