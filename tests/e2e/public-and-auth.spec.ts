import { test, expect } from "@playwright/test";

test.describe("public and authorization smoke tests", () => {
  test("homepage renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/کافی نت توسن|توسن/i);
    await expect(page.locator("body")).toContainText("توسن");
  });

  test("services page renders", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("body")).toContainText("خدمات");
  });

  test("unauthenticated users see the admin access-denied guard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("دسترسی غیرمجاز");
    await expect(page.locator('a[href="/auth?mode=login"]')).toBeVisible();
    await expect(page.locator("body")).not.toContainText("مدیریت خدمات");
  });
});
