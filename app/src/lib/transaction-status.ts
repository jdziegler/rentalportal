// Matches Prisma TransactionStatus enum
export const TRANSACTION_STATUS = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  PENDING: "PENDING",
  WAIVED: "WAIVED",
  VOIDED: "VOIDED",
} as const;

export const statusLabels: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Pending",
  WAIVED: "Waived",
  VOIDED: "Voided",
};

export const statusStyles: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700 hover:bg-red-100",
  PAID: "bg-green-100 text-green-700 hover:bg-green-100",
  PARTIAL: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  PENDING: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  WAIVED: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  VOIDED: "bg-gray-100 text-gray-500 hover:bg-gray-100 line-through",
};

// Statuses that count toward "active" totals (not voided/waived)
export const ACTIVE_STATUSES = ["UNPAID", "PAID", "PARTIAL", "PENDING"];
