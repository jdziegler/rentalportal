/**
 * Generic CSV export utilities.
 */

export function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    row.map((cell) => {
      if (typeof cell === "number") return cell.toString();
      return csvEscape(String(cell ?? ""));
    }).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Format a date to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format a number as currency string (no $ sign for CSV).
 */
export function formatCurrency(amount: number, signed = false): string {
  if (signed && amount < 0) {
    return `-${Math.abs(amount).toFixed(2)}`;
  }
  return amount.toFixed(2);
}
