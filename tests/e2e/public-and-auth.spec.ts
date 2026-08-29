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

  test("unauthenticated users cannot open admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin(?:\/|$)/);
    await expect(page).toHaveURL(/\/auth\?mode=login/);
  });
});
