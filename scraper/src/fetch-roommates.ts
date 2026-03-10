import { TenantCloudAuth } from './auth';
import axios from 'axios';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');

async function main() {
  const auth = new TenantCloudAuth();
  await auth.loadToken();
  const token = await auth.getAccessToken();
  const client = axios.create({
    baseURL: config.apiUrl,
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
  });

  const leases = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'leases.json'), 'utf-8'));
  const contacts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'contacts.json'), 'utf-8'));

  // Build contact name lookup
  const contactNames: Record<number, string> = {};
  for (const c of contacts) {
    const a = c.attributes || {};
    contactNames[parseInt(c.id)] = (a.firstName || '') + ' ' + (a.lastName || '');
  }

  // Get active leases
  const activeLeases = leases.filter((l: any) => l.attributes?.lease_status === 0);
  console.log('Active leases: ' + activeLeases.length + '\n');

  const results: Array<{ leaseId: string; primaryId: number; roommateIds: number[] }> = [];

  for (const lease of activeLeases) {
    try {
      const res = await client.get('/leases/' + lease.id + '?include=roommates');
      const included = (res.data?.included || []) as any[];
      const roommates = included.filter((i) => i.type === 'lease_roommate');
      const primaryId = lease.attributes.user_client_id as number;

      if (roommates.length > 0) {
        const roommateIds = roommates.map((r) => r.attributes.user_client_id as number);

        console.log('Lease #' + lease.id + ' (primary: ' + contactNames[primaryId] + ' #' + primaryId + ')');
        console.log('  Roommates: ' + roommateIds.map((id) => contactNames[id] + ' #' + id).join(', '));

        results.push({ leaseId: lease.id, primaryId, roommateIds });
      }
    } catch (err: any) {
      console.log('Lease #' + lease.id + ' -> ' + (err.response?.status || err.message));
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'roommates.json'), JSON.stringify(results, null, 2));
  console.log('\nSaved ' + results.length + ' leases with roommates to data/roommates.json');
}

main().catch(console.error);
