/**
 * agents/shared.ts
 * Shared Groq client, JSON parsing/validation helpers, and prompt utilities
 * reused by all four security agents.
 *
 * Owner: Person 1 (Agent Logic)
 */

import Groq from "groq-sdk";
import type { AgentResult, UpstreamContext } from "../lib/types";

// ---------------------------------------------------------------------------
// Groq client singleton
// ---------------------------------------------------------------------------

let _groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Add it to .env.local (see .env.example)."
      );
    }
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
}

export const GROQ_MODEL = "openai/gpt-oss-20b";

// ---------------------------------------------------------------------------
// JSON extraction / parsing
// ---------------------------------------------------------------------------

/**
 * Strips optional markdown code fences (```json ... ``` or ``` ... ```)
 * from a model response and returns the inner text.
 */
function stripMarkdownFences(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Remove a leading ``` without a closing fence (model truncation edge case)
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

/**
 * Attempts to extract the first JSON object from a model response string.
 * Handles:
 *  - Valid JSON
 *  - JSON surrounded by markdown fences
 *  - Prose before/after the JSON object
 *  - Minor whitespace issues
 */
function extractJSON(raw: string): unknown {
  const cleaned = stripMarkdownFences(raw);

  // Try direct parse first (happy path)
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through
  }

  // Try to find the first {...} block in the raw string
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // Fall through
    }
  }

  throw new Error(
    `Could not extract a valid JSON object from model response. Raw output (first 500 chars): ${raw.slice(0, 500)}`
  );
}

// ---------------------------------------------------------------------------
// AgentResult validation
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: Array<keyof AgentResult> = [
  "decision",
  "reasoning",
  "summary",
];

/**
 * Validates that a parsed JSON value conforms to the AgentResult contract.
 * Throws a descriptive error if any required field is missing or has the
 * wrong type.
 */
function validateAgentResult(parsed: unknown): AgentResult {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Agent result must be a JSON object, got: ${typeof parsed}`
    );
  }

  const obj = parsed as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      throw new Error(
        `Agent result is missing required field: "${field}". Got keys: [${Object.keys(obj).join(", ")}]`
      );
    }
    if (typeof obj[field] !== "string") {
      throw new Error(
        `Agent result field "${field}" must be a string, got: ${typeof obj[field]}`
      );
    }
    if ((obj[field] as string).trim() === "") {
      throw new Error(`Agent result field "${field}" must not be empty.`);
    }
  }

  return {
    decision: (obj.decision as string).trim().toUpperCase(),
    reasoning: (obj.reasoning as string).trim(),
    summary: (obj.summary as string).trim(),
  };
}

/**
 * Optionally warns (but does not throw) when the decision token is outside the
 * expected vocabulary for a given agent.
 */
export function warnIfUnexpectedDecision(
  agentName: string,
  decision: string,
  allowedDecisions: readonly string[]
): void {
  if (!allowedDecisions.includes(decision)) {
    console.warn(
      `[${agentName}] Unexpected decision token: "${decision}". ` +
        `Expected one of: [${allowedDecisions.join(", ")}]. ` +
        `Proceeding with the raw value — caller should handle this.`
    );
  }
}

// ---------------------------------------------------------------------------
// Core Groq call + parse/validate pipeline
// ---------------------------------------------------------------------------

export interface GroqCallOptions {
  /** Agent name used for logging / error messages */
  agentName: string;
  /** System prompt (role + instructions) */
  systemPrompt: string;
  /** User message (the serialized scenario/context block) */
  userPrompt: string;
  /** Allowed decision tokens for post-validation warning */
  allowedDecisions: readonly string[];
  /**
   * Temperature — kept low for deterministic structured output.
   * Default: 0.2
   */
  temperature?: number;
}

/**
 * Calls Groq, parses the response, validates the AgentResult contract,
 * and returns a strongly-typed AgentResult.
 *
 * Throws on:
 *  - Groq API failure
 *  - Unparseable JSON
 *  - Missing required fields
 *  - Empty field values
 */
export async function callGroqAgent(
  options: GroqCallOptions
): Promise<AgentResult> {
  const {
    agentName,
    systemPrompt,
    userPrompt,
    allowedDecisions,
    temperature = 0.2,
  } = options;

  const client = getGroqClient();

  let rawContent: string;

  try {
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    rawContent = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[${agentName}] Groq API call failed: ${message}`);
  }

  if (!rawContent || rawContent.trim() === "") {
    throw new Error(`[${agentName}] Groq returned an empty response.`);
  }

  let parsed: unknown;
  try {
    parsed = extractJSON(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[${agentName}] JSON parse error: ${message}`);
  }

  let result: AgentResult;
  try {
    result = validateAgentResult(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[${agentName}] AgentResult validation failed: ${message}`);
  }

  warnIfUnexpectedDecision(agentName, result.decision, allowedDecisions);

  return result;
}

// ---------------------------------------------------------------------------
// Prompt building helpers
// ---------------------------------------------------------------------------

/**
 * Serialises upstream context block(s) into a readable prompt section.
 * Handles single UpstreamContext, an array of UpstreamContext, or null.
 */
export function formatUpstreamContext(
  ctx: UpstreamContext | UpstreamContext[] | null | undefined
): string {
  if (!ctx) return "None (this is the first agent in the pipeline).";

  const items = Array.isArray(ctx) ? ctx : [ctx];
  return items
    .map(
      (c) =>
        `Agent: ${c.agent.toUpperCase()}\n` +
        `Decision: ${c.decision}\n` +
        `Reasoning: ${c.reasoning}\n` +
        `Summary: ${c.summary}`
    )
    .join("\n\n---\n\n");
}

/**
 * Formats the human correction block for injection into prompts.
 */
export function formatHumanCorrection(
  correction: string | null | undefined
): string {
  if (!correction || correction.trim() === "") {
    return "None.";
  }
  return `"${correction.trim()}"`;
}
