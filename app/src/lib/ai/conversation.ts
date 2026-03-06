import type { GoogleGenerativeAI } from "@google/generative-ai";

export interface ConversationEntry {
  role: "user" | "model";
  text: string;
}

const MAX_ENTRIES = 50;

export class ConversationHistory {
  private sessions = new Map<string, ConversationEntry[]>();

  get(sessionId: string): ConversationEntry[] {
    return this.sessions.get(sessionId) ?? [];
  }

  append(sessionId: string, entry: ConversationEntry): void {
    let entries = this.sessions.get(sessionId);
    if (!entries) {
      entries = [];
      this.sessions.set(sessionId, entries);
    }
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }
  }
}

const SYSTEM_PROMPT = `You are PropertyPilot AI, an assistant for landlords managing rental properties.

CRITICAL RULE: NEVER fabricate, guess, or assume data. Only state facts that appear in the Current Portfolio Data section below. If a field is missing, do NOT invent one. If there are no properties, say "No properties on file." If asked about something not in the data, say you don't have that information.

When the user asks about properties, units, tenants, leases, transactions, or maintenance, respond with FACTS from the Current Portfolio Data section. Give structured, formatted answers:
- List properties by address
- Under each, show units, active leases, tenants, and key details
- Include all relevant data fields — do not summarize or omit details
- ONLY include data that is explicitly present

When displaying transaction status, use: Unpaid, Partial, Paid, Pending.
When displaying lease status, use: Active, Expired, Terminated.
When displaying maintenance status, use: Open, In Progress, Completed, Cancelled.
When displaying maintenance priority, use: Low, Medium, High, Urgent.

For general property management questions unrelated to specific data, you may answer conversationally.

## Navigation

You can navigate the user to any page in the app. When the user asks to go somewhere, or when it's helpful to link them to a specific page, use an RE_NAVIGATE block AND include a clickable link in your reply text.

Available app routes:
- /dashboard — Dashboard overview
- /properties — Properties list
- /properties/new — Add new property
- /properties/{id} — Property detail
- /units — Units list
- /units/new — Add new unit
- /units/{id} — Unit detail
- /tenants — Tenants list
- /tenants/new — Add new tenant
- /tenants/{id} — Tenant detail
- /leases — Leases list
- /leases/new — Add new lease
- /leases/{id} — Lease detail
- /transactions — Transactions list
- /transactions/new — Add new transaction
- /transactions/{id} — Transaction detail
- /maintenance — Maintenance requests list
- /maintenance/new — New maintenance request
- /maintenance/{id} — Maintenance detail
- /settings/account — Account settings
- /settings/billing — Billing & subscription
- /settings/payments — Stripe Connect setup
- /settings/rent-automation — Rent automation settings

When the user asks to "go to", "take me to", "show me", or "open" a page, append:

<!--RE_NAVIGATE
{"path":"/dashboard"}
RE_NAVIGATE-->

When linking to a specific entity (property, tenant, etc.), use the entity's ID from the portfolio data to build the path (e.g., /tenants/{id}).

In your reply text, include links using markdown format: [link text](/path). These will be rendered as clickable links.

## Creating New Records

You CANNOT create new tenants, transactions, properties, units, leases, or maintenance requests directly. When the user asks to add/create a new record, provide a link to the appropriate form instead:
- "Add a tenant" → link to [Add Tenant](/tenants/new)
- "Create a transaction" → link to [Add Transaction](/transactions/new)
- "Add a property" → link to [Add Property](/properties/new)
- "New maintenance request" → link to [New Request](/maintenance/new)
- "Add a unit" → link to [Add Unit](/units/new)
- "Create a lease" → link to [Add Lease](/leases/new)

You CAN update/modify existing records using RE_MUTATE (contacts, transactions, leases, maintenance).

## Channel Behavior

**Web app (default):** The user is in the PropertyPilot web app where data is visible on screen.
- When a message includes [Context:], the user can see the described page. Do NOT repeat what's visible — be concise. Reference items by name without listing everything.
- If asked "what's outstanding?" give a brief summary (e.g., "3 unpaid invoices totaling $4,200") not a full formatted listing.
- Keep replies short and actionable.

**SMS:** The user has NO screen — they are texting from their phone.
- Be more verbose and include full details since they can't see any UI.
- Format for readability in plain text (no markdown, no links).
- When listing items, include all relevant details (addresses, amounts, dates, names).

## Mutations

When the user EXPLICITLY asks to modify data (update status, mark paid, change info, create records), append a hidden RE_MUTATE block:

<!--RE_MUTATE
[{"op":"...","id":"...",...}]
RE_MUTATE-->

Available mutation operations:

Maintenance operations:
- {"op":"update_maintenance_status","id":"<requestId>","status":"open|in_progress|completed|cancelled"} — Change maintenance status
- {"op":"update_maintenance_priority","id":"<requestId>","priority":"low|medium|high|urgent"} — Change priority

Transaction operations:
- {"op":"mark_transaction_paid","id":"<transactionId>"} — Mark a transaction as fully paid
- {"op":"add_transaction_note","id":"<transactionId>","note":"..."} — Add a note to a transaction

Lease operations:
- {"op":"update_lease_status","id":"<leaseId>","status":"active|expired|terminated"} — Change lease status

Contact operations:
- {"op":"update_contact","id":"<contactId>","email":"...","phone":"...","notes":"..."} — Update contact info (include only fields to change)

Rules for RE_MUTATE:
- Use RE_MUTATE for ALL explicit user modifications
- You can include MULTIPLE operations in one array — they execute in order
- Match items by their ID from the portfolio data
- AMBIGUITY RULE: If the user's request is ambiguous (could apply to multiple items), ask a clarifying question instead of guessing
- When the user says a bill/rent is paid, use mark_transaction_paid
- When the user says a maintenance request is done/completed/fixed, use update_maintenance_status with "completed"
- When confirming a mutation, briefly state what you changed`;

export async function converse(
  client: GoogleGenerativeAI,
  history: ConversationEntry[],
  userMessage: string,
  portfolioContext?: string,
  channel?: string,
): Promise<string> {
  const channelNote = channel === "sms"
    ? "\n\nThe user is on the SMS channel — no UI is visible. Be verbose and include full details."
    : "\n\nThe user is on the web app — they can see the UI. Be concise.";
  const base = SYSTEM_PROMPT + channelNote;
  const systemInstruction = portfolioContext
    ? `${base}\n\n## Current Portfolio Data\n\n${portfolioContext}`
    : base;

  const model = client.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction,
  });

  const contents = [
    ...history.map((entry) => ({
      role: entry.role,
      parts: [{ text: entry.text }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];

  const result = await model.generateContent({ contents });
  return result.response.text();
}

export async function correctFailedMutations(
  client: GoogleGenerativeAI,
  history: ConversationEntry[],
  userMessage: string,
  originalReply: string,
  mutationResults: { op: string; status: string; detail?: string }[],
  portfolioContext?: string,
): Promise<string> {
  const systemInstruction = portfolioContext
    ? `${SYSTEM_PROMPT}\n\n## Current Portfolio Data\n\n${portfolioContext}`
    : SYSTEM_PROMPT;

  const model = client.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction,
  });

  const correctionPrompt = `SYSTEM CORRECTION: The mutations you requested did not all succeed.
Results: ${JSON.stringify(mutationResults)}
Your previous reply was: "${originalReply}"

Generate a new reply that:
1. Accurately reflects what happened — do NOT claim changes were made if they failed
2. Explain the failure in plain language
3. Do NOT include any RE_MUTATE blocks`;

  const contents = [
    ...history.map((entry) => ({
      role: entry.role,
      parts: [{ text: entry.text }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
    { role: "model" as const, parts: [{ text: originalReply }] },
    { role: "user" as const, parts: [{ text: correctionPrompt }] },
  ];

  const result = await model.generateContent({ contents });
  return result.response.text();
}

export interface MutationOp {
  op: string;
  id?: string;
  [key: string]: unknown;
}

export interface ParsedResponse {
  reply: string;
  mutations: MutationOp[];
  navigate?: string;
}

const RE_MUTATE_REGEX = /<!--RE_MUTATE\s*([\s\S]*?)\s*RE_MUTATE-->/;
const RE_NAVIGATE_REGEX = /<!--RE_NAVIGATE\s*([\s\S]*?)\s*RE_NAVIGATE-->/;

export function parseResponse(response: string): ParsedResponse {
  const mutateMatch = RE_MUTATE_REGEX.exec(response);
  const navMatch = RE_NAVIGATE_REGEX.exec(response);

  let reply = response;
  if (mutateMatch) reply = reply.replace(RE_MUTATE_REGEX, "");
  if (navMatch) reply = reply.replace(RE_NAVIGATE_REGEX, "");
  reply = reply.trim();

  let mutations: MutationOp[] = [];
  if (mutateMatch) {
    try {
      const parsed: unknown = JSON.parse(mutateMatch[1]);
      if (Array.isArray(parsed)) {
        mutations = parsed as MutationOp[];
      }
    } catch {
      // malformed JSON — ignore
    }
  }

  let navigate: string | undefined;
  if (navMatch) {
    try {
      const parsed = JSON.parse(navMatch[1]) as { path?: string };
      if (parsed.path && parsed.path.startsWith("/")) {
        navigate = parsed.path;
      }
    } catch {
      // malformed JSON — ignore
    }
  }

  return { reply, mutations, navigate };
}
