import { TenantCloudAuth } from './auth';
import { TenantCloudAPI } from './api';

async function main() {
  console.log('TenantCloud Read-Only Tool');
  console.log('=========================\n');

  const auth = new TenantCloudAuth();
  const loaded = await auth.loadToken();
  if (!loaded) {
    console.error('No saved credentials. Run setup first:');
    console.error('  npx ts-node src/setup.ts "<cookies>" "<fingerprint>"');
    process.exit(1);
  }

  const api = new TenantCloudAPI(auth);

  // ── Properties ──
  console.log('=== Properties ===');
  const properties = await api.getAllProperties();
  const propMap = new Map(properties.map((p: any) => [String(p.id), p.attributes.name]));
  for (const prop of properties) {
    const a = prop.attributes;
    console.log(`  [${prop.id}] ${a.name} - ${a.address1}, ${a.city}, ${a.state} ${a.zip}`);
  }
  console.log(`  Total: ${properties.length}\n`);

  // ── Units ──
  console.log('=== Units ===');
  const units = await api.getAllUnits();
  const unitMap = new Map(units.map((u: any) => [String(u.id), u.attributes.name]));
  for (const unit of units) {
    const a = unit.attributes;
    const propName = propMap.get(String(a.property_id)) || `Property ${a.property_id}`;
    console.log(`  [${unit.id}] ${propName} > ${a.name} - $${a.price ?? '?'}/mo, rented: ${a.is_rented}`);
  }
  console.log(`  Total: ${units.length}\n`);

  // ── Tenants ──
  console.log('=== Tenants ===');
  const tenants = await api.getTenants();
  for (const t of tenants) {
    const a = t.attributes;
    const statusLabel = a.status === 2 ? 'active' : a.status === 1 ? 'invited' : `status:${a.status}`;
    console.log(`  [${t.id}] ${a.firstName} ${a.lastName} - ${statusLabel} - ${a.email || 'no email'} - ${a.phone || 'no phone'}`);
  }
  console.log(`  Total: ${tenants.length}\n`);

  // ── Active Leases ──
  console.log('=== Active Leases ===');
  const allLeases = await api.getAllLeases();
  const activeLeases = allLeases.filter(l => l.attributes.lease_status === 0);
  for (const lease of activeLeases) {
    const a = lease.attributes;
    const propName = propMap.get(String(a.property_id)) || `Property ${a.property_id}`;
    const unitName = unitMap.get(String(a.unit_id)) || `Unit ${a.unit_id}`;
    const rent = a.temp_transactions?.rent?.amount;
    console.log(`  [${lease.id}] ${propName} > ${unitName} - $${rent ?? '?'}/mo - ${a.rent_from} to ${a.rent_to || 'MTM'}`);
  }
  console.log(`  Active: ${activeLeases.length} / Total: ${allLeases.length}\n`);

  // ── Transactions (paginated, show first 2 pages) ──
  console.log('=== Transactions (page 1) ===');
  const txnPage1 = await api.getTransactions({ page: 1 });
  const pagination = txnPage1.meta?.pagination;
  console.log(`  Total: ${pagination?.total}, Per page: ${pagination?.per_page}, Pages: ${pagination?.total_pages}`);
  for (const txn of txnPage1.data) {
    const a = txn.attributes;
    const propName = propMap.get(String(a.property_id)) || `Property ${a.property_id}`;
    console.log(`  [${txn.id}] ${a.date} ${a.category.padEnd(7)} $${String(a.amount).padStart(8)} - ${propName} - ${a.details || a.name || ''}`);
  }

  console.log('\n=== Transactions (page 2) ===');
  const txnPage2 = await api.getTransactions({ page: 2 });
  for (const txn of txnPage2.data) {
    const a = txn.attributes;
    const propName = propMap.get(String(a.property_id)) || `Property ${a.property_id}`;
    console.log(`  [${txn.id}] ${a.date} ${a.category.padEnd(7)} $${String(a.amount).padStart(8)} - ${propName} - ${a.details || a.name || ''}`);
  }
  console.log(`  Pagination confirmed: page 2 of ${pagination?.total_pages}\n`);

  // ── Listings ──
  console.log('=== Active Listings ===');
  const listings = await api.getListings();
  for (const l of listings.data || []) {
    const a = l.attributes;
    const propName = propMap.get(String(a.property_id)) || `Property ${a.property_id}`;
    const unitName = unitMap.get(String(a.unit_id)) || `Unit ${a.unit_id}`;
    console.log(`  [${l.id}] ${propName} > ${unitName} - $${a.price}/mo`);
  }
  console.log(`  Total: ${listings.data?.length || 0}\n`);

  // ── Applications ──
  console.log('=== Applications ===');
  const apps = await api.getApplications();
  for (const a of apps.data || []) {
    const attr = a.attributes;
    const propName = propMap.get(String(attr.property_id)) || `Property ${attr.property_id}`;
    const unitName = unitMap.get(String(attr.unit_id)) || `Unit ${attr.unit_id}`;
    console.log(`  [${a.id}] ${propName} > ${unitName}`);
  }
  console.log(`  Total: ${apps.data?.length || 0}\n`);

  console.log('Done.');
}

main();
