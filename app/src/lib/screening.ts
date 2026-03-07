import { prisma } from "@/lib/db";

// ── Adapter Interface ──

export type ReportType = "credit" | "criminal" | "eviction";

export type ScreeningResult = {
  type: ReportType;
  status: "clear" | "review" | "alert";
  score?: number;
  summary: string;
  details?: Record<string, unknown>;
};

export interface ScreeningProvider {
  name: string;
  runScreening(contact: {
    firstName: string;
    lastName: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }): Promise<ScreeningResult[]>;
}

// ── Mock Provider (for development/demo) ──

export class MockScreeningProvider implements ScreeningProvider {
  name = "mock";

  async runScreening(contact: {
    firstName: string;
    lastName: string;
  }): Promise<ScreeningResult[]> {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 500));

    // Deterministic "random" based on name length
    const seed = (contact.firstName.length + contact.lastName.length) % 10;
    const creditScore = 580 + seed * 30; // 580-850 range

    return [
      {
        type: "credit",
        status: creditScore >= 700 ? "clear" : creditScore >= 600 ? "review" : "alert",
        score: creditScore,
        summary: `Credit score: ${creditScore}. ${creditScore >= 700 ? "Good credit history" : creditScore >= 600 ? "Fair credit, some late payments" : "Poor credit, multiple delinquencies"}.`,
        details: {
          score: creditScore,
          openAccounts: 3 + seed,
          latePayments: seed > 5 ? seed - 5 : 0,
          collections: seed > 7 ? 1 : 0,
          bankruptcies: 0,
        },
      },
      {
        type: "criminal",
        status: seed > 8 ? "alert" : "clear",
        summary: seed > 8
          ? "1 misdemeanor found (non-violent)."
          : "No criminal records found.",
        details: {
          felonies: 0,
          misdemeanors: seed > 8 ? 1 : 0,
          sexOffenderRegistry: false,
        },
      },
      {
        type: "eviction",
        status: seed > 7 ? "review" : "clear",
        summary: seed > 7
          ? "1 prior eviction filing found (dismissed)."
          : "No eviction history found.",
        details: {
          evictions: seed > 7 ? 1 : 0,
          judgments: 0,
        },
      },
    ];
  }
}

// ── Provider Registry ──

const providers: Record<string, ScreeningProvider> = {
  mock: new MockScreeningProvider(),
};

export function getProvider(name: string): ScreeningProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown screening provider: ${name}`);
  return provider;
}

// ── Service Functions ──

export async function createScreeningRequest(
  userId: string,
  contactId: string,
  provider: string = "mock"
) {
  // Check for existing pending/processing request
  const existing = await prisma.screeningRequest.findFirst({
    where: {
      userId,
      contactId,
      status: { in: ["pending", "consent_sent", "processing"] },
    },
  });
  if (existing) {
    throw new Error("A screening request is already in progress for this tenant");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day consent window

  return prisma.screeningRequest.create({
    data: {
      userId,
      contactId,
      provider,
      status: "consent_sent",
      expiresAt,
    },
  });
}

export async function processConsent(consentToken: string) {
  const request = await prisma.screeningRequest.findUnique({
    where: { consentToken },
    include: { contact: true },
  });

  if (!request) throw new Error("Invalid consent token");
  if (request.status !== "consent_sent") {
    throw new Error(`Request is already ${request.status}`);
  }
  if (request.expiresAt && request.expiresAt < new Date()) {
    await prisma.screeningRequest.update({
      where: { id: request.id },
      data: { status: "expired" },
    });
    throw new Error("Consent link has expired");
  }

  // Mark as consented and start processing
  await prisma.screeningRequest.update({
    where: { id: request.id },
    data: { consentedAt: new Date(), status: "processing" },
  });

  // Run screening
  try {
    const provider = getProvider(request.provider);
    const results = await provider.runScreening(request.contact);

    // Save reports
    await prisma.screeningReport.createMany({
      data: results.map((r) => ({
        requestId: request.id,
        type: r.type,
        status: r.status,
        score: r.score || null,
        summary: r.summary,
        details: r.details as any,
      })),
    });

    await prisma.screeningRequest.update({
      where: { id: request.id },
      data: { status: "completed", completedAt: new Date() },
    });

    return { status: "completed" };
  } catch (err: any) {
    await prisma.screeningRequest.update({
      where: { id: request.id },
      data: { status: "failed", error: err.message },
    });
    throw err;
  }
}
