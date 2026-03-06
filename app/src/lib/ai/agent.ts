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

export async function handleWebChat(
  userId: string,
  sessionId: string,
  message: string,
  pageContext?: string,
): Promise<string> {
  const client = getClient();

  let portfolioContext: string | undefined;
  try {
    portfolioContext = await loadPortfolioContext(userId);
  } catch (err) {
    console.error("[ai] Failed to load portfolio context:", err);
  }

  const fullMessage = pageContext
    ? `[Context: ${pageContext}]\n\n${message}`
    : message;

  const history = conversationHistory.get(sessionId);
  const responseText = await converse(
    client,
    history,
    fullMessage,
    portfolioContext,
  );
  const { reply, mutations } = parseResponse(responseText);

  let finalReply = reply;
  if (mutations.length > 0) {
    try {
      const mutationResults = await executeMutations(userId, mutations);
      const hasFailures = mutationResults.some((r) => r.status !== "ok");
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

  return finalReply;
}
