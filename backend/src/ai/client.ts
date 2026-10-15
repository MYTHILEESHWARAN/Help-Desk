/**
 * Anthropic Claude API wrapper.
 * - 5-second hard timeout via Promise.race
 * - Graceful degradation when ANTHROPIC_API_KEY is not set
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../services/logger";

export const AI_UNAVAILABLE = "AI_UNAVAILABLE" as const;
export type AiUnavailable = typeof AI_UNAVAILABLE;
export function isAiUnavailable(v: unknown): v is AiUnavailable { return v === AI_UNAVAILABLE; }

const TIMEOUT_MS = 5_000;

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function callClaude(
  userPrompt: string,
  systemPrompt = "You are an IT support assistant. Follow the JSON schema exactly."
): Promise<string | AiUnavailable> {
  const client = getClient();
  if (!client) { logger.warn("ANTHROPIC_API_KEY not set"); return AI_UNAVAILABLE; }

  const model = process.env.AI_MODEL ?? "claude-3-5-haiku-20241022";
  const start = Date.now();
  try {
    const result = await Promise.race<string | AiUnavailable>([
      client.messages.create({
        model, max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }).then((msg) => {
        const block = msg.content[0];
        return block.type === "text" ? block.text : AI_UNAVAILABLE;
      }),
      new Promise<AiUnavailable>((resolve) => setTimeout(() => resolve(AI_UNAVAILABLE), TIMEOUT_MS)),
    ]);
    logger.info({ model, promptLen: userPrompt.length, durationMs: Date.now() - start }, "AI call completed");
    return result;
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, "AI call failed");
    return AI_UNAVAILABLE;
  }
}
