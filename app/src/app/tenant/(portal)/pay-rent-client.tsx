"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LeaseInfo {
  id: string;
  rentAmount: number;
  rentDueDay: number;
  unitName: string;
  propertyName: string;
  address: string;
  tenantName: string;
  paymentToken: string | null;
}

interface TransactionInfo {
  id: string;
  amount: number;
  paid: number;
  balance: number;
  status: number;
  date: string;
  details: string | null;
  subcategory: string | null;
  leaseId: string | null;
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Unpaid", color: "bg-red-100 text-red-700" },
  1: { label: "Partial", color: "bg-yellow-100 text-yellow-700" },
  2: { label: "Paid", color: "bg-green-100 text-green-700" },
  3: { label: "Voided", color: "bg-gray-100 text-gray-500" },
  4: { label: "Waived", color: "bg-blue-100 text-blue-700" },
};

export default function PayRentClient({
  leases,
  transactions,
}: {
  leases: LeaseInfo[];
  transactions: TransactionInfo[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLease, setSelectedLease] = useState(leases[0]?.id || "");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setSuccessMsg("Payment submitted successfully! It may take a moment to process.");
      // Clean URL
      window.history.replaceState({}, "", "/tenant/portal");
    } else if (payment === "cancelled") {
      setError("Payment was cancelled.");
      window.history.replaceState({}, "", "/tenant/portal");
    }
  }, [searchParams]);

  const currentLease = leases.find((l) => l.id === selectedLease);
  const leaseTransactions = transactions.filter((t) => t.leaseId === selectedLease);
  const unpaidTransactions = leaseTransactions.filter((t) => t.status === 0 || t.status === 1);
  const totalOwed = unpaidTransactions.reduce((sum, t) => sum + t.balance, 0);

  async function handlePay(transactionId: string, amount: number) {
    setError("");
    setPayingId(transactionId);

    try {
      const res = await fetch("/api/tenant/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed");
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPayingId(null);
    }
  }

  if (leases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active leases found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lease selector */}
      {leases.length > 1 && (
        <select
          value={selectedLease}
          onChange={(e) => setSelectedLease(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {leases.map((l) => (
            <option key={l.id} value={l.id}>
              {l.propertyName} - {l.unitName}
            </option>
          ))}
        </select>
      )}

      {/* Current lease info */}
      {currentLease && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{currentLease.propertyName}</h2>
              <p className="text-sm text-gray-500">
                Unit {currentLease.unitName} &middot; {currentLease.address}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="text-xl font-bold">${currentLease.rentAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Due on the {ordinal(currentLease.rentDueDay)}</p>
            </div>
          </div>

          {totalOwed > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-800">Balance Due</p>
                  <p className="text-2xl font-bold text-red-700">${totalOwed.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => {
                    if (unpaidTransactions[0]) {
                      handlePay(unpaidTransactions[0].id, totalOwed);
                    }
                  }}
                  disabled={payingId !== null}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {payingId ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </div>
          )}

          {totalOwed === 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">All caught up! No balance due.</p>
            </div>
          )}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Payment History</h3>
        {leaseTransactions.length === 0 ? (
          <p className="text-sm text-gray-400">No charges yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {leaseTransactions.map((t) => {
              const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
              return (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t.details || t.subcategory || "Charge"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      ${t.amount.toFixed(2)}
                    </span>
                    {(t.status === 0 || t.status === 1) && t.balance > 0 && (
                      <button
                        onClick={() => handlePay(t.id, t.balance)}
                        disabled={payingId !== null}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded font-medium hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {payingId === t.id ? "..." : `Pay $${t.balance.toFixed(2)}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
