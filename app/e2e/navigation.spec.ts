import { test, expect } from "@playwright/test";

const sidebarLinks = [
  { name: "Dashboard", url: "/dashboard" },
  { name: "Properties", url: "/properties" },
  { name: "Tenants", url: "/tenants" },
  { name: "Leases", url: "/leases" },
  { name: "Transactions", url: "/transactions" },
  { name: "Maintenance", url: "/maintenance" },
  { name: "Listings", url: "/listings" },
  { name: "Reports", url: "/reports" },
];

test.describe("Sidebar navigation", () => {
  for (const link of sidebarLinks) {
    test(`navigates to ${link.name}`, async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("link", { name: link.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(link.url));
    });
  }
});

test.describe("Settings navigation", () => {
  const settingsLinks = [
    { name: "Rent Automation", url: "/settings/rent-automation" },
    { name: "Team", url: "/settings/team" },
    { name: "Account", url: "/settings/account" },
    { name: "Billing", url: "/settings/billing" },
    { name: "Payments", url: "/settings/payments" },
  ];

  for (const link of settingsLinks) {
    test(`navigates to Settings > ${link.name}`, async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("link", { name: link.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(link.url));
    });
  }
});
