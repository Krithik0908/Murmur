/**
 * agents/__tests__/agents.test.ts
 * Unit tests for the Murmur agent logic layer.
 *
 * Tests the parsing/validation pipeline and agent prompt construction using
 * mocked Groq responses — no real API calls are made.
 *
 * Owner: Person 1 (Agent Logic)
 */

// ---------------------------------------------------------------------------
// Mock the Groq SDK BEFORE any imports — Jest hoists jest.mock() calls
// ---------------------------------------------------------------------------

const mockCreate = jest.fn();

jest.mock("groq-sdk", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// Now import agents (they will receive the mocked Groq)
import { runTriageAgent } from "../triage";
import { runRemediationAgent } from "../remediation";
import { runTestImpactAgent } from "../testImpact";
import { runDeployRiskAgent } from "../deployRisk";
import {
  PRIMARY_AGENT_INPUT,
  PRIMARY_SCENARIO,
  PRIMARY_DEPENDENCY_CONTEXT,
} from "../scenario";
import type { AgentInput, AgentResult, UpstreamContext } from "../../lib/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Set GROQ_API_KEY so the singleton does not throw */
beforeAll(() => {
  process.env.GROQ_API_KEY = "test-key-xxxx";
});

/** Reset mock call history between tests */
afterEach(() => {
  mockCreate.mockReset();
});

/** Build a mock Groq API response */
function mockGroqResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

/** Build a valid JSON string conforming to the AgentResult contract */
function validJSON(
  decision: string,
  reasoning = "Test reasoning.",
  summary = "Test summary."
): string {
  return JSON.stringify({ decision, reasoning, summary });
}

// ---------------------------------------------------------------------------
// Shared upstream results used across test groups
// ---------------------------------------------------------------------------

const triageUpstream: UpstreamContext = {
  agent: "triage",
  decision: "REMEDIATE",
  reasoning: "Critical CVE in active execution path.",
  summary: "Immediate remediation required.",
};

const remediationUpstream: UpstreamContext = {
  agent: "remediation",
  decision: "PIN",
  reasoning: "Downgrade xz-utils to 5.4.6.",
  summary: "Pin xz-utils to 5.4.6 in Dockerfile.",
};

const testImpactUpstream: UpstreamContext = {
  agent: "testImpact",
  decision: "SMOKE_TESTS",
  reasoning: "OS-level package change — run container smoke tests.",
  summary: "Run container smoke tests post-deploy.",
};

// ---------------------------------------------------------------------------
// 1. Triage Agent — normal response is parsed correctly
// ---------------------------------------------------------------------------

describe("Triage Agent", () => {
  it("1. parses a valid REMEDIATE response correctly", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        validJSON("REMEDIATE", "Critical severity, active path.", "Remediate immediately.")
      )
    );

    const result: AgentResult = await runTriageAgent(PRIMARY_AGENT_INPUT);

    expect(result.decision).toBe("REMEDIATE");
    expect(result.reasoning).toBe("Critical severity, active path.");
    expect(result.summary).toBe("Remediate immediately.");
  });

  it("5. human correction changes the decision (MONITOR)", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        validJSON(
          "MONITOR",
          "Human correction indicates lower exploitation risk.",
          "Monitor for now."
        )
      )
    );

    const correctedInput: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      humanCorrection:
        "The dependency is not used in production request handling. Treat exploitation risk as lower.",
    };

    const result: AgentResult = await runTriageAgent(correctedInput);
    expect(result.decision).toBe("MONITOR");
  });

  it("3. throws on empty Groq response", async () => {
    mockCreate.mockResolvedValueOnce(mockGroqResponse(""));

    await expect(runTriageAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /empty response/i
    );
  });

  it("4. throws on malformed JSON (not parseable)", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse("This is not JSON at all, just prose.")
    );

    await expect(runTriageAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /JSON parse error|Could not extract/i
    );
  });

  it("5b. throws when required field 'decision' is missing", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        JSON.stringify({ reasoning: "Some reasoning.", summary: "Summary." })
      )
    );

    await expect(runTriageAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /missing required field.*decision/i
    );
  });

  it("6. throws when required field 'reasoning' is missing", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        JSON.stringify({ decision: "REMEDIATE", summary: "Summary." })
      )
    );

    await expect(runTriageAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /missing required field.*reasoning/i
    );
  });

  it("7. strips markdown fences and parses correctly", async () => {
    const fencedJSON = "```json\n" + validJSON("DISMISS") + "\n```";
    mockCreate.mockResolvedValueOnce(mockGroqResponse(fencedJSON));

    const result = await runTriageAgent(PRIMARY_AGENT_INPUT);
    expect(result.decision).toBe("DISMISS");
  });

  it("8. normalizes decision to uppercase", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        JSON.stringify({ decision: "remediate", reasoning: "lowercase", summary: "y" })
      )
    );

    const result = await runTriageAgent(PRIMARY_AGENT_INPUT);
    expect(result.decision).toBe("REMEDIATE");
  });
});

// ---------------------------------------------------------------------------
// 2. Remediation Agent — normal response is parsed correctly
// ---------------------------------------------------------------------------

describe("Remediation Agent", () => {
  it("1. parses a valid PIN response correctly", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        validJSON("PIN", "Downgrade to 5.4.6.", "Pin xz-utils to 5.4.6.")
      )
    );

    const input: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: triageUpstream,
    };
    const result: AgentResult = await runRemediationAgent(input);

    expect(result.decision).toBe("PIN");
    expect(result.reasoning).toBe("Downgrade to 5.4.6.");
  });

  it("6b. upstream triage context is passed (does not throw, returns result)", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(validJSON("UPGRADE"))
    );

    const input: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: triageUpstream,
    };
    const result = await runRemediationAgent(input);
    expect(result.decision).toBeDefined();
  });

  it("8b. throws on missing 'summary' field", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        JSON.stringify({ decision: "UPGRADE", reasoning: "Upgrade is safe." })
      )
    );

    await expect(runRemediationAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /missing required field.*summary/i
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Test-Impact Agent — normal response is parsed correctly
// ---------------------------------------------------------------------------

describe("TestImpact Agent", () => {
  it("1. parses a valid SMOKE_TESTS response correctly", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        validJSON(
          "SMOKE_TESTS",
          "OS-level change, use smoke tests.",
          "Run container smoke tests."
        )
      )
    );

    const input: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: [triageUpstream, remediationUpstream],
    };
    const result: AgentResult = await runTestImpactAgent(input);
    expect(result.decision).toBe("SMOKE_TESTS");
  });

  it("6c. accepts array of upstream contexts without throwing", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(validJSON("TARGETED_TESTS"))
    );

    const input: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: [triageUpstream, remediationUpstream],
    };
    await expect(runTestImpactAgent(input)).resolves.toBeDefined();
  });

  it("9. handles JSON embedded in surrounding prose", async () => {
    const withProse =
      "Here is my analysis:\n\n" +
      validJSON("FULL_REGRESSION") +
      "\n\nThat is my recommendation.";
    mockCreate.mockResolvedValueOnce(mockGroqResponse(withProse));

    const result = await runTestImpactAgent(PRIMARY_AGENT_INPUT);
    expect(result.decision).toBe("FULL_REGRESSION");
  });
});

// ---------------------------------------------------------------------------
// 4. Deploy-Risk Agent — normal response is parsed correctly
// ---------------------------------------------------------------------------

describe("DeployRisk Agent", () => {
  it("1. parses a valid GO_WITH_GUARDRAILS response correctly", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        validJSON(
          "GO_WITH_GUARDRAILS",
          "CRITICAL CVE warrants deployment; enable enhanced monitoring.",
          "Deploy with canary and enhanced SSH monitoring."
        )
      )
    );

    const input: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: [triageUpstream, remediationUpstream, testImpactUpstream],
    };
    const result: AgentResult = await runDeployRiskAgent(input);

    expect(result.decision).toBe("GO_WITH_GUARDRAILS");
    expect(result.reasoning).toContain("CRITICAL CVE");
  });

  it("2b. throws with descriptive message when Groq API call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network timeout"));

    await expect(runDeployRiskAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /Groq API call failed.*Network timeout/i
    );
  });

  it("3b. throws when decision field is an empty string", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(
        JSON.stringify({ decision: "", reasoning: "r", summary: "s" })
      )
    );

    await expect(runDeployRiskAgent(PRIMARY_AGENT_INPUT)).rejects.toThrow(
      /must not be empty/i
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Seed scenario — complete four-agent chain (mocked)
// ---------------------------------------------------------------------------

describe("Full pipeline chain (mocked)", () => {
  it("10. seed scenario passes through triage → remediation → testImpact → deployRisk", async () => {
    // Queue four sequential mock responses
    mockCreate
      .mockResolvedValueOnce(
        mockGroqResponse(
          validJSON("REMEDIATE", "Critical path affected.", "Remediate immediately.")
        )
      )
      .mockResolvedValueOnce(
        mockGroqResponse(
          validJSON("PIN", "Downgrade to 5.4.6.", "Pin xz-utils to 5.4.6.")
        )
      )
      .mockResolvedValueOnce(
        mockGroqResponse(
          validJSON("SMOKE_TESTS", "OS-level change.", "Smoke tests sufficient.")
        )
      )
      .mockResolvedValueOnce(
        mockGroqResponse(
          validJSON(
            "GO_WITH_GUARDRAILS",
            "Deploy with monitoring.",
            "Enable monitoring pre-deploy."
          )
        )
      );

    // Stage 1 — Triage
    const triageOut: AgentResult = await runTriageAgent(PRIMARY_AGENT_INPUT);
    expect(triageOut.decision).toBe("REMEDIATE");

    // Stage 2 — Remediation (receives triage result as upstream)
    const remediationIn: AgentInput = {
      scenario: PRIMARY_SCENARIO,
      dependencyContext: PRIMARY_DEPENDENCY_CONTEXT,
      upstreamContext: { agent: "triage", ...triageOut },
    };
    const remediationOut: AgentResult = await runRemediationAgent(remediationIn);
    expect(remediationOut.decision).toBe("PIN");

    // Stage 3 — TestImpact (receives triage + remediation as upstream)
    const testIn: AgentInput = {
      scenario: PRIMARY_SCENARIO,
      dependencyContext: PRIMARY_DEPENDENCY_CONTEXT,
      upstreamContext: [
        { agent: "triage", ...triageOut },
        { agent: "remediation", ...remediationOut },
      ],
    };
    const testOut: AgentResult = await runTestImpactAgent(testIn);
    expect(testOut.decision).toBe("SMOKE_TESTS");

    // Stage 4 — DeployRisk (receives all three upstream results)
    const deployIn: AgentInput = {
      scenario: PRIMARY_SCENARIO,
      dependencyContext: PRIMARY_DEPENDENCY_CONTEXT,
      upstreamContext: [
        { agent: "triage", ...triageOut },
        { agent: "remediation", ...remediationOut },
        { agent: "testImpact", ...testOut },
      ],
    };
    const deployOut: AgentResult = await runDeployRiskAgent(deployIn);
    expect(deployOut.decision).toBe("GO_WITH_GUARDRAILS");

    // All results satisfy the AgentResult contract
    for (const result of [triageOut, remediationOut, testOut, deployOut]) {
      expect(typeof result.decision).toBe("string");
      expect(typeof result.reasoning).toBe("string");
      expect(typeof result.summary).toBe("string");
      expect(result.decision.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Null upstream context
// ---------------------------------------------------------------------------

describe("Upstream context passing", () => {
  it("6. null upstream context does not throw in any agent", async () => {
    mockCreate.mockResolvedValueOnce(
      mockGroqResponse(validJSON("REMEDIATE"))
    );

    const inputWithNull: AgentInput = {
      ...PRIMARY_AGENT_INPUT,
      upstreamContext: null,
    };
    await expect(runTriageAgent(inputWithNull)).resolves.toBeDefined();
  });
});
