-- ============================================================
-- DATA MODEL MODERNIZATION MIGRATION
-- Integer status codes → Prisma enums
-- Field renames, new fields, indexes, cascade fixes
-- ============================================================

BEGIN;

-- ── 1. CREATE ENUM TYPES ──

CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "LeaseType" AS ENUM ('FIXED', 'MONTH_TO_MONTH');
CREATE TYPE "TransactionStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'PENDING', 'WAIVED', 'VOIDED');
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'INVITED', 'ACTIVE', 'INACTIVE');
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'MULTI_FAMILY', 'COMMERCIAL');
CREATE TYPE "UnitType" AS ENUM ('APARTMENT', 'HOUSE', 'ROOM');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RentPeriod" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- ── 2. PROPERTY: type Int → PropertyType ──

ALTER TABLE "Property" ADD COLUMN "type_new" "PropertyType" NOT NULL DEFAULT 'MULTI_FAMILY';
UPDATE "Property" SET "type_new" = CASE
  WHEN "type" = 1 THEN 'SINGLE_FAMILY'::"PropertyType"
  WHEN "type" = 2 THEN 'MULTI_FAMILY'::"PropertyType"
  WHEN "type" = 3 THEN 'COMMERCIAL'::"PropertyType"
  ELSE 'MULTI_FAMILY'::"PropertyType"
END;
ALTER TABLE "Property" DROP COLUMN "type";
ALTER TABLE "Property" RENAME COLUMN "type_new" TO "type";

-- Property: new fields
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "yearBuilt" INTEGER;

-- ── 3. UNIT: type Int → UnitType ──

ALTER TABLE "Unit" ADD COLUMN "type_new" "UnitType" NOT NULL DEFAULT 'APARTMENT';
UPDATE "Unit" SET "type_new" = CASE
  WHEN "type" = 1 THEN 'APARTMENT'::"UnitType"
  WHEN "type" = 2 THEN 'HOUSE'::"UnitType"
  WHEN "type" = 3 THEN 'ROOM'::"UnitType"
  ELSE 'APARTMENT'::"UnitType"
END;
ALTER TABLE "Unit" DROP COLUMN "type";
ALTER TABLE "Unit" RENAME COLUMN "type_new" TO "type";

-- ── 4. CONTACT: status Int → ContactStatus ──

ALTER TABLE "Contact" ADD COLUMN "status_new" "ContactStatus" NOT NULL DEFAULT 'PENDING';
UPDATE "Contact" SET "status_new" = CASE
  WHEN "status" = 0 THEN 'PENDING'::"ContactStatus"
  WHEN "status" = 1 THEN 'INVITED'::"ContactStatus"
  WHEN "status" = 2 THEN 'ACTIVE'::"ContactStatus"
  WHEN "status" = 3 THEN 'INACTIVE'::"ContactStatus"
  ELSE 'PENDING'::"ContactStatus"
END;
ALTER TABLE "Contact" DROP COLUMN "status";
ALTER TABLE "Contact" RENAME COLUMN "status_new" TO "status";

-- Contact: new fields
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "moveInDate" TIMESTAMP(3);

-- ── 5. LEASE: leaseType Int → LeaseType ──

ALTER TABLE "Lease" ADD COLUMN "leaseType_new" "LeaseType" NOT NULL DEFAULT 'FIXED';
UPDATE "Lease" SET "leaseType_new" = CASE
  WHEN "leaseType" = 1 THEN 'FIXED'::"LeaseType"
  WHEN "leaseType" = 2 THEN 'MONTH_TO_MONTH'::"LeaseType"
  ELSE 'FIXED'::"LeaseType"
END;
ALTER TABLE "Lease" DROP COLUMN "leaseType";
ALTER TABLE "Lease" RENAME COLUMN "leaseType_new" TO "leaseType";

-- LEASE: leaseStatus Int → LeaseStatus

ALTER TABLE "Lease" ADD COLUMN "leaseStatus_new" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "Lease" SET "leaseStatus_new" = CASE
  WHEN "leaseStatus" = 0 THEN 'ACTIVE'::"LeaseStatus"
  WHEN "leaseStatus" = 1 THEN 'EXPIRED'::"LeaseStatus"
  WHEN "leaseStatus" = 2 THEN 'TERMINATED'::"LeaseStatus"
  ELSE 'ACTIVE'::"LeaseStatus"
END;
ALTER TABLE "Lease" DROP COLUMN "leaseStatus";
ALTER TABLE "Lease" RENAME COLUMN "leaseStatus_new" TO "leaseStatus";

-- LEASE: rentPeriod Int → RentPeriod

ALTER TABLE "Lease" ADD COLUMN "rentPeriod_new" "RentPeriod" NOT NULL DEFAULT 'MONTHLY';
UPDATE "Lease" SET "rentPeriod_new" = CASE
  WHEN "rentPeriod" = 1 THEN 'WEEKLY'::"RentPeriod"
  WHEN "rentPeriod" = 2 THEN 'BIWEEKLY'::"RentPeriod"
  WHEN "rentPeriod" = 5 THEN 'MONTHLY'::"RentPeriod"
  WHEN "rentPeriod" = 6 THEN 'QUARTERLY'::"RentPeriod"
  WHEN "rentPeriod" = 7 THEN 'YEARLY'::"RentPeriod"
  ELSE 'MONTHLY'::"RentPeriod"
END;
ALTER TABLE "Lease" DROP COLUMN "rentPeriod";
ALTER TABLE "Lease" RENAME COLUMN "rentPeriod_new" TO "rentPeriod";

-- LEASE: rename fields
ALTER TABLE "Lease" RENAME COLUMN "rentFrom" TO "startDate";
ALTER TABLE "Lease" RENAME COLUMN "rentTo" TO "endDate";

-- LEASE: new fields
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "moveOutDate" TIMESTAMP(3);
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "previousLeaseId" TEXT;
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- LEASE: fix cascade (Contact → Lease: Cascade → Restrict)
ALTER TABLE "Lease" DROP CONSTRAINT IF EXISTS "Lease_contactId_fkey";
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LEASE: clean up orphaned propertyId before adding FK
UPDATE "Lease" SET "propertyId" = NULL
  WHERE "propertyId" IS NOT NULL
  AND "propertyId" NOT IN (SELECT "id" FROM "Property");

-- ── 6. TRANSACTION: status Int → TransactionStatus ──

ALTER TABLE "Transaction" ADD COLUMN "status_new" "TransactionStatus" NOT NULL DEFAULT 'UNPAID';
UPDATE "Transaction" SET "status_new" = CASE
  WHEN "status" = 0 THEN 'UNPAID'::"TransactionStatus"
  WHEN "status" = 1 THEN 'PAID'::"TransactionStatus"
  WHEN "status" = 2 THEN 'PARTIAL'::"TransactionStatus"
  WHEN "status" = 3 THEN 'PENDING'::"TransactionStatus"
  WHEN "status" = 4 THEN 'WAIVED'::"TransactionStatus"
  WHEN "status" = 9 THEN 'VOIDED'::"TransactionStatus"
  ELSE 'UNPAID'::"TransactionStatus"
END;
ALTER TABLE "Transaction" DROP COLUMN "status";
ALTER TABLE "Transaction" RENAME COLUMN "status_new" TO "status";

-- TRANSACTION: rename paid → paidAmount
ALTER TABLE "Transaction" RENAME COLUMN "paid" TO "paidAmount";

-- TRANSACTION: new fields
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;

-- ── 7. MAINTENANCE: priority/status → enums ──

ALTER TABLE "MaintenanceRequest" ADD COLUMN "priority_new" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM';
UPDATE "MaintenanceRequest" SET "priority_new" = CASE
  WHEN "priority" = 0 THEN 'LOW'::"MaintenancePriority"
  WHEN "priority" = 1 THEN 'MEDIUM'::"MaintenancePriority"
  WHEN "priority" = 2 THEN 'HIGH'::"MaintenancePriority"
  WHEN "priority" = 3 THEN 'URGENT'::"MaintenancePriority"
  ELSE 'MEDIUM'::"MaintenancePriority"
END;
ALTER TABLE "MaintenanceRequest" DROP COLUMN "priority";
ALTER TABLE "MaintenanceRequest" RENAME COLUMN "priority_new" TO "priority";

ALTER TABLE "MaintenanceRequest" ADD COLUMN "status_new" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN';
UPDATE "MaintenanceRequest" SET "status_new" = CASE
  WHEN "status" = 0 THEN 'OPEN'::"MaintenanceStatus"
  WHEN "status" = 1 THEN 'IN_PROGRESS'::"MaintenanceStatus"
  WHEN "status" = 2 THEN 'COMPLETED'::"MaintenanceStatus"
  WHEN "status" = 3 THEN 'CANCELLED'::"MaintenanceStatus"
  ELSE 'OPEN'::"MaintenanceStatus"
END;
ALTER TABLE "MaintenanceRequest" DROP COLUMN "status";
ALTER TABLE "MaintenanceRequest" RENAME COLUMN "status_new" TO "status";

-- ── 8. INDEXES ──

CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_userId_status_idx" ON "Transaction"("userId", "status");
CREATE INDEX IF NOT EXISTS "Transaction_leaseId_idx" ON "Transaction"("leaseId");
CREATE INDEX IF NOT EXISTS "Transaction_contactId_idx" ON "Transaction"("contactId");
CREATE INDEX IF NOT EXISTS "Transaction_propertyId_idx" ON "Transaction"("propertyId");

CREATE INDEX IF NOT EXISTS "Lease_userId_leaseStatus_idx" ON "Lease"("userId", "leaseStatus");
CREATE INDEX IF NOT EXISTS "Lease_unitId_leaseStatus_idx" ON "Lease"("unitId", "leaseStatus");
CREATE INDEX IF NOT EXISTS "Lease_contactId_idx" ON "Lease"("contactId");

CREATE INDEX IF NOT EXISTS "Unit_propertyId_idx" ON "Unit"("propertyId");
CREATE INDEX IF NOT EXISTS "Contact_userId_status_idx" ON "Contact"("userId", "status");
CREATE INDEX IF NOT EXISTS "Property_userId_idx" ON "Property"("userId");

CREATE INDEX IF NOT EXISTS "Message_contactId_idx" ON "Message"("contactId");
CREATE INDEX IF NOT EXISTS "Message_leaseId_idx" ON "Message"("leaseId");

-- ── 9. LEASE: previousLeaseId self-referential FK ──

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lease_previousLeaseId_fkey') THEN
    ALTER TABLE "Lease" ADD CONSTRAINT "Lease_previousLeaseId_fkey"
      FOREIGN KEY ("previousLeaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 10. LEASE: Property relation FK (propertyId exists but no FK constraint) ──

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lease_propertyId_fkey') THEN
    ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
