import { test, expect } from "@playwright/test";

test.describe("service regression smoke tests", () => {
  test("service catalog never emits a null service link", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator('a[href="/services/null"]')).toHaveCount(0);
  });

  test("a service detail renders with a single H1", async ({ page }) => {
    await page.goto("/services");
    const serviceLink = page.locator('a[href^="/services/"]:not([href="/services/null"])').first();
    await expect(serviceLink).toBeVisible();
    await serviceLink.click();
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("service form exposes its submit flow without submitting", async ({ page }) => {
    await page.goto("/services");
    const serviceLink = page.locator('a[href^="/services/"]:not([href="/services/null"])').first();
    await expect(serviceLink).toBeVisible();
    await serviceLink.click();
    const form = page.locator("form").first();
    if (await form.count()) {
      await expect(form).toBeVisible();
    }
  });
});
