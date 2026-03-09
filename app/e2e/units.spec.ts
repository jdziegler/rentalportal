import { test, expect } from "@playwright/test";

test.describe("Units CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/units");
    await expect(page.getByRole("heading", { name: /Units/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Unit/i })).toBeVisible();
  });

  test("create form loads with property dropdown", async ({ page }) => {
    await page.goto("/units/new");
    await expect(page.getByRole("heading", { name: "Add Unit" })).toBeVisible();
    await expect(page.getByLabel(/Property/i)).toBeVisible();
    await expect(page.getByLabel(/Unit Name/i)).toBeVisible();
  });

  test("create a new unit", async ({ page }) => {
    await page.goto("/units/new");

    // Select first property from dropdown
    await page.getByLabel(/Property/i).click();
    await page.getByRole("option").first().click();

    await page.getByLabel(/Unit Name/i).fill(`Unit E2E ${Date.now()}`);
    await page.getByLabel(/Bedrooms/i).fill("2");
    await page.getByLabel(/Bathrooms/i).fill("1");

    await page.getByRole("button", { name: "Create Unit" }).click();
    await page.waitForURL(/units/, { timeout: 10_000 });
  });

  test("view unit detail", async ({ page }) => {
    await page.goto("/units");
    await page.locator("a[href*='/units/']").first().click();
    await page.waitForURL(/units\/.+/);
  });

  test("edit unit", async ({ page }) => {
    await page.goto("/units");
    await page.locator("a[href*='/units/']").first().click();
    await page.waitForURL(/units\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Unit Name/i)).toBeVisible();
  });
});
