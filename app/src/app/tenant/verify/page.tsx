"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") || "";
  const type = searchParams.get("type") || "email";
  const router = useRouter();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!identifier) {
      router.replace("/tenant");
    }
  }, [identifier, router]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || "";
      }
      setCode(newCode);
      const lastFilled = Math.min(digits.length - 1, 5);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/tenant/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      router.push("/tenant/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const maskedIdentifier = type === "email"
    ? identifier.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : identifier.replace(/(.{3})(.*)(.{2})/, "$1***$3");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Enter Code</h1>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-gray-700">{maskedIdentifier}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-4">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.join("").length !== 6}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <button
          onClick={() => router.push("/tenant")}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Use a different email or phone
        </button>
      </div>
    </div>
  );
}

export default function TenantVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
