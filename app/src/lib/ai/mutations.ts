import { prisma } from "@/lib/db";
import type { MutationOp } from "./conversation";

export interface MutationResult {
  op: string;
  status: "ok" | "not_found" | "error";
  detail?: string;
}

export async function executeMutations(
  userId: string,
  mutations: MutationOp[],
): Promise<MutationResult[]> {
  const results: MutationResult[] = [];

  for (const mut of mutations) {
    try {
      switch (mut.op) {
        case "update_maintenance_status": {
          const statusMap: Record<string, string> = {
            open: "OPEN",
            in_progress: "IN_PROGRESS",
            completed: "COMPLETED",
            cancelled: "CANCELLED",
          };
          const statusVal = statusMap[mut.status as string];
          if (statusVal === undefined) {
            results.push({
              op: mut.op,
              status: "error",
              detail: `Invalid status: ${mut.status}`,
            });
            break;
          }
          const mx = await prisma.maintenanceRequest.findFirst({
            where: { id: mut.id, userId },
          });
          if (!mx) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Maintenance request ${mut.id} not found`,
            });
            break;
          }
          await prisma.maintenanceRequest.update({
            where: { id: mut.id },
            data: {
              status: statusVal,
              ...(statusVal === "COMPLETED" ? { completedAt: new Date() } : {}),
            },
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        case "update_maintenance_priority": {
          const prioMap: Record<string, string> = {
            low: "LOW",
            medium: "MEDIUM",
            high: "HIGH",
            urgent: "URGENT",
          };
          const prioVal = prioMap[mut.priority as string];
          if (prioVal === undefined) {
            results.push({
              op: mut.op,
              status: "error",
              detail: `Invalid priority: ${mut.priority}`,
            });
            break;
          }
          const mx = await prisma.maintenanceRequest.findFirst({
            where: { id: mut.id, userId },
          });
          if (!mx) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Maintenance request ${mut.id} not found`,
            });
            break;
          }
          await prisma.maintenanceRequest.update({
            where: { id: mut.id },
            data: { priority: prioVal },
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        case "mark_transaction_paid": {
          const tx = await prisma.transaction.findFirst({
            where: { id: mut.id, userId },
            include: { payments: { select: { amount: true, type: true } } },
          });
          if (!tx) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Transaction ${mut.id} not found`,
            });
            break;
          }
          // Calculate remaining balance and create payment for it
          const totalPaid = tx.payments
            .filter((p) => p.type === "payment")
            .reduce((sum, p) => sum + Number(p.amount), 0);
          const remaining = Number(tx.amount) - totalPaid;
          if (remaining > 0) {
            await prisma.payment.create({
              data: {
                transactionId: mut.id as string,
                amount: remaining,
                date: new Date(),
                note: "Marked as paid via AI",
              },
            });
          }
          await prisma.transaction.update({
            where: { id: mut.id },
            data: {
              status: "PAID",
              paidAmount: tx.amount,
              balance: 0,
              paidAt: new Date(),
            },
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        case "add_transaction_note": {
          const tx = await prisma.transaction.findFirst({
            where: { id: mut.id, userId },
          });
          if (!tx) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Transaction ${mut.id} not found`,
            });
            break;
          }
          await prisma.transaction.update({
            where: { id: mut.id },
            data: { note: mut.note as string },
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        case "update_lease_status": {
          const statusMap: Record<string, string> = {
            active: "ACTIVE",
            expired: "EXPIRED",
            terminated: "TERMINATED",
          };
          const statusVal = statusMap[mut.status as string];
          if (statusVal === undefined) {
            results.push({
              op: mut.op,
              status: "error",
              detail: `Invalid status: ${mut.status}`,
            });
            break;
          }
          const lease = await prisma.lease.findFirst({
            where: { id: mut.id, userId },
          });
          if (!lease) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Lease ${mut.id} not found`,
            });
            break;
          }
          await prisma.lease.update({
            where: { id: mut.id },
            data: { leaseStatus: statusVal },
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        case "update_contact": {
          const contact = await prisma.contact.findFirst({
            where: { id: mut.id, userId },
          });
          if (!contact) {
            results.push({
              op: mut.op,
              status: "not_found",
              detail: `Contact ${mut.id} not found`,
            });
            break;
          }
          const data: Record<string, string> = {};
          if (mut.email) data.email = mut.email as string;
          if (mut.phone) data.phone = mut.phone as string;
          if (mut.notes) data.notes = mut.notes as string;
          await prisma.contact.update({
            where: { id: mut.id },
            data,
          });
          results.push({ op: mut.op, status: "ok" });
          break;
        }

        default:
          results.push({
            op: mut.op,
            status: "error",
            detail: `Unknown operation: ${mut.op}`,
          });
      }
    } catch (err) {
      results.push({
        op: mut.op,
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
