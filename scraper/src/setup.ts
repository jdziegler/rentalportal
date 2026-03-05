import { TenantCloudAuth } from './auth';

/**
 * One-time setup: saves your browser credentials so the app can auto-refresh tokens.
 *
 * Usage:
 *   npx ts-node src/setup.ts <cookies> <fingerprint>
 *
 * How to get these values:
 *   1. Log into https://app.tenantcloud.com in your browser
 *   2. Open DevTools (F12) -> Network tab -> reload
 *   3. Find the request to api.tenantcloud.com/auth/token
 *   4. From Request Headers, copy the Cookie value
 *   5. From the Request Payload, copy the fingerprint value
 */

async function main() {
  const cookies = process.argv[2];
  const fingerprint = process.argv[3];

  if (!cookies || !fingerprint) {
    console.log('Setup: Save browser credentials for auto-refresh\n');
    console.log('Usage:');
    console.log('  npx ts-node src/setup.ts "<cookies>" "<fingerprint>"\n');
    console.log('How to get these values:');
    console.log('  1. Log into https://app.tenantcloud.com');
    console.log('  2. Open DevTools (F12) -> Network tab');
    console.log('  3. Find the POST request to api.tenantcloud.com/auth/token');
    console.log('  4. Copy the Cookie request header (arg 1)');
    console.log('  5. Copy the fingerprint from the request body (arg 2)');
    process.exit(1);
  }

  const auth = new TenantCloudAuth();

  // Immediately try to get a token using the refresh flow
  console.log('Testing token refresh...');
  const axios = (await import('axios')).default;
  const res = await axios.post('https://api.tenantcloud.com/auth/token', {
    grant_type: 'refresh_token',
    fingerprint,
  }, {
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://app.tenantcloud.com',
      'Referer': 'https://app.tenantcloud.com/',
    },
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    console.error('Failed to get token:', res.status, JSON.stringify(res.data));
    process.exit(1);
  }

  const data = res.data.data || res.data;
  await auth.setup({
    cookies,
    fingerprint,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 600,
  });

  console.log('Setup complete! You can now run: npm start');
}

main();
