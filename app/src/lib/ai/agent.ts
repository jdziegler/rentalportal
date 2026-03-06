import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ConversationHistory,
  converse,
  correctFailedMutations,
  parseResponse,
} from "./conversation";
import { loadPortfolioContext } from "./context";
import { executeMutations } from "./mutations";

const conversationHistory = new ConversationHistory();

let clientInstance: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!clientInstance) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
    clientInstance = new GoogleGenerativeAI(apiKey);
  }
  return clientInstance;
}

export interface ChatResult {
  reply: string;
  mutated: boolean;
  navigate?: string;
}

/**
 * Main chat handler — works for web chatbox, SMS, or any future channel.
 *
 * @param channel - "web" (user has UI context, be concise) or "sms" (no UI, be verbose)
 * @param pageContext - What the user is currently viewing (web only)
 */
export async function handleChat(
  userId: string,
  sessionId: string,
  message: string,
  channel: string = "web",
  pageContext?: string,
): Promise<ChatResult> {
  const client = getClient();

  let portfolioContext: string | undefined;
  try {
    portfolioContext = await loadPortfolioContext(userId);
  } catch (err) {
    console.error("[ai] Failed to load portfolio context:", err);
  }

  // For web channel with page context, prefix the message so the LLM knows
  // what's already visible on screen and can be concise.
  // For SMS or other channels, send the raw message — the LLM will be verbose.
  let fullMessage = message;
  if (channel === "web" && pageContext) {
    fullMessage = `[Context: ${pageContext}]\n\n${message}`;
  }

  const history = conversationHistory.get(sessionId);
  const responseText = await converse(
    client,
    history,
    fullMessage,
    portfolioContext,
    channel,
  );
  const { reply, mutations, navigate } = parseResponse(responseText);

  let finalReply = reply;
  let mutated = false;

  if (mutations.length > 0) {
    try {
      const mutationResults = await executeMutations(userId, mutations);
      const hasFailures = mutationResults.some((r) => r.status !== "ok");
      const hasSuccesses = mutationResults.some((r) => r.status === "ok");
      mutated = hasSuccesses;

      if (hasFailures) {
        finalReply = await correctFailedMutations(
          client,
          history,
          fullMessage,
          reply,
          mutationResults,
          portfolioContext,
        );
      }
    } catch (err) {
      console.error("[ai] Mutation error:", err);
    }
  }

  conversationHistory.append(sessionId, { role: "user", text: fullMessage });
  conversationHistory.append(sessionId, { role: "model", text: finalReply });

  return { reply: finalReply, mutated, navigate };
}
