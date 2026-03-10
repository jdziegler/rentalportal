/**
 * TenantCloud → PropertyPilot Migration Tool
 *
 * Downloads all data from TenantCloud via API and imports it into the
 * PropertyPilot PostgreSQL database via Prisma.
 *
 * Usage: DATABASE_URL="postgresql://..." npx ts-node src/migrate.ts
 *
 * Steps:
 *   1. Download properties, units, contacts, leases, transactions, listings
 *   2. Save raw JSON to /scraper/data/ as backup
 *   3. Map fields and insert into PropertyPilot DB
 *
 * Data volumes: 10 properties, 47 units, 114 contacts, 85 leases,
 *               3507 transactions (176 pages), 3 listings
 * Estimated API calls: ~200 (mostly transactions pagination)
 * Estimated time: ~4 minutes at 55 req/min
 */

import { TenantCloudAuth } from './auth';
import { TenantCloudAPI } from './api';
import { PrismaClient, PropertyType, UnitType, ContactStatus, LeaseType, LeaseStatus, TransactionStatus, RentPeriod } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const prisma = new PrismaClient();

// ── TC integer → Prisma enum mappers ──

function mapLeaseStatus(n: number): LeaseStatus {
  const m: Record<number, LeaseStatus> = { 0: "ACTIVE", 1: "EXPIRED", 2: "TERMINATED" };
  return m[n] ?? "ACTIVE";
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

// ID maps: TenantCloud ID → PropertyPilot ID
const propertyMap = new Map<number, string>();
const unitMap = new Map<number, string>();
const contactMap = new Map<number, string>();
const leaseMap = new Map<number, string>();

// ── Step 1: Download all data from TenantCloud ──

async function downloadAll(api: TenantCloudAPI) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('\n📥 Downloading data from TenantCloud...\n');

  // Properties (1 page)
  console.log('  Properties...');
  const properties = await api.getAllProperties();
  fs.writeFileSync(path.join(DATA_DIR, 'properties.json'), JSON.stringify(properties, null, 2));
  console.log(`    ✓ ${properties.length} properties`);

  // Units (4 pages)
  console.log('  Units...');
  const units = await api.getAllUnits();
  fs.writeFileSync(path.join(DATA_DIR, 'units.json'), JSON.stringify(units, null, 2));
  console.log(`    ✓ ${units.length} units`);

  // Contacts (10 pages)
  console.log('  Contacts...');
  const contacts = await api.getAllContacts();
  fs.writeFileSync(path.join(DATA_DIR, 'contacts.json'), JSON.stringify(contacts, null, 2));
  console.log(`    ✓ ${contacts.length} contacts`);

  // Leases (8 pages)
  console.log('  Leases...');
  const leases = await api.getAllLeases();
  fs.writeFileSync(path.join(DATA_DIR, 'leases.json'), JSON.stringify(leases, null, 2));
  console.log(`    ✓ ${leases.length} leases`);

  // Transactions (176 pages - the big one)
  console.log('  Transactions (this will take a few minutes)...');
  const transactions = await api.getAllPages('/transactions');
  fs.writeFileSync(path.join(DATA_DIR, 'transactions.json'), JSON.stringify(transactions, null, 2));
  console.log(`    ✓ ${transactions.length} transactions`);

  // Listings (1 page)
  console.log('  Listings...');
  const listings = await api.getAllPages('/listings');
  fs.writeFileSync(path.join(DATA_DIR, 'listings.json'), JSON.stringify(listings, null, 2));
  console.log(`    ✓ ${listings.length} listings`);

  return { properties, units, contacts, leases, transactions, listings };
}

// ── Step 2: Load from saved JSON (skip download) ──

function loadFromDisk() {
  console.log('\n📂 Loading data from disk...\n');
  const load = (name: string) => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf-8'));
    console.log(`  ✓ ${data.length} ${name}`);
    return data;
  };

  return {
    properties: load('properties'),
    units: load('units'),
    contacts: load('contacts'),
    leases: load('leases'),
    transactions: load('transactions'),
    listings: load('listings'),
  };
}

// ── Step 3: Import into PropertyPilot ──

async function importAll(
  userId: string,
  data: {
    properties: any[];
    units: any[];
    contacts: any[];
    leases: any[];
    transactions: any[];
    listings: any[];
  }
) {
  console.log('\n📤 Importing into PropertyPilot...\n');

  // Properties
  console.log('  Properties...');
  for (const p of data.properties) {
    const a = p.attributes;
    const record = await prisma.property.create({
      data: {
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
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
      },
    });
    propertyMap.set(parseInt(p.id), record.id);
  }
  console.log(`    ✓ ${data.properties.length} properties imported`);

  // Units
  console.log('  Units...');
  for (const u of data.units) {
    const a = u.attributes;
    const propertyId = propertyMap.get(a.property_id);
    if (!propertyId) {
      console.log(`    ⚠ Skipping unit ${u.id}: property ${a.property_id} not found`);
      continue;
    }
    const record = await prisma.unit.create({
      data: {
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
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
      },
    });
    unitMap.set(parseInt(u.id), record.id);
  }
  console.log(`    ✓ ${unitMap.size} units imported`);

  // Contacts
  console.log('  Contacts...');
  for (const c of data.contacts) {
    const a = c.attributes;
    const record = await prisma.contact.create({
      data: {
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
        createdAt: a.created_at
          ? new Date(a.created_at)
          : a.requested_at
            ? new Date(a.requested_at)
            : new Date(),
      },
    });
    contactMap.set(parseInt(c.id), record.id);
  }
  console.log(`    ✓ ${contactMap.size} contacts imported`);

  // Leases
  console.log('  Leases...');
  let leaseSkipped = 0;
  for (const l of data.leases) {
    const a = l.attributes;
    const unitId = unitMap.get(a.unit_id);
    const contactId = contactMap.get(a.user_client_id);

    if (!unitId || !contactId) {
      leaseSkipped++;
      continue;
    }

    // Get rent amount from temp_transactions
    const rentAmount = a.temp_transactions?.rent?.amount ?? a.amount ?? 0;
    const rentPeriod = mapRentPeriod(a.temp_transactions?.rent?.period ?? 5);
    const rentDueDay = a.temp_transactions?.rent?.day ?? 1;
    const currency = a.temp_transactions?.rent?.currency ?? a.currency ?? 'USD';
    const deposit = a.temp_transactions?.deposits?.[0]?.amount ?? a.deposit ?? null;

    const record = await prisma.lease.create({
      data: {
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
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
      },
    });
    leaseMap.set(parseInt(l.id), record.id);
  }
  console.log(`    ✓ ${leaseMap.size} leases imported (${leaseSkipped} skipped - missing unit/contact)`);

  // Transactions
  console.log('  Transactions...');
  let txnCount = 0;
  let txnSkipped = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < data.transactions.length; i += BATCH_SIZE) {
    const batch = data.transactions.slice(i, i + BATCH_SIZE);
    const creates = [];

    for (const t of batch) {
      const a = t.attributes;
      const propertyId = propertyMap.get(a.property_id) || null;
      const unitId = unitMap.get(a.unit_id) || null;
      const contactId = contactMap.get(a.client_id) || null;

      // Try to find the lease via item_id if it's a lease transaction
      let leaseId: string | null = null;
      if (a.item_category === 'PropertyUnitLease' && a.item_id) {
        leaseId = leaseMap.get(a.item_id) || null;
      }

      if (!propertyId) {
        txnSkipped++;
        continue;
      }

      creates.push({
        userId,
        propertyId,
        unitId,
        leaseId,
        contactId,
        category: a.category || 'income',
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
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
      });
    }

    if (creates.length > 0) {
      await prisma.transaction.createMany({ data: creates });
      txnCount += creates.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= data.transactions.length) {
      console.log(`    ... ${Math.min(i + BATCH_SIZE, data.transactions.length)}/${data.transactions.length}`);
    }
  }
  console.log(`    ✓ ${txnCount} transactions imported (${txnSkipped} skipped)`);

  // Listings
  console.log('  Listings...');
  let listingCount = 0;
  for (const l of data.listings) {
    const a = l.attributes;
    const propertyId = propertyMap.get(a.property_id);
    const unitId = unitMap.get(a.unit_id);

    if (!propertyId || !unitId) continue;

    await prisma.listing.create({
      data: {
        userId,
        propertyId,
        unitId,
        description: a.description || null,
        price: a.price ?? 0,
        isActive: a.status === 1 || a.published_at !== null,
        createdAt: a.created_at ? new Date(a.created_at) : new Date(),
      },
    });
    listingCount++;
  }
  console.log(`    ✓ ${listingCount} listings imported`);
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const skipDownload = args.includes('--skip-download');
  const userId = args.find(a => a.startsWith('--user='))?.split('=')[1];

  if (!userId) {
    console.error('Usage: npx ts-node src/migrate.ts --user=<PropertyPilot_user_id> [--skip-download]');
    console.error('');
    console.error('  --user=ID        Required. Your PropertyPilot user ID (from the User table)');
    console.error('  --skip-download  Skip TenantCloud API download, use saved data from /data/');
    process.exit(1);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`Error: User ${userId} not found in PropertyPilot database.`);
    console.error('Sign in to the app first, then find your user ID in the database.');
    process.exit(1);
  }
  console.log(`\n🔑 Migrating data for: ${user.name || user.email}`);

  let data;

  if (skipDownload) {
    // Load previously downloaded data
    if (!fs.existsSync(path.join(DATA_DIR, 'properties.json'))) {
      console.error('Error: No saved data found. Run without --skip-download first.');
      process.exit(1);
    }
    data = loadFromDisk();
  } else {
    // Download fresh from TenantCloud
    const auth = new TenantCloudAuth();
    const loaded = await auth.loadToken();
    if (!loaded) {
      console.error('Error: No TenantCloud credentials. Run setup.ts first.');
      process.exit(1);
    }
    const api = new TenantCloudAPI(auth);
    data = await downloadAll(api);
  }

  // Check for existing data
  const existingCount = await prisma.property.count({ where: { userId } });
  if (existingCount > 0) {
    console.log(`\n⚠️  User already has ${existingCount} properties. Clearing existing data...`);
    // Delete in correct order (respecting foreign keys)
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.listing.deleteMany({ where: { userId } });
    await prisma.lease.deleteMany({ where: { userId } });
    await prisma.contact.deleteMany({ where: { userId } });
    // Units are cascade-deleted with properties
    await prisma.property.deleteMany({ where: { userId } });
    console.log('  ✓ Cleared');
  }

  // Import
  await importAll(userId, data);

  // Summary
  const counts = await Promise.all([
    prisma.property.count({ where: { userId } }),
    prisma.unit.count({ where: { property: { userId } } }),
    prisma.contact.count({ where: { userId } }),
    prisma.lease.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.listing.count({ where: { userId } }),
  ]);

  console.log('\n✅ Migration complete!\n');
  console.log('  Properties:   ', counts[0]);
  console.log('  Units:        ', counts[1]);
  console.log('  Contacts:     ', counts[2]);
  console.log('  Leases:       ', counts[3]);
  console.log('  Transactions: ', counts[4]);
  console.log('  Listings:     ', counts[5]);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\n❌ Migration failed:', err.message || err);
  await prisma.$disconnect();
  process.exit(1);
});
