import { chromium } from "playwright";

const BASE_URL = "http://localhost:3006";
const EMAIL = process.argv[2] || "newuser@test.com";
const OUT_DIR = process.argv[3] || "screenshots";

const pages = [
  { name: "01-landing", path: "/", needsAuth: false },
  { name: "02-login", path: "/login", needsAuth: false },
  { name: "03-dashboard", path: "/dashboard" },
  { name: "04-properties", path: "/properties" },
  { name: "05-units", path: "/units" },
  { name: "06-tenants", path: "/tenants" },
  { name: "07-leases", path: "/leases" },
  { name: "08-transactions", path: "/transactions" },
  { name: "09-maintenance", path: "/maintenance" },
  { name: "10-listings", path: "/listings" },
  { name: "11-reports", path: "/reports" },
  { name: "12-settings-payments", path: "/settings/payments" },
  { name: "13-settings-account", path: "/settings/account" },
  { name: "14-settings-billing", path: "/settings/billing" },
  { name: "15-settings-rent-automation", path: "/settings/rent-automation" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Log in by calling the test-login API via page.evaluate so cookies are set
  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  const loginResult = await loginPage.evaluate(async (email) => {
    const res = await fetch("/api/auth/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  }, EMAIL);

  if (!loginResult.ok) {
    console.error("Login failed:", loginResult.body);
    await browser.close();
    return;
  }

  console.log(`Logged in as ${EMAIL}`);
  await loginPage.close();

  let ok = 0;
  let fail = 0;

  for (const pg of pages) {
    let ctx = context;

    if (pg.needsAuth === false) {
      ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
    }

    const page = await ctx.newPage();

    try {
      await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      if (page.url().includes("/login") && pg.needsAuth !== false) {
        console.error(`  SKIP: ${pg.name} (redirected to login)`);
        fail++;
        await page.close();
        if (pg.needsAuth === false) await ctx.close();
        continue;
      }

      await page.screenshot({
        path: `${OUT_DIR}/${pg.name}.png`,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 },
      });
      console.log(`  OK: ${pg.name}`);
      ok++;
    } catch (err) {
      console.error(`  FAIL: ${pg.name} -> ${err.message}`);
      fail++;
    }

    await page.close();
    if (pg.needsAuth === false && ctx !== context) await ctx.close();
  }

  await browser.close();
  console.log(`\nDone! ${ok} captured, ${fail} failed -> ${OUT_DIR}/`);
}

main().catch(console.error);
