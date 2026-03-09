import { test, expect } from "@playwright/test";

test.describe("Properties CRUD", () => {
  const uniqueName = `Test Property ${Date.now()}`;

  test("list page loads", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { name: /Properties/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Property/i })).toBeVisible();
  });

  test("create a new property", async ({ page }) => {
    await page.goto("/properties/new");
    await expect(page.getByRole("heading", { name: "Add Property" })).toBeVisible();

    await page.getByLabel(/Property Name/i).fill(uniqueName);
    await page.getByLabel(/Street Address/i).fill("100 Test Street");
    await page.getByLabel(/City/i).fill("Newark");
    await page.getByLabel(/State/i).fill("NJ");
    await page.getByLabel(/ZIP/i).fill("07101");

    await page.getByRole("button", { name: "Create Property" }).click();
    // Should redirect to properties list or detail
    await page.waitForURL(/properties/, { timeout: 10_000 });
  });

  test("view property detail", async ({ page }) => {
    await page.goto("/properties");
    // Click the first property link
    await page.locator("a[href*='/properties/']").first().click();
    await page.waitForURL(/properties\/.+/);
    // Should show property details
    await expect(page.getByText(/Street Address|Address/i)).toBeVisible();
  });

  test("edit property", async ({ page }) => {
    await page.goto("/properties");
    await page.locator("a[href*='/properties/']").first().click();
    await page.waitForURL(/properties\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Property Name/i)).toBeVisible();
  });
});
