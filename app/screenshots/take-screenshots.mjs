import { chromium } from "playwright";

const BASE_URL = "http://localhost:3006";

const pages = [
  { name: "01-landing", path: "/", needsAuth: false },
  { name: "02-dashboard-onboarding", path: "/dashboard" },
  { name: "03-properties-empty", path: "/properties" },
  { name: "04-units-empty", path: "/units" },
  { name: "05-tenants-empty", path: "/tenants" },
  { name: "06-leases-empty", path: "/leases" },
  { name: "07-transactions-empty", path: "/transactions" },
  { name: "08-maintenance-empty", path: "/maintenance" },
  { name: "09-listings-empty", path: "/listings" },
  { name: "10-settings-payments", path: "/settings/payments" },
  { name: "11-settings-account", path: "/settings/account" },
  { name: "12-settings-billing", path: "/settings/billing" },
  { name: "13-settings-rent-automation", path: "/settings/rent-automation" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Log in by calling the test-login API via page.evaluate so cookies are set on the browser
  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  const loginResult = await loginPage.evaluate(async () => {
    const res = await fetch("/api/auth/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "newuser@test.com" }),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  });

  if (!loginResult.ok) {
    console.error("Login API failed:", loginResult.body);
    await browser.close();
    return;
  }

  console.log("Logged in via API:", loginResult.body);

  // Verify cookies are set
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name.includes("session-token"));
  console.log("Session cookie:", sessionCookie ? `${sessionCookie.name}=${sessionCookie.value.substring(0, 8)}...` : "NOT FOUND");

  await loginPage.close();

  for (const pg of pages) {
    let ctx = context;

    if (pg.needsAuth === false) {
      ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
    }

    const page = await ctx.newPage();

    try {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      if (page.url().includes("/login") && pg.needsAuth !== false) {
        console.error(`REDIRECTED: ${pg.name} -> ${page.url()}`);
        await page.close();
        if (pg.needsAuth === false) await ctx.close();
        continue;
      }

      await page.screenshot({
        path: `screenshots/${pg.name}.png`,
        fullPage: true,
      });
      console.log(`OK: ${pg.name}`);
    } catch (err) {
      console.error(`FAIL: ${pg.name} -> ${err.message}`);
    }

    await page.close();
    if (pg.needsAuth === false && ctx !== context) await ctx.close();
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to screenshots/");
}

main().catch(console.error);
