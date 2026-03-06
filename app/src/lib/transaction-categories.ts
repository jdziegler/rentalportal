export const subcategories = {
  // Income subcategories
  rent: { label: "Rent", color: "bg-blue-100 text-blue-700", category: "income" },
  late_fee: { label: "Late Fee", color: "bg-red-100 text-red-700", category: "income" },
  deposit: { label: "Deposit", color: "bg-purple-100 text-purple-700", category: "income" },
  application_fee: { label: "Application Fee", color: "bg-indigo-100 text-indigo-700", category: "income" },
  parking: { label: "Parking", color: "bg-cyan-100 text-cyan-700", category: "income" },
  other_income: { label: "Other Income", color: "bg-gray-100 text-gray-700", category: "income" },
  // Expense subcategories
  repair: { label: "Repair", color: "bg-orange-100 text-orange-700", category: "expense" },
  maintenance: { label: "Maintenance", color: "bg-yellow-100 text-yellow-700", category: "expense" },
  utility: { label: "Utility", color: "bg-teal-100 text-teal-700", category: "expense" },
  insurance: { label: "Insurance", color: "bg-pink-100 text-pink-700", category: "expense" },
  management: { label: "Management", color: "bg-violet-100 text-violet-700", category: "expense" },
  tax: { label: "Tax", color: "bg-rose-100 text-rose-700", category: "expense" },
  mortgage: { label: "Mortgage", color: "bg-amber-100 text-amber-700", category: "expense" },
  other_expense: { label: "Other Expense", color: "bg-gray-100 text-gray-700", category: "expense" },
} as const;

export type SubcategoryKey = keyof typeof subcategories;

export function getSubcategoryLabel(key: string | null | undefined): string {
  if (!key) return "";
  return (subcategories as Record<string, { label: string }>)[key]?.label || key;
}

export function getSubcategoryColor(key: string | null | undefined): string {
  if (!key) return "";
  return (subcategories as Record<string, { color: string }>)[key]?.color || "bg-gray-100 text-gray-700";
}

export function getIncomeSubcategories() {
  return Object.entries(subcategories).filter(([, v]) => v.category === "income");
}

export function getExpenseSubcategories() {
  return Object.entries(subcategories).filter(([, v]) => v.category === "expense");
}
