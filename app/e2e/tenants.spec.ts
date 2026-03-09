import { test, expect } from "@playwright/test";

test.describe("Tenants CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("heading", { name: /Tenants/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Tenant/i })).toBeVisible();
  });

  test("create a new tenant", async ({ page }) => {
    await page.goto("/tenants/new");
    await expect(page.getByRole("heading", { name: "Add Tenant" })).toBeVisible();

    await page.getByLabel(/First Name/i).fill("E2E");
    await page.getByLabel(/Last Name/i).fill(`Tester ${Date.now()}`);
    await page.getByLabel(/Email/i).fill(`e2e-${Date.now()}@test.com`);
    await page.getByLabel(/Phone/i).fill("(555) 000-0001");

    await page.getByRole("button", { name: "Create Tenant" }).click();
    await page.waitForURL(/tenants/, { timeout: 10_000 });
  });

  test("view tenant detail", async ({ page }) => {
    await page.goto("/tenants");
    await page.locator("a[href*='/tenants/']").first().click();
    await page.waitForURL(/tenants\/.+/);
    // Should show tenant profile info
    await expect(page.getByText(/Email|Phone/i)).toBeVisible();
  });

  test("edit tenant", async ({ page }) => {
    await page.goto("/tenants");
    await page.locator("a[href*='/tenants/']").first().click();
    await page.waitForURL(/tenants\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/First Name/i)).toBeVisible();
  });
});
