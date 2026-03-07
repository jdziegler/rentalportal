"use client";

import Link from "next/link";

type SignatureItem = {
  id: string;
  status: string;
  signingToken: string;
  signedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  document: {
    name: string;
    fileSize: number;
    propertyName: string;
    unitName: string;
  };
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  signed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

export default function TenantDocumentsClient({
  signatures,
}: {
  signatures: SignatureItem[];
}) {
  const pending = signatures.filter((s) => s.status === "pending");
  const completed = signatures.filter((s) => s.status !== "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>

      {signatures.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No documents require your attention.</p>
        </div>
      ) : (
        <>
          {/* Pending signatures */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Awaiting Your Signature ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((sig) => (
                  <div
                    key={sig.id}
                    className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {sig.document.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {sig.document.propertyName} - {sig.document.unitName}{" "}
                          &middot; {formatFileSize(sig.document.fileSize)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Requested{" "}
                          {new Date(sig.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/sign?token=${sig.signingToken}`}
                        className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                      >
                        Review & Sign
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Completed
              </h2>
              <div className="space-y-3">
                {completed.map((sig) => (
                  <div key={sig.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {sig.document.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {sig.document.propertyName} - {sig.document.unitName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[sig.status]}`}
                        >
                          {sig.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {sig.signedAt
                            ? new Date(sig.signedAt).toLocaleDateString()
                            : sig.declinedAt
                              ? new Date(sig.declinedAt).toLocaleDateString()
                              : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
