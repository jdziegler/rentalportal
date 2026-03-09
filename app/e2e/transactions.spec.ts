import { test, expect } from "@playwright/test";

test.describe("Transactions CRUD", () => {
  test("list page loads", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /Transactions/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Transaction/i })).toBeVisible();
  });

  test("create an income transaction", async ({ page }) => {
    await page.goto("/transactions/new");
    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeVisible();

    // Category defaults to "income"
    await page.getByLabel(/Amount/i).fill("1200.00");
    await page.getByLabel(/Date/i).fill("2026-03-01");
    await page.getByLabel(/Details/i).fill(`E2E Test Income ${Date.now()}`);

    await page.getByRole("button", { name: "Create Transaction" }).click();
    await page.waitForURL(/transactions/, { timeout: 10_000 });
  });

  test("create an expense transaction", async ({ page }) => {
    await page.goto("/transactions/new");

    // Switch to expense
    await page.getByLabel(/Category/i).click();
    await page.getByRole("option", { name: /Expense/i }).click();

    await page.getByLabel(/Amount/i).fill("350.00");
    await page.getByLabel(/Date/i).fill("2026-03-05");
    await page.getByLabel(/Details/i).fill(`E2E Test Expense ${Date.now()}`);

    await page.getByRole("button", { name: "Create Transaction" }).click();
    await page.waitForURL(/transactions/, { timeout: 10_000 });
  });

  test("view transaction detail", async ({ page }) => {
    await page.goto("/transactions");
    await page.locator("a[href*='/transactions/']").first().click();
    await page.waitForURL(/transactions\/.+/);
    await expect(page.getByText(/Amount/i)).toBeVisible();
  });

  test("edit transaction", async ({ page }) => {
    await page.goto("/transactions");
    await page.locator("a[href*='/transactions/']").first().click();
    await page.waitForURL(/transactions\/.+/);
    await page.getByRole("link", { name: /Edit/i }).click();
    await page.waitForURL(/edit/);
    await expect(page.getByLabel(/Amount/i)).toBeVisible();
  });
});
