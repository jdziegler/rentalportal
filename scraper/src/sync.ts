/**
 * TenantCloud → PropertyPilot Incremental Sync
 *
 * Fetches data from TenantCloud and upserts into PropertyPilot using tcId
 * as the external identifier. Safe to run repeatedly — never duplicates,
 * never touches locally-created records (those without tcId).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx ts-node src/sync.ts --user=<id>
 *
 * Flags:
 *   --user=ID          Required. PropertyPilot user ID
 *   --skip-download    Use previously saved JSON from /data/ instead of calling TC API
 *   --reset            Clear all user data before sync (use for first-time setup)
 *   --dry-run          Show what would change without writing to DB
 */

import fs from 'fs';
import path from 'path';

// Load .env if present (so DATABASE_URL doesn't need to be passed manually)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

import { TenantCloudAuth } from './auth';
import { TenantCloudAPI } from './api';
import { PrismaClient, PropertyType, UnitType, ContactStatus, LeaseType, LeaseStatus, TransactionStatus, RentPeriod } from '@prisma/client';

const DATA_DIR = path.join(__dirname, '..', 'data');
const prisma = new PrismaClient();

// ── TC integer → Prisma enum mappers ──

function mapLeaseStatus(n: number): LeaseStatus {
  const m: Record<number, LeaseStatus> = { 0: "ACTIVE", 1: "EXPIRED", 2: "TERMINATED", 4: "EXPIRED" };
  return m[n] ?? "EXPIRED";
}

function mapLeaseType(n: number): LeaseType {
  const m: Record<number, LeaseType> = { 1: "FIXED", 2: "MONTH_TO_MONTH" };
  return m[n] ?? "FIXED";
}

function mapTransactionStatus(n: number): TransactionStatus {
  const m: Record<number, TransactionStatus> = { 0: "UNPAID", 1: "PAID", 2: "PARTIAL", 3: "PENDING", 4: "WAIVED", 9: "VOIDED" };
  return m[n] ?? "UNPAID";
}

function mapContactStatus(n: number): ContactStatus {
  const m: Record<number, ContactStatus> = { 0: "PENDING", 1: "INVITED", 2: "ACTIVE", 3: "INACTIVE" };
  return m[n] ?? "PENDING";
}

function mapPropertyType(n: number): PropertyType {
  const m: Record<number, PropertyType> = { 1: "SINGLE_FAMILY", 2: "MULTI_FAMILY", 3: "COMMERCIAL" };
  return m[n] ?? "MULTI_FAMILY";
}

function mapUnitType(n: number): UnitType {
  const m: Record<number, UnitType> = { 1: "APARTMENT", 2: "HOUSE", 3: "ROOM" };
  return m[n] ?? "APARTMENT";
}

function mapRentPeriod(n: number): RentPeriod {
  const m: Record<number, RentPeriod> = { 1: "WEEKLY", 2: "BIWEEKLY", 5: "MONTHLY", 6: "QUARTERLY", 7: "YEARLY" };
  return m[n] ?? "MONTHLY";
}

function mapPaymentMethod(n: number): string {
  const m: Record<number, string> = { 1: "cash", 2: "check", 5: "money_order", 10: "other", 15: "ach", 17: "card" };
  return m[n] ?? "other";
}

// Stats tracking
const stats = {
  properties: { created: 0, updated: 0, skipped: 0 },
  units: { created: 0, updated: 0, skipped: 0 },
  contacts: { created: 0, updated: 0, skipped: 0 },
  leases: { created: 0, updated: 0, skipped: 0 },
  transactions: { created: 0, updated: 0, skipped: 0 },
  payments: { created: 0, updated: 0, skipped: 0 },
  listings: { created: 0, updated: 0, skipped: 0 },
};

// ── Download / Load ──

async function downloadAll(api: TenantCloudAPI) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('\n  Downloading from TenantCloud...\n');

  const download = async (name: string, fetcher: () => Promise<any[]>) => {
    console.log(`    ${name}...`);
    const data = await fetcher();
    fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
    console.log(`      ${data.length} ${name}`);
    return data;
  };

  const result = {
    properties: await download('properties', () => api.getAllProperties()),
    units: await download('units', () => api.getAllUnits()),
    contacts: await download('contacts', () => api.getAllContacts()),
    leases: await download('leases', () => api.getAllLeases()),
    transactions: await download('transactions', () => api.getAllPages('/transactions')),
    payments: await download('payments', () => api.getAllPages('/transactions/payments', {
      'filter[is_refund]': false,
      'fields[transaction_payment]': 'amount,currency,date,transaction_id,method,method_details,details,is_refund,status',
      'sort': '-date,-id',
    })),
    listings: await download('listings', () => api.getAllPages('/listings')),
    roommates: [] as Array<{ leaseId: string; primaryId: number; roommateIds: number[] }>,
  };

  // Fetch roommates for active leases
  console.log('    roommates...');
  const activeLeases = result.leases.filter((l: any) => l.attributes?.lease_status === 0);
  for (const lease of activeLeases) {
    try {
      const res = await api.get('/leases/' + lease.id + '?include=roommates');
      const included = (res.included || []) as any[];
      const roommates = included.filter((i: any) => i.type === 'lease_roommate');
      if (roommates.length > 1) {
        // Only store if there are actual co-tenants (more than just the primary)
        result.roommates.push({
          leaseId: lease.id,
          primaryId: lease.attributes.user_client_id,
          roommateIds: roommates.map((r: any) => r.attributes.user_client_id),
        });
      }
    } catch {
      // Skip if endpoint fails
    }
  }
  fs.writeFileSync(path.join(DATA_DIR, 'roommates.json'), JSON.stringify(result.roommates, null, 2));
  console.log(`      ${result.roommates.length} leases with co-tenants`);

  return result;
}

function loadFromDisk() {
  console.log('\n  Loading from disk...\n');
  const load = (name: string) => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf-8'));
    console.log(`    ${data.length} ${name}`);
    return data;
  };
  const roommatesPath = path.join(DATA_DIR, 'roommates.json');
  const roommates = fs.existsSync(roommatesPath)
    ? JSON.parse(fs.readFileSync(roommatesPath, 'utf-8'))
    : [];
  if (roommates.length > 0) console.log(`    ${roommates.length} lease roommate entries`);

  const paymentsPath = path.join(DATA_DIR, 'payments.json');
  const payments = fs.existsSync(paymentsPath)
    ? JSON.parse(fs.readFileSync(paymentsPath, 'utf-8'))
    : [];
  if (payments.length > 0) console.log(`    ${payments.length} payments`);

  return {
    properties: load('properties'),
    units: load('units'),
    contacts: load('contacts'),
    leases: load('leases'),
    transactions: load('transactions'),
    payments,
    listings: load('listings'),
    roommates,
  };
}

// ── Sync Logic ──

async function syncAll(
  userId: string,
  data: { properties: any[]; units: any[]; contacts: any[]; leases: any[]; transactions: any[]; payments: any[]; listings: any[]; roommates?: any[] },
  dryRun: boolean
) {
  console.log('\n  Syncing to PropertyPilot...\n');

  // Build lookup maps: TC ID → PP ID (populated as we upsert)
  const propertyMap = new Map<number, string>();
  const unitMap = new Map<number, string>();
  const contactMap = new Map<number, string>();
  const leaseMap = new Map<number, string>();

  // ── Properties ──
  console.log('    Properties...');
  for (const p of data.properties) {
    const tcId = parseInt(p.id);
    const a = p.attributes;
    const fields = {
      userId,
      name: a.name,
      type: mapPropertyType(a.type ?? 2),
      year: a.year || null,
      currency: a.currency || 'USD',
      address: a.address1 || a.address?.street_address || a.name,
      city: a.city || a.address?.city || '',
      state: a.state || a.address?.state || '',
      zip: a.zip || a.address?.zip || '',
      county: a.county || a.address?.county || null,
      country: a.country || a.address?.country || 'US',
      description: a.description || null,
      amenities: a.amenities || [],
      archivedAt: a.archived_at ? new Date(a.archived_at) : null,
    };

    if (dryRun) {
      const existing = await prisma.property.findUnique({ where: { tcId } });
      if (existing) stats.properties.updated++;
      else stats.properties.created++;
      propertyMap.set(tcId, existing?.id || 'dry-run');
      continue;
    }

    const record = await prisma.property.upsert({
      where: { tcId },
      create: { ...fields, tcId, createdAt: a.created_at ? new Date(a.created_at) : new Date() },
      update: fields,
    });
    propertyMap.set(tcId, record.id);

    // Check if this was a create or update by comparing createdAt vs updatedAt
    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.properties.created++;
    } else {
      stats.properties.updated++;
    }
  }
  logStats('Properties', stats.properties);

  // ── Units ──
  console.log('    Units...');
  for (const u of data.units) {
    const tcId = parseInt(u.id);
    const a = u.attributes;
    const propertyId = propertyMap.get(a.property_id);
    if (!propertyId) { stats.units.skipped++; continue; }

    const fields = {
      propertyId,
      name: a.name || `Unit ${u.id}`,
      type: mapUnitType(a.type ?? 1),
      bedrooms: a.bedrooms || null,
      bathrooms: a.bathrooms || null,
      size: a.size || null,
      price: a.price || null,
      deposit: a.deposit || null,
      description: a.description || null,
      isRented: a.is_rented ?? false,
      features: a.features || [],
      petsAllowed: a.pets_allowed ?? false,
    };

    if (dryRun) {
      const existing = await prisma.unit.findUnique({ where: { tcId } });
      if (existing) stats.units.updated++;
      else stats.units.created++;
      unitMap.set(tcId, existing?.id || 'dry-run');
      continue;
    }

    const record = await prisma.unit.upsert({
      where: { tcId },
      create: { ...fields, tcId, createdAt: a.created_at ? new Date(a.created_at) : new Date() },
      update: fields,
    });
    unitMap.set(tcId, record.id);

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.units.created++;
    } else {
      stats.units.updated++;
    }
  }
  logStats('Units', stats.units);

  // ── Contacts ──
  console.log('    Contacts...');
  for (const c of data.contacts) {
    const tcId = parseInt(c.id);
    const a = c.attributes;
    const fields = {
      userId,
      role: a.role || 'tenant',
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      email: a.email || null,
      phone: a.phone || null,
      address: a.address1 || null,
      city: a.city || null,
      state: a.state || null,
      zip: a.zip || null,
      status: mapContactStatus(a.status ?? 0),
      notes: a.notes || null,
      archivedAt: a.archived_at ? new Date(a.archived_at) : null,
    };

    if (dryRun) {
      const existing = await prisma.contact.findUnique({ where: { tcId } });
      if (existing) stats.contacts.updated++;
      else stats.contacts.created++;
      contactMap.set(tcId, existing?.id || 'dry-run');
      continue;
    }

    const record = await prisma.contact.upsert({
      where: { tcId },
      create: {
        ...fields,
        tcId,
        createdAt: a.created_at ? new Date(a.created_at) : a.requested_at ? new Date(a.requested_at) : new Date(),
      },
      update: fields,
    });
    contactMap.set(tcId, record.id);

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.contacts.created++;
    } else {
      stats.contacts.updated++;
    }
  }
  logStats('Contacts', stats.contacts);

  // ── Leases ──
  console.log('    Leases...');
  for (const l of data.leases) {
    const tcId = parseInt(l.id);
    const a = l.attributes;
    const unitId = unitMap.get(a.unit_id);
    const contactId = contactMap.get(a.user_client_id);
    if (!unitId || !contactId) { stats.leases.skipped++; continue; }

    const rentAmount = a.temp_transactions?.rent?.amount ?? a.amount ?? 0;
    const rentPeriod = mapRentPeriod(a.temp_transactions?.rent?.period ?? 5);
    const rentDueDay = a.temp_transactions?.rent?.day ?? 1;
    const currency = a.temp_transactions?.rent?.currency ?? a.currency ?? 'USD';
    const deposit = a.temp_transactions?.deposits?.[0]?.amount ?? a.deposit ?? null;

    const fields = {
      userId,
      unitId,
      contactId,
      name: a.name || null,
      leaseType: mapLeaseType(a.lease_type ?? 1),
      leaseStatus: mapLeaseStatus(a.lease_status ?? 0),
      rentAmount,
      rentPeriod,
      rentDueDay,
      currency,
      startDate: new Date(a.rent_from),
      endDate: a.rent_to ? new Date(a.rent_to) : null,
      deposit,
    };

    if (dryRun) {
      const existing = await prisma.lease.findUnique({ where: { tcId } });
      if (existing) stats.leases.updated++;
      else stats.leases.created++;
      leaseMap.set(tcId, existing?.id || 'dry-run');
      continue;
    }

    const record = await prisma.lease.upsert({
      where: { tcId },
      create: { ...fields, tcId, createdAt: a.created_at ? new Date(a.created_at) : new Date() },
      update: fields,
    });
    leaseMap.set(tcId, record.id);

    // Ensure primary tenant is in LeaseTenant join table
    if (!dryRun && contactId) {
      await prisma.leaseTenant.upsert({
        where: { leaseId_contactId: { leaseId: record.id, contactId } },
        create: { leaseId: record.id, contactId, isPrimary: true },
        update: { isPrimary: true },
      });
    }

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.leases.created++;
    } else {
      stats.leases.updated++;
    }
  }
  logStats('Leases', stats.leases);

  // ── Roommates (co-tenants on leases) ──
  if (data.roommates && !dryRun) {
    console.log('    Roommates...');
    let roommatesAdded = 0;
    for (const entry of data.roommates) {
      const leaseId = leaseMap.get(parseInt(entry.leaseId));
      if (!leaseId) continue;

      for (const rmTcId of entry.roommateIds) {
        // Skip the primary tenant (already linked above)
        if (rmTcId === entry.primaryId) continue;
        const rmContactId = contactMap.get(rmTcId);
        if (!rmContactId) continue;

        await prisma.leaseTenant.upsert({
          where: { leaseId_contactId: { leaseId, contactId: rmContactId } },
          create: { leaseId, contactId: rmContactId, isPrimary: false },
          update: {},
        });
        roommatesAdded++;
      }
    }
    console.log(`      ${roommatesAdded} co-tenant links added`);
  }

  // ── Transactions ──
  console.log('    Transactions...');
  const total = data.transactions.length;

  for (let i = 0; i < total; i++) {
    const t = data.transactions[i];
    const tcId = parseInt(t.id);
    const a = t.attributes;
    const propertyId = propertyMap.get(a.property_id) || null;
    const unitId = unitMap.get(a.unit_id) || null;
    const contactId = contactMap.get(a.client_id) || null;

    let leaseId: string | null = null;
    if (a.item_category === 'PropertyUnitLease' && a.item_id) {
      leaseId = leaseMap.get(a.item_id) || null;
    }

    if (!propertyId) { stats.transactions.skipped++; continue; }

    // Infer subcategory from TC data (TC sends subcategory: null)
    const detailsText = ((a.details || a.name || '') as string).toLowerCase();
    let subcategory: string | null = a.subcategory || null;
    if (!subcategory) {
      if (detailsText.includes('late fee')) subcategory = 'late_fee';
      else if (detailsText.includes('deposit')) subcategory = 'deposit';
      else if (detailsText.includes('rent')) subcategory = 'rent';
    }

    const fields = {
      userId,
      propertyId,
      unitId,
      leaseId,
      contactId,
      category: a.category || 'income',
      subcategory,
      amount: a.amount ?? 0,
      currency: a.currency || 'USD',
      date: new Date(a.date),
      paidAt: a.paid_at ? new Date(a.paid_at) : null,
      paidAmount: a.paid ?? 0,
      balance: a.balance ?? 0,
      details: a.details || a.name || null,
      note: a.note || null,
      isRecurring: a.is_recurring ?? false,
      status: mapTransactionStatus(a.status ?? 0),
    };

    if (dryRun) {
      const existing = await prisma.transaction.findUnique({ where: { tcId } });
      if (existing) stats.transactions.updated++;
      else stats.transactions.created++;
      continue;
    }

    const record = await prisma.transaction.upsert({
      where: { tcId },
      create: { ...fields, tcId, createdAt: a.created_at ? new Date(a.created_at) : new Date() },
      update: fields,
    });

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.transactions.created++;
    } else {
      stats.transactions.updated++;
    }

    // Progress every 500
    if ((i + 1) % 500 === 0 || i + 1 === total) {
      process.stdout.write(`      ${i + 1}/${total}\r`);
    }
  }
  console.log('');
  logStats('Transactions', stats.transactions);

  // ── Payments ──
  console.log('    Payments...');
  const totalPayments = data.payments.length;

  // Build a lookup: TC transaction_id → PP transaction ID
  // Query all transactions with tcId to avoid N+1 queries
  const txnLookup = new Map<number, string>();
  const allTxns = await prisma.transaction.findMany({
    where: { userId, tcId: { not: null } },
    select: { id: true, tcId: true },
  });
  for (const txn of allTxns) {
    if (txn.tcId !== null) txnLookup.set(txn.tcId, txn.id);
  }

  for (let i = 0; i < totalPayments; i++) {
    const p = data.payments[i];
    const tcId = parseInt(p.id);
    const a = p.attributes;

    const transactionId = txnLookup.get(a.transaction_id);
    if (!transactionId) { stats.payments.skipped++; continue; }

    // Extract Stripe payment intent ID from method_details if present
    let stripePaymentIntentId: string | null = null;
    if (a.method_details && typeof a.method_details === 'string') {
      const piMatch = a.method_details.match(/#?(pi_\w+)/);
      if (piMatch) stripePaymentIntentId = piMatch[1];
    }

    const fields = {
      transactionId,
      amount: a.amount ?? 0,
      date: new Date(a.date),
      method: mapPaymentMethod(a.method ?? 10),
      status: a.status || null,
      note: a.details || null,
      type: a.is_refund ? 'refund' : 'payment',
    };

    if (dryRun) {
      const existing = await prisma.payment.findUnique({ where: { tcId } });
      if (existing) stats.payments.updated++;
      else stats.payments.created++;
      continue;
    }

    // Only set stripePaymentIntentId if not already used by another payment
    let safeStripeId = stripePaymentIntentId;
    if (safeStripeId) {
      const existing = await prisma.payment.findUnique({ where: { stripePaymentIntentId: safeStripeId } });
      if (existing && existing.tcId !== tcId) safeStripeId = null;
    }

    const record = await prisma.payment.upsert({
      where: { tcId },
      create: { ...fields, tcId, stripePaymentIntentId: safeStripeId },
      update: fields,
    });

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.payments.created++;
    } else {
      stats.payments.updated++;
    }

    // Progress every 500
    if ((i + 1) % 500 === 0 || i + 1 === totalPayments) {
      process.stdout.write(`      ${i + 1}/${totalPayments}\r`);
    }
  }
  console.log('');
  logStats('Payments', stats.payments);

  // ── Listings ──
  console.log('    Listings...');
  for (const l of data.listings) {
    const tcId = parseInt(l.id);
    const a = l.attributes;
    const propertyId = propertyMap.get(a.property_id);
    const unitId = unitMap.get(a.unit_id);
    if (!propertyId || !unitId) { stats.listings.skipped++; continue; }

    const fields = {
      userId,
      propertyId,
      unitId,
      description: a.description || null,
      price: a.price ?? 0,
      isActive: a.status === 1 || a.published_at !== null,
    };

    if (dryRun) {
      const existing = await prisma.listing.findUnique({ where: { tcId } });
      if (existing) stats.listings.updated++;
      else stats.listings.created++;
      continue;
    }

    const record = await prisma.listing.upsert({
      where: { tcId },
      create: { ...fields, tcId, createdAt: a.created_at ? new Date(a.created_at) : new Date() },
      update: fields,
    });

    if (record.createdAt.getTime() === record.updatedAt.getTime()) {
      stats.listings.created++;
    } else {
      stats.listings.updated++;
    }
  }
  logStats('Listings', stats.listings);
}

function logStats(name: string, s: { created: number; updated: number; skipped: number }) {
  const parts = [];
  if (s.created) parts.push(`${s.created} created`);
  if (s.updated) parts.push(`${s.updated} updated`);
  if (s.skipped) parts.push(`${s.skipped} skipped`);
  console.log(`      ${name}: ${parts.join(', ') || 'no changes'}`);
}

// ── Reset (clear all user data) ──

async function resetUserData(userId: string) {
  console.log('\n  Clearing existing user data...');
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.listing.deleteMany({ where: { userId } });
  await prisma.lease.deleteMany({ where: { userId } });
  await prisma.contact.deleteMany({ where: { userId } });
  await prisma.property.deleteMany({ where: { userId } });
  console.log('    Done');
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const skipDownload = args.includes('--skip-download');
  const reset = args.includes('--reset');
  const dryRun = args.includes('--dry-run');
  const userId = args.find(a => a.startsWith('--user='))?.split('=')[1];

  if (!userId) {
    console.error('Usage: npx ts-node src/sync.ts --user=<id> [--skip-download] [--reset] [--dry-run]');
    console.error('');
    console.error('  --user=ID          Required. PropertyPilot user ID');
    console.error('  --skip-download    Use saved JSON from /data/ instead of calling TC API');
    console.error('  --reset            Clear all user data before sync (first-time setup)');
    console.error('  --dry-run          Preview changes without writing to DB');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`Error: User ${userId} not found.`);
    process.exit(1);
  }

  console.log(`\n  Sync for: ${user.name || user.email}`);
  if (dryRun) console.log('  (DRY RUN - no changes will be made)');

  // Download or load data
  let data;
  if (skipDownload) {
    if (!fs.existsSync(path.join(DATA_DIR, 'properties.json'))) {
      console.error('Error: No saved data. Run without --skip-download first.');
      process.exit(1);
    }
    data = loadFromDisk();
  } else {
    const auth = new TenantCloudAuth();
    const loaded = await auth.loadToken();
    if (!loaded) {
      console.error('Error: No TenantCloud credentials. Run setup.ts first.');
      process.exit(1);
    }
    const api = new TenantCloudAPI(auth);
    data = await downloadAll(api);
  }

  // Reset if requested
  if (reset && !dryRun) {
    await resetUserData(userId);
  }

  // Sync
  await syncAll(userId, data, dryRun);

  // Final counts
  const counts = await Promise.all([
    prisma.property.count({ where: { userId } }),
    prisma.unit.count({ where: { property: { userId } } }),
    prisma.contact.count({ where: { userId } }),
    prisma.lease.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.payment.count({ where: { transaction: { userId } } }),
    prisma.listing.count({ where: { userId } }),
  ]);

  console.log('\n  Sync complete! Database totals:\n');
  console.log('    Properties:   ', counts[0]);
  console.log('    Units:        ', counts[1]);
  console.log('    Contacts:     ', counts[2]);
  console.log('    Leases:       ', counts[3]);
  console.log('    Transactions: ', counts[4]);
  console.log('    Payments:     ', counts[5]);
  console.log('    Listings:     ', counts[6]);
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\n  Sync failed:', err.message || err);
  await prisma.$disconnect();
  process.exit(1);
});
