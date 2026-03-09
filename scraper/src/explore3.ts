import { TenantCloudAuth } from './auth';
import axios from 'axios';
import { config } from './config';

async function main() {
  const auth = new TenantCloudAuth();
  await auth.loadToken();
  const token = await auth.getAccessToken();

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    },
  });

  // Config services
  console.log('=== CONFIG ===');
  const configRes = await client.get('/config');
  const cfg = configRes.data;
  console.log('Top-level keys:', Object.keys(cfg).join(', '));
  if (cfg.services) console.log('Services:', JSON.stringify(cfg.services, null, 2));
  if (cfg.constants) console.log('Constants keys:', Object.keys(cfg.constants).join(', '));

  // Subscription
  console.log('\n=== SUBSCRIPTION ===');
  const subRes = await client.get('/subscription');
  console.log(JSON.stringify(subRes.data, null, 2));

  // User settings/subscription/payments detail
  console.log('\n=== USER DETAILS (subscription/payments/settings) ===');
  const userRes = await client.get('/auth/user');
  const user = userRes.data.user;
  console.log('Settings:', JSON.stringify(user.settings, null, 2));
  console.log('Subscription:', JSON.stringify(user.subscription, null, 2));
  console.log('Package options:', JSON.stringify(user.package_options, null, 2));
  console.log('Payments:', JSON.stringify(user.payments, null, 2));

  // Onboarding data - shows what features TC considers essential
  console.log('\n=== ONBOARDING ===');
  const authData = userRes.data.auth_data;
  console.log('Onboarding:', JSON.stringify(authData.onboarding, null, 2));
  console.log('Dashboard stats settings:', JSON.stringify(authData.dashboard_statistics_settings, null, 2));
  console.log('Maintenance schedule:', JSON.stringify(authData.maintenance_schedule, null, 2));

  // Files sample
  console.log('\n=== FILES (first 2) ===');
  const filesRes = await client.get('/files');
  const files = filesRes.data.data || [];
  for (let i = 0; i < Math.min(2, files.length); i++) {
    console.log('File ' + i + ':', JSON.stringify(files[i], null, 2).substring(0, 300));
  }
  console.log('Total files:', filesRes.data.meta?.pagination?.total);

  // Applications sample
  console.log('\n=== APPLICATIONS (first) ===');
  const appRes = await client.get('/applications');
  if (appRes.data.data && appRes.data.data[0]) {
    console.log(JSON.stringify(appRes.data.data[0], null, 2).substring(0, 800));
  }

  // Screenings sample
  console.log('\n=== SCREENINGS (first) ===');
  const scrRes = await client.get('/screenings');
  if (scrRes.data.data && scrRes.data.data[0]) {
    console.log(JSON.stringify(scrRes.data.data[0], null, 2).substring(0, 800));
  }

  // Sub-endpoints
  console.log('\n=== SUB-ENDPOINTS ===');
  const subEndpoints = [
    '/export/reports',
    '/export',
    '/account-settings',
    '/user/settings',
    '/settings',
    '/property-groups',
    '/late-fee-settings',
    '/recurring-transactions',
    '/lease-charges',
    '/inspections',
    '/inspection-templates',
    '/payment-accounts',
    '/accounting',
    '/chart-accounts',
    '/reports/rent-roll',
    '/reports/income-expense',
    '/tenant-portal',
    '/move-ins',
    '/move-outs',
    '/owner-reports',
    '/team-members',
    '/user-roles',
    '/payment-methods',
    '/auto-charges',
    '/recurring-charges',
    '/lease-renewals',
    '/signatures',
    '/e-sign',
    '/quickbooks',
    '/communication/threads',
  ];

  for (const ep of subEndpoints) {
    try {
      const res = await client.get(ep, { timeout: 10000 });
      const data = res.data;
      let summary = '';
      if (data?.data && Array.isArray(data.data)) {
        summary = 'ARRAY[' + data.data.length + ']';
        if (data.data.length > 0) {
          const first = data.data[0];
          const keys = first.attributes ? Object.keys(first.attributes).join(', ') : Object.keys(first).join(', ');
          summary += ' keys: ' + keys.substring(0, 100);
        }
      } else if (typeof data === 'object' && data !== null) {
        summary = 'OBJECT keys: ' + Object.keys(data).join(', ').substring(0, 120);
      }
      console.log('  OK ' + ep + ' -> ' + summary);
    } catch (err: any) {
      console.log('  !! ' + ep + ' -> ' + (err.response?.status || err.message));
    }
  }

  // GraphQL types
  console.log('\n=== GRAPHQL TYPES ===');
  try {
    const gql = await client.post('/graphql', {
      query: '{ __schema { types { name kind fields { name } } } }'
    });
    const types = gql.data?.data?.__schema?.types || [];
    const custom = types.filter((t: any) => !t.name.startsWith('__') && t.kind === 'OBJECT' && t.name !== 'Query' && t.name !== 'Mutation');
    for (const t of custom) {
      const fieldNames = (t.fields || []).map((f: any) => f.name).join(', ');
      console.log('  ' + t.name + ': ' + fieldNames.substring(0, 150));
    }
  } catch (err: any) {
    console.log('  Error: ' + (err.response?.status || err.message));
  }

  // Lease full keys
  console.log('\n=== LEASE KEYS ===');
  const leaseRes = await client.get('/leases');
  if (leaseRes.data.data && leaseRes.data.data[0]) {
    console.log(Object.keys(leaseRes.data.data[0].attributes).join(', '));
  }

  // Transaction full keys
  console.log('\n=== TRANSACTION KEYS ===');
  const txRes = await client.get('/transactions');
  if (txRes.data.data && txRes.data.data[0]) {
    console.log(Object.keys(txRes.data.data[0].attributes).join(', '));
  }

  // Listing full keys
  console.log('\n=== LISTING KEYS ===');
  const listRes = await client.get('/listings');
  if (listRes.data.data && listRes.data.data[0]) {
    console.log(Object.keys(listRes.data.data[0].attributes).join(', '));
  }
}

main().catch(console.error);
