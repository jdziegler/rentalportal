"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";

function SigningPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [info, setInfo] = useState<{
    id: string;
    status: string;
    documentName: string;
    contactName: string;
    signedAt?: string;
    declinedAt?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No signing token provided");
      setLoading(false);
      return;
    }
    fetch(`/api/sign?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [token]);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    }

    function draw(e: MouseEvent | TouchEvent) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx!.beginPath();
      ctx!.moveTo(lastX, lastY);
      ctx!.lineTo(pos.x, pos.y);
      ctx!.stroke();
      lastX = pos.x;
      lastY = pos.y;
      setHasSignature(true);
    }

    function stop() {
      isDrawing = false;
    }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stop);
    };
  }, [info]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    setSubmitting(true);
    const signatureData = canvas.toDataURL("image/png");

    const res = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, signatureData, action: "sign" }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult("signed");
    } else {
      setError(data.error || "Failed to submit signature");
    }
    setSubmitting(false);
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline signing this document?"))
      return;

    setSubmitting(true);
    const res = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "decline" }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult("declined");
    } else {
      setError(data.error || "Failed to decline");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">
            {result === "signed" ? "\u2705" : "\u274c"}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {result === "signed"
              ? "Document Signed"
              : "Signature Declined"}
          </h1>
          <p className="text-gray-600">
            {result === "signed"
              ? "Your signature has been recorded. You may close this page."
              : "You have declined to sign this document. Your landlord will be notified."}
          </p>
        </div>
      </div>
    );
  }

  if (info?.status !== "pending") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Already {info?.status}
          </h1>
          <p className="text-gray-600">
            This document was {info?.status} on{" "}
            {info?.signedAt
              ? new Date(info.signedAt).toLocaleDateString()
              : info?.declinedAt
                ? new Date(info.declinedAt).toLocaleDateString()
                : "a previous date"}
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">PropertyPilot</h1>
          <p className="text-sm text-gray-500">E-Signature</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Sign Document
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {info.contactName}, you&apos;ve been asked to sign:{" "}
            <strong>{info.documentName}</strong>
          </p>

          {/* Document preview link */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <a
              href={`/api/sign/document?token=${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              View Document &rarr;
            </a>
            <p className="text-xs text-gray-500 mt-1">
              Review the document before signing.
            </p>
          </div>

          {/* Signature pad */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draw your signature below
            </label>
            <canvas
              ref={canvasRef}
              className="w-full h-40 border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
              style={{ touchAction: "none" }}
            />
            <button
              onClick={clearCanvas}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
              Clear
            </button>
          </div>

          {/* Legal text */}
          <p className="text-xs text-gray-500 mb-6">
            By clicking &quot;Sign Document&quot;, you agree that your electronic
            signature is the legal equivalent of your manual/handwritten
            signature and you consent to be legally bound by this document.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSign}
              disabled={!hasSignature || submitting}
              className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Submitting..." : "Sign Document"}
            </button>
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="px-4 py-2.5 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition"
            >
              Decline
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SigningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <SigningPageInner />
    </Suspense>
  );
}
