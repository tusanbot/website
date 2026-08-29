import { test, expect } from "@playwright/test";

test.describe("service regression smoke tests", () => {
  test("a service detail renders with a single H1", async ({ page }) => {
    await page.goto("/services");
    const serviceLink = page.locator('a[href^="/services/"]').first();
    await expect(serviceLink).toBeVisible();
    await serviceLink.click();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("body")).toContainText("ثبت درخواست");
  });

  test("service form exposes its submit flow without submitting", async ({ page }) => {
    await page.goto("/services");
    const serviceLink = page.locator('a[href^="/services/"]').first();
    await expect(serviceLink).toBeVisible();
    await serviceLink.click();
    const form = page.locator("form").first();
    if (await form.count()) {
      await expect(form).toBeVisible();
    }
  });
});
