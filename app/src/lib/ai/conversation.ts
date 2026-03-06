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

## Web App Context

When a message includes [Context:], the user is viewing a page in PropertyPilot where details are already visible. In this case:
- Do NOT repeat everything visible on screen
- Answer the specific question directly and concisely
- Reference items by name without listing everything

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
): Promise<string> {
  const systemInstruction = portfolioContext
    ? `${SYSTEM_PROMPT}\n\n## Current Portfolio Data\n\n${portfolioContext}`
    : SYSTEM_PROMPT;

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
}

const RE_MUTATE_REGEX = /<!--RE_MUTATE\s*([\s\S]*?)\s*RE_MUTATE-->/;

export function parseResponse(response: string): ParsedResponse {
  const mutateMatch = RE_MUTATE_REGEX.exec(response);

  let reply = response;
  if (mutateMatch) reply = reply.replace(RE_MUTATE_REGEX, "");
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

  return { reply, mutations };
}
