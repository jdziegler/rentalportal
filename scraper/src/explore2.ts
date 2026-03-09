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

  // 1. Full auth/user response - shows all user capabilities
  console.log('=== AUTH/USER ===');
  const userRes = await client.get('/auth/user');
  const user = userRes.data.user;
  console.log('User keys:', Object.keys(user).join(', '));
  console.log('Auth data keys:', Object.keys(userRes.data.auth_data).join(', '));
  const authData = userRes.data.auth_data;
  console.log('Permissions:', JSON.stringify(authData.permissions || authData.roles || 'none', null, 2).substring(0, 500));

  // 2. Config - services and features
  console.log('\n=== CONFIG (services) ===');
  const configRes = await client.get('/config');
  const cfg = configRes.data;
  console.log('Services:', JSON.stringify(cfg.services, null, 2).substring(0, 1000));
  console.log('Constants keys:', Object.keys(cfg.constants || {}).join(', '));

  // 3. Subscription/usage
  console.log('\n=== SUBSCRIPTION ===');
  const subRes = await client.get('/subscription');
  console.log(JSON.stringify(subRes.data, null, 2).substring(0, 1500));

  // 4. Applications - full first record
  console.log('\n=== APPLICATIONS (first record) ===');
  const appRes = await client.get('/applications');
  if (appRes.data.data && appRes.data.data.length > 0) {
    console.log('Keys:', Object.keys(appRes.data.data[0].attributes || appRes.data.data[0]).join(', '));
  }

  // 5. Screenings - full first record
  console.log('\n=== SCREENINGS (first record) ===');
  const scrRes = await client.get('/screenings');
  if (scrRes.data.data && scrRes.data.data.length > 0) {
    console.log('Keys:', Object.keys(scrRes.data.data[0].attributes || scrRes.data.data[0]).join(', '));
  }

  // 6. Files - structure
  console.log('\n=== FILES (first record) ===');
  const filesRes = await client.get('/files');
  if (filesRes.data.data && filesRes.data.data.length > 0) {
    const f = filesRes.data.data[0];
    console.log('Keys:', Object.keys(f.attributes || f).join(', '));
    console.log('Sample:', JSON.stringify(f.attributes || f, null, 2).substring(0, 500));
  }
  console.log('Total files:', filesRes.data.meta?.pagination?.total || '?');

  // 7. Listings - full structure
  console.log('\n=== LISTINGS (first record) ===');
  const listRes = await client.get('/listings');
  if (listRes.data.data && listRes.data.data.length > 0) {
    console.log('All keys:', Object.keys(listRes.data.data[0].attributes).join(', '));
  }

  // 8. Try sub-endpoints for known resources
  console.log('\n=== SUB-ENDPOINTS ===');
  const subEndpoints = [
    '/properties/1/units',
    '/leases/1/transactions',
    '/contacts/1/leases',
    '/export/reports',
    '/export',
    '/reports/income-expense',
    '/reports/rent-roll',
    '/reports/profit-loss',
    '/account-settings',
    '/user/settings',
    '/settings',
    '/property-groups',
    '/late-fee-settings',
    '/recurring-transactions',
    '/lease-charges',
    '/move-in',
    '/move-out',
    '/inspections',
    '/inspection-templates',
    '/payment-accounts',
    '/quickbooks',
    '/accounting',
    '/chart-accounts',
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
      } else if (typeof data === 'object') {
        summary = 'OBJECT keys: ' + Object.keys(data).join(', ').substring(0, 120);
      }
      console.log('  OK ' + ep + ' -> ' + summary);
    } catch (err: any) {
      console.log('  !! ' + ep + ' -> ' + (err.response?.status || err.message));
    }
  }

  // 9. GraphQL - get maintenance request fields
  console.log('\n=== GRAPHQL: Maintenance Request Type ===');
  try {
    const gql = await client.post('/graphql', {
      query: '{ __type(name: "MaintenanceRequest") { fields { name type { name kind ofType { name } } } } }'
    });
    const fields = gql.data?.data?.__type?.fields || [];
    for (const f of fields) {
      const typeName = f.type.name || (f.type.ofType ? f.type.ofType.name : f.type.kind);
      console.log('  ' + f.name + ': ' + typeName);
    }
  } catch (err: any) {
    console.log('  Error: ' + (err.response?.status || err.message));
  }

  // 10. GraphQL - get all custom types to understand data model
  console.log('\n=== GRAPHQL: All Custom Types ===');
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

  // 11. Lease full structure
  console.log('\n=== LEASE (first record full keys) ===');
  const leaseRes = await client.get('/leases');
  if (leaseRes.data.data && leaseRes.data.data.length > 0) {
    console.log('All keys:', Object.keys(leaseRes.data.data[0].attributes).join(', '));
  }

  // 12. Transaction full structure
  console.log('\n=== TRANSACTION (first record full keys) ===');
  const txRes = await client.get('/transactions');
  if (txRes.data.data && txRes.data.data.length > 0) {
    console.log('All keys:', Object.keys(txRes.data.data[0].attributes).join(', '));
  }

  // 13. Contact full structure
  console.log('\n=== CONTACT (first record full keys) ===');
  const ctRes = await client.get('/contacts');
  if (ctRes.data.data && ctRes.data.data.length > 0) {
    console.log('All keys:', Object.keys(ctRes.data.data[0].attributes).join(', '));
  }
}

main().catch(console.error);
