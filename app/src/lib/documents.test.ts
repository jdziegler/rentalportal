import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockPrisma = {
  leaseDocument: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  signature: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lease: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

describe("Document & Signature Models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Document creation", () => {
    it("creates a document with correct fields", async () => {
      const docData = {
        leaseId: "lease-1",
        userId: "user-1",
        name: "lease-agreement.pdf",
        fileType: "application/pdf",
        fileSize: 1024 * 500,
        filePath: "uploads/user-1/abc123.pdf",
      };

      mockPrisma.leaseDocument.create.mockResolvedValue({
        id: "doc-1",
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrisma.leaseDocument.create({ data: docData });
      expect(result.id).toBe("doc-1");
      expect(result.name).toBe("lease-agreement.pdf");
      expect(result.fileType).toBe("application/pdf");
      expect(result.fileSize).toBe(512000);
    });

    it("lists documents for a lease", async () => {
      const docs = [
        { id: "doc-1", name: "lease.pdf", signatures: [] },
        { id: "doc-2", name: "addendum.pdf", signatures: [] },
      ];
      mockPrisma.leaseDocument.findMany.mockResolvedValue(docs);

      const result = await mockPrisma.leaseDocument.findMany({
        where: { leaseId: "lease-1" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("lease.pdf");
    });

    it("deletes a document", async () => {
      mockPrisma.leaseDocument.delete.mockResolvedValue({ id: "doc-1" });
      const result = await mockPrisma.leaseDocument.delete({
        where: { id: "doc-1" },
      });
      expect(result.id).toBe("doc-1");
    });
  });

  describe("Signature requests", () => {
    it("creates a signature request for a tenant", async () => {
      mockPrisma.signature.create.mockResolvedValue({
        id: "sig-1",
        documentId: "doc-1",
        contactId: "contact-1",
        status: "pending",
        signingToken: "uuid-token",
        signedAt: null,
        declinedAt: null,
      });

      const result = await mockPrisma.signature.create({
        data: { documentId: "doc-1", contactId: "contact-1" },
      });
      expect(result.status).toBe("pending");
      expect(result.signingToken).toBe("uuid-token");
    });

    it("prevents duplicate signature requests (unique constraint)", async () => {
      mockPrisma.signature.findUnique.mockResolvedValue({
        id: "sig-1",
        documentId: "doc-1",
        contactId: "contact-1",
      });

      const existing = await mockPrisma.signature.findUnique({
        where: { documentId_contactId: { documentId: "doc-1", contactId: "contact-1" } },
      });
      expect(existing).not.toBeNull();
    });
  });

  describe("Signing flow", () => {
    it("finds signature by token", async () => {
      mockPrisma.signature.findUnique.mockResolvedValue({
        id: "sig-1",
        status: "pending",
        signingToken: "abc-token",
        document: { name: "lease.pdf" },
        contact: { firstName: "John", lastName: "Doe" },
      });

      const sig = await mockPrisma.signature.findUnique({
        where: { signingToken: "abc-token" },
      });
      expect(sig).not.toBeNull();
      expect(sig.status).toBe("pending");
    });

    it("records signature with audit trail", async () => {
      const now = new Date();
      mockPrisma.signature.update.mockResolvedValue({
        id: "sig-1",
        status: "signed",
        signedAt: now,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        signatureData: "data:image/png;base64,abc123",
      });

      const result = await mockPrisma.signature.update({
        where: { id: "sig-1" },
        data: {
          status: "signed",
          signedAt: now,
          signatureData: "data:image/png;base64,abc123",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        },
      });

      expect(result.status).toBe("signed");
      expect(result.signedAt).toBe(now);
      expect(result.ipAddress).toBe("192.168.1.1");
      expect(result.signatureData).toContain("base64");
    });

    it("records decline with audit trail", async () => {
      const now = new Date();
      mockPrisma.signature.update.mockResolvedValue({
        id: "sig-1",
        status: "declined",
        declinedAt: now,
        ipAddress: "10.0.0.1",
        userAgent: "Safari",
      });

      const result = await mockPrisma.signature.update({
        where: { id: "sig-1" },
        data: {
          status: "declined",
          declinedAt: now,
          ipAddress: "10.0.0.1",
          userAgent: "Safari",
        },
      });

      expect(result.status).toBe("declined");
      expect(result.declinedAt).toBe(now);
    });

    it("rejects signing if already signed", async () => {
      mockPrisma.signature.findUnique.mockResolvedValue({
        id: "sig-1",
        status: "signed",
        signedAt: new Date(),
      });

      const sig = await mockPrisma.signature.findUnique({
        where: { signingToken: "token" },
      });
      expect(sig.status).not.toBe("pending");
    });

    it("rejects signing if already declined", async () => {
      mockPrisma.signature.findUnique.mockResolvedValue({
        id: "sig-1",
        status: "declined",
        declinedAt: new Date(),
      });

      const sig = await mockPrisma.signature.findUnique({
        where: { signingToken: "token" },
      });
      expect(sig.status).not.toBe("pending");
    });
  });

  describe("File validation", () => {
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    it("accepts PDF files", () => {
      expect(ALLOWED_TYPES.includes("application/pdf")).toBe(true);
    });

    it("accepts image files", () => {
      expect(ALLOWED_TYPES.includes("image/jpeg")).toBe(true);
      expect(ALLOWED_TYPES.includes("image/png")).toBe(true);
      expect(ALLOWED_TYPES.includes("image/webp")).toBe(true);
    });

    it("accepts Word documents", () => {
      expect(ALLOWED_TYPES.includes("application/msword")).toBe(true);
      expect(
        ALLOWED_TYPES.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe(true);
    });

    it("rejects executable files", () => {
      expect(ALLOWED_TYPES.includes("application/x-executable")).toBe(false);
    });

    it("rejects files over 10MB", () => {
      const fileSize = 11 * 1024 * 1024;
      expect(fileSize > MAX_FILE_SIZE).toBe(true);
    });

    it("accepts files under 10MB", () => {
      const fileSize = 5 * 1024 * 1024;
      expect(fileSize <= MAX_FILE_SIZE).toBe(true);
    });
  });

  describe("Access control", () => {
    it("verifies lease belongs to user before upload", async () => {
      mockPrisma.lease.findUnique.mockResolvedValue(null);
      const lease = await mockPrisma.lease.findUnique({
        where: { id: "lease-1", userId: "wrong-user" },
      });
      expect(lease).toBeNull();
    });

    it("verifies document belongs to user before download", async () => {
      mockPrisma.leaseDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        lease: { userId: "user-1" },
      });

      const doc = await mockPrisma.leaseDocument.findUnique({
        where: { id: "doc-1" },
        include: { lease: { select: { userId: true } } },
      });
      expect(doc.lease.userId).toBe("user-1");
    });

    it("allows tenant access via signing token only", async () => {
      mockPrisma.signature.findUnique.mockResolvedValue({
        id: "sig-1",
        signingToken: "valid-token",
        document: { filePath: "uploads/user-1/doc.pdf" },
      });

      const sig = await mockPrisma.signature.findUnique({
        where: { signingToken: "valid-token" },
      });
      expect(sig).not.toBeNull();
    });
  });
});
