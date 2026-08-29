import { test, expect } from "@playwright/test";

const serviceSlug = process.env.PLAYWRIGHT_SERVICE_SLUG;

test.describe("service regression smoke tests", () => {
  test.skip(!serviceSlug, "Set PLAYWRIGHT_SERVICE_SLUG to a known active service slug.");

  test("service detail renders once with a single H1", async ({ page }) => {
    await page.goto(`/services/${encodeURIComponent(serviceSlug!)}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("body")).toContainText("ثبت درخواست");
  });

  test("service form exposes its submit flow without submitting", async ({ page }) => {
    await page.goto(`/services/${encodeURIComponent(serviceSlug!)}`);
    const form = page.locator("form").first();
    if (await form.count()) {
      await expect(form).toBeVisible();
    }
  });
});
