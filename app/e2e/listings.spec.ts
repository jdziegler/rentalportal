import { test, expect } from "@playwright/test";

test.describe("Listings CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/listings");
    await expect(page.getByRole("heading", { name: /Listings/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create Listing/i })).toBeVisible();
  });

  test("create form loads with unit dropdown", async ({ page }) => {
    await page.goto("/listings/new");
    await expect(page.getByRole("heading", { name: /New|Create|Add/i })).toBeVisible();
    await expect(page.getByLabel(/Unit/i)).toBeVisible();
    await expect(page.getByLabel(/Price/i)).toBeVisible();
  });

  test("create a new listing", async ({ page }) => {
    await page.goto("/listings/new");

    await page.getByLabel(/Unit/i).click();
    await page.getByRole("option").first().click();

    await page.getByLabel(/Price/i).fill("1800.00");
    await page.getByLabel(/Description/i).fill(`E2E listing ${Date.now()}`);

    await page.getByRole("button", { name: /Create Listing/i }).click();
    await page.waitForURL(/listings/, { timeout: 10_000 });
  });

  test("view listing detail", async ({ page }) => {
    await page.goto("/listings");
    await page.locator("a[href*='/listings/']").first().click();
    await page.waitForURL(/listings\/.+/);
  });

  test("edit listing", async ({ page }) => {
    await page.goto("/listings");
    await page.locator("a[href*='/listings/']").first().click();
    await page.waitForURL(/listings\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Price/i)).toBeVisible();
  });
});
