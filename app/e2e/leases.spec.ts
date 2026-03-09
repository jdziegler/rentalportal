import { test, expect } from "@playwright/test";

test.describe("Leases CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/leases");
    await expect(page.getByRole("heading", { name: /Leases/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Lease/i })).toBeVisible();
  });

  test("create form loads with required dropdowns", async ({ page }) => {
    await page.goto("/leases/new");
    await expect(page.getByRole("heading", { name: "Add Lease" })).toBeVisible();
    await expect(page.getByLabel(/Unit/i)).toBeVisible();
    await expect(page.getByLabel(/Tenant/i)).toBeVisible();
    await expect(page.getByLabel(/Rent Amount/i)).toBeVisible();
    await expect(page.getByLabel(/Start Date/i)).toBeVisible();
  });

  test("create a new lease", async ({ page }) => {
    await page.goto("/leases/new");

    // Select unit and tenant
    await page.getByLabel(/Unit/i).click();
    await page.getByRole("option").first().click();

    await page.getByLabel(/Tenant/i).click();
    await page.getByRole("option").first().click();

    await page.getByLabel(/Rent Amount/i).fill("1500");
    await page.getByLabel(/Start Date/i).fill("2026-01-01");

    await page.getByRole("button", { name: "Create Lease" }).click();
    await page.waitForURL(/leases/, { timeout: 10_000 });
  });

  test("view lease detail", async ({ page }) => {
    await page.goto("/leases");
    await page.locator("a[href*='/leases/']").first().click();
    await page.waitForURL(/leases\/.+/);
    await expect(page.getByText(/Rent Amount|Monthly Rent/i)).toBeVisible();
  });

  test("edit lease", async ({ page }) => {
    await page.goto("/leases");
    await page.locator("a[href*='/leases/']").first().click();
    await page.waitForURL(/leases\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Rent Amount/i)).toBeVisible();
  });
});
