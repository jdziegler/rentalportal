import { TenantCloudAuth } from './auth';
import axios from 'axios';
import { config } from './config';

const ENDPOINTS = [
  // Core
  '/auth/user',
  '/config',
  // Property management
  '/properties',
  '/units',
  '/contacts',
  '/leases',
  '/transactions',
  '/listings',
  // Maintenance
  '/maintenance-requests',
  '/maintenance',
  '/work-orders',
  '/service-requests',
  // Communication
  '/messages',
  '/conversations',
  '/inbox',
  '/notifications',
  '/announcements',
  // Documents
  '/documents',
  '/files',
  '/templates',
  // Applications & Screening
  '/applications',
  '/rental-applications',
  '/screening',
  '/screenings',
  '/tenant-screening',
  // Financial
  '/invoices',
  '/payments',
  '/reports',
  '/exports',
  '/chart-of-accounts',
  '/accounts',
  '/bank-accounts',
  '/reconciliation',
  // Insurance
  '/insurance',
  '/renters-insurance',
  // Vendors
  '/vendors',
  '/professionals',
  // Tasks & Notes
  '/tasks',
  '/notes',
  '/reminders',
  // Subscription
  '/subscription',
  '/billing',
  '/integrations',
  // Other
  '/dashboard',
  '/dashboard/stats',
  '/late-fees',
  '/charges',
  '/deposits',
  '/e-signatures',
  '/lease-templates',
  '/property-types',
  '/amenities',
  '/categories',
  '/tags',
];

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

  console.log('Probing TenantCloud API endpoints...\n');

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await client.get(endpoint, { timeout: 10000 });
      const data = res.data;
      let summary = '';

      if (data?.data && Array.isArray(data.data)) {
        summary = 'ARRAY[' + data.data.length + ']';
        if (data.data.length > 0) {
          const first = data.data[0];
          const keys = first.attributes ? Object.keys(first.attributes).join(', ') : Object.keys(first).join(', ');
          summary += ' keys: ' + keys.substring(0, 120);
        }
        if (data.meta) {
          const total = data.meta.total || (data.meta.pagination ? data.meta.pagination.total : '?');
          summary += ' | meta: total=' + total;
        }
      } else if (data?.data && typeof data.data === 'object') {
        const keys = data.data.attributes ? Object.keys(data.data.attributes).join(', ') : Object.keys(data.data).join(', ');
        summary = 'OBJECT keys: ' + keys.substring(0, 150);
      } else if (typeof data === 'object') {
        summary = 'OBJECT keys: ' + Object.keys(data).join(', ').substring(0, 150);
      } else {
        summary = String(data).substring(0, 100);
      }

      console.log('  OK ' + endpoint + ' -> ' + summary);
    } catch (err: any) {
      const status = err.response?.status || err.message;
      console.log('  !! ' + endpoint + ' -> ' + status);
    }
  }

  // GraphQL introspection
  console.log('\n--- GraphQL Queries & Mutations ---\n');
  try {
    const res = await client.post('/graphql', {
      query: '{ __schema { queryType { fields { name description } } mutationType { fields { name description } } } }'
    });
    const queries = res.data?.data?.__schema?.queryType?.fields || [];
    const mutations = res.data?.data?.__schema?.mutationType?.fields || [];
    console.log('  Queries (' + queries.length + '):');
    for (const q of queries) {
      console.log('    ' + q.name + (q.description ? ' - ' + q.description : ''));
    }
    console.log('\n  Mutations (' + mutations.length + '):');
    for (const m of mutations) {
      console.log('    ' + m.name + (m.description ? ' - ' + m.description : ''));
    }
  } catch (err: any) {
    console.log('  GraphQL error: ' + (err.response?.status || err.message));
  }
}

main().catch(console.error);
