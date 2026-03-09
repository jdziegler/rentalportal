import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate via test-login API", async ({ request }) => {
  // Use test login API to get a session cookie
  const res = await request.post("/api/auth/test-login", {
    data: { email: process.env.TEST_USER_EMAIL || "rent.ziegler@gmail.com" },
  });
  expect(res.ok()).toBeTruthy();

  // Save the authenticated state (cookies)
  await request.storageState({ path: authFile });
});
