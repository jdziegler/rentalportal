import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3006";
const EMAIL = process.argv[2] || "rent.ziegler@gmail.com";
const TENANT_EMAIL = "jane.tenant@example.com";
const BASE_DIR = process.argv[3] || "screenshots";

// Record IDs — fetched from DB for rent.ziegler@gmail.com
const IDS = {
  property: "cmmdxnrf500016l33f42ctg0h",
  unit: "cmmdxnrh7001n6l33p4aadhli",
  tenant: "cmmdxnria00376l33ibh9tod1",
  lease: "cmmdxnrm1009j6l33sena8kof",
  transaction: "cmmdxns5u02v06l33x4c5ki2f",
  listing: "cmmdxns6802w46l3319bbij4q",
};

const groups = [
  {
    dir: "detail",
    pages: [
      { name: "property", path: `/properties/${IDS.property}` },
      { name: "unit", path: `/units/${IDS.unit}` },
      { name: "tenant", path: `/tenants/${IDS.tenant}` },
      { name: "lease", path: `/leases/${IDS.lease}` },
      { name: "transaction", path: `/transactions/${IDS.transaction}` },
      { name: "listing", path: `/listings/${IDS.listing}` },
      { name: "maintenance", path: "/maintenance" },
    ],
  },
  {
    dir: "forms",
    pages: [
      { name: "new-property", path: "/properties/new" },
      { name: "new-unit", path: "/units/new" },
      { name: "new-tenant", path: "/tenants/new" },
      { name: "new-lease", path: "/leases/new" },
      { name: "new-transaction", path: "/transactions/new" },
      { name: "new-maintenance", path: "/maintenance/new" },
      { name: "new-listing", path: "/listings/new" },
      { name: "edit-property", path: `/properties/${IDS.property}/edit` },
      { name: "edit-unit", path: `/units/${IDS.unit}/edit` },
      { name: "edit-tenant", path: `/tenants/${IDS.tenant}/edit` },
      { name: "edit-lease", path: `/leases/${IDS.lease}/edit` },
      { name: "edit-transaction", path: `/transactions/${IDS.transaction}/edit` },
      { name: "edit-listing", path: `/listings/${IDS.listing}/edit` },
    ],
  },
  {
    dir: "reports",
    pages: [
      { name: "rent-roll", path: "/reports/rent-roll" },
      { name: "income-expense", path: "/reports/income-expense" },
      { name: "tenant-statement", path: `/reports/tenant-statement?tenantId=${IDS.tenant}` },
    ],
  },
  {
    dir: "tenant-portal",
    auth: "tenant",
    pages: [
      { name: "tenant-dashboard", path: "/tenant" },
      { name: "tenant-maintenance", path: "/tenant/maintenance" },
      { name: "tenant-messages", path: "/tenant/messages" },
    ],
  },
  {
    dir: "tenant-portal",
    needsAuth: false,
    pages: [
      { name: "tenant-login", path: "/tenant" },
    ],
  },
  {
    dir: "mobile",
    viewport: { width: 375, height: 812 },
    pages: [
      { name: "dashboard", path: "/dashboard" },
      { name: "properties", path: "/properties" },
      { name: "tenant-detail", path: `/tenants/${IDS.tenant}` },
      { name: "lease-detail", path: `/leases/${IDS.lease}` },
    ],
  },
];

async function loginLandlord(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  const result = await page.evaluate(async (email) => {
    const res = await fetch("/api/auth/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  }, EMAIL);

  await page.close();
  if (!result.ok) throw new Error(`Landlord login failed: ${result.body}`);
  return context;
}

async function loginTenant(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/tenant`, { waitUntil: "networkidle" });

  const result = await page.evaluate(async (identifier) => {
    const res = await fetch("/api/tenant/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  }, TENANT_EMAIL);

  await page.close();
  if (!result.ok) throw new Error(`Tenant login failed: ${result.body}`);
  return context;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const defaultViewport = { width: 1280, height: 800 };

  // Pre-create authenticated contexts
  const authContext = await loginLandlord(browser, defaultViewport);
  console.log(`Logged in as landlord: ${EMAIL}`);

  const tenantContext = await loginTenant(browser, defaultViewport);
  console.log(`Logged in as tenant: ${TENANT_EMAIL}\n`);

  let totalOk = 0;
  let totalFail = 0;

  for (const group of groups) {
    const outDir = `${BASE_DIR}/${group.dir}`;
    mkdirSync(outDir, { recursive: true });
    console.log(`--- ${group.dir}/ ---`);

    const viewport = group.viewport || defaultViewport;
    let ctx;

    if (group.auth === "tenant") {
      if (group.viewport) {
        ctx = await loginTenant(browser, viewport);
      } else {
        ctx = tenantContext;
      }
    } else if (group.needsAuth === false) {
      ctx = await browser.newContext({ viewport });
    } else if (group.viewport) {
      ctx = await loginLandlord(browser, viewport);
    } else {
      ctx = authContext;
    }

    for (const pg of group.pages) {
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE_URL}${pg.path}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Check for unexpected redirects
        const url = page.url();
        if (url.includes("/login") && group.needsAuth !== false && group.auth !== "tenant") {
          console.error(`  SKIP: ${pg.name} (redirected to login)`);
          totalFail++;
          await page.close();
          continue;
        }
        if (url.endsWith("/tenant") && group.auth === "tenant") {
          console.error(`  SKIP: ${pg.name} (redirected to tenant login)`);
          totalFail++;
          await page.close();
          continue;
        }

        const vp = group.viewport || defaultViewport;
        await page.screenshot({
          path: `${outDir}/${pg.name}.png`,
          fullPage: false,
          clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 2000) },
        });
        console.log(`  OK: ${pg.name}`);
        totalOk++;
      } catch (err) {
        console.error(`  FAIL: ${pg.name} -> ${err.message}`);
        totalFail++;
      }
      await page.close();
    }

    if (ctx !== authContext && ctx !== tenantContext) {
      await ctx.close();
    }
  }

  await browser.close();
  console.log(`\nDone! ${totalOk} captured, ${totalFail} failed`);
}

main().catch(console.error);
