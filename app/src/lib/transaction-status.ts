export const TRANSACTION_STATUS = {
  UNPAID: 0,
  PARTIAL: 1,
  PAID: 2,
  PENDING: 3,
  WAIVED: 4,
  VOIDED: 5,
} as const;

export const statusLabels: Record<number, string> = {
  0: "Unpaid",
  1: "Partial",
  2: "Paid",
  3: "Pending",
  4: "Waived",
  5: "Voided",
};

export const statusStyles: Record<number, string> = {
  0: "bg-red-100 text-red-700 hover:bg-red-100",
  1: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  2: "bg-green-100 text-green-700 hover:bg-green-100",
  3: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  4: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  5: "bg-gray-100 text-gray-500 hover:bg-gray-100 line-through",
};

// Statuses that count toward "active" totals (not voided/waived)
export const ACTIVE_STATUSES = [0, 1, 2, 3];
