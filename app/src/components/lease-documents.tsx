"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Signature = {
  id: string;
  status: string;
  signedAt: string | null;
  signingToken: string;
  contact: { firstName: string; lastName: string; email: string | null };
};

type Document = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  signatures: Signature[];
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  signed: "bg-green-100 text-green-700 hover:bg-green-100",
  declined: "bg-red-100 text-red-700 hover:bg-red-100",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LeaseDocuments({
  leaseId,
  contactId,
  contactName,
}: {
  leaseId: string;
  contactId: string;
  contactName: string;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch documents on mount
  useState(() => {
    fetch(`/api/documents?leaseId=${leaseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("leaseId", leaseId);

    const res = await fetch("/api/documents", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Upload failed");
    } else {
      // Refresh documents list
      const listRes = await fetch(`/api/documents?leaseId=${leaseId}`);
      const list = await listRes.json();
      if (Array.isArray(list)) setDocuments(list);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document and all signature requests?")) return;
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleRequestSignature(docId: string) {
    const res = await fetch(`/api/documents/${docId}/signatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });

    if (res.ok) {
      // Refresh documents
      const listRes = await fetch(`/api/documents?leaseId=${leaseId}`);
      const list = await listRes.json();
      if (Array.isArray(list)) setDocuments(list);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to request signature");
    }
  }

  function copySigningLink(token: string) {
    const url = `${window.location.origin}/sign?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-500">
          No documents uploaded yet. Upload a lease PDF to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const hasSigRequest = doc.signatures.some(
              (s) => s.contact.firstName
            );
            return (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-900 font-medium hover:text-indigo-600 truncate block"
                    >
                      {doc.name}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(doc.fileSize)} &middot;{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!hasSigRequest && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestSignature(doc.id)}
                      >
                        Request Signature
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Signature status */}
                {doc.signatures.length > 0 && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">
                      Signatures
                    </p>
                    {doc.signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">
                            {sig.contact.firstName} {sig.contact.lastName}
                          </span>
                          <Badge className={statusStyles[sig.status]}>
                            {sig.status}
                          </Badge>
                          {sig.signedAt && (
                            <span className="text-xs text-gray-500">
                              {new Date(sig.signedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {sig.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copySigningLink(sig.signingToken)}
                            className="text-xs"
                          >
                            {copied === sig.signingToken
                              ? "Copied!"
                              : "Copy Link"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
