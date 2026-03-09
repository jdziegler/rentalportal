import { test, expect } from "@playwright/test";

test.describe("Maintenance CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/maintenance");
    await expect(page.getByRole("heading", { name: /Maintenance/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /New Request/i })).toBeVisible();
  });

  test("create a maintenance request", async ({ page }) => {
    await page.goto("/maintenance/new");
    await expect(page.getByRole("heading", { name: /New|Add/i })).toBeVisible();

    await page.getByLabel(/Title/i).fill(`E2E Leaky Faucet ${Date.now()}`);

    // Select property
    await page.getByLabel(/Property/i).click();
    await page.getByRole("option").first().click();

    await page.getByLabel(/Description/i).fill("Test maintenance request from E2E tests");

    await page.getByRole("button", { name: /Create/i }).click();
    await page.waitForURL(/maintenance/, { timeout: 10_000 });
  });

  test("view maintenance detail", async ({ page }) => {
    await page.goto("/maintenance");
    await page.locator("a[href*='/maintenance/']").first().click();
    await page.waitForURL(/maintenance\/.+/);
    await expect(page.getByText(/Priority|Status/i)).toBeVisible();
  });

  test("edit maintenance request", async ({ page }) => {
    await page.goto("/maintenance");
    await page.locator("a[href*='/maintenance/']").first().click();
    await page.waitForURL(/maintenance\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Title/i)).toBeVisible();
  });
});
