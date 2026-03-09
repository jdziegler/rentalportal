import { test, expect } from "@playwright/test";

test.use({ storageState: undefined }); // unauthenticated

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});

test("login page shows sign-in options", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Sign in with Google")).toBeVisible();
  // Dev mode shows test login
  await expect(page.getByPlaceholder("Test user email")).toBeVisible();
});

test("test login flow redirects to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Test user email").fill(
    process.env.TEST_USER_EMAIL || "rent.ziegler@gmail.com"
  );
  await page.getByRole("button", { name: "Test Login" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(page).toHaveURL(/dashboard/);
});
