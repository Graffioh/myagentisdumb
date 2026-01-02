/**
 * Shared protocol types for inspection system
 * 
 * These types define the contract between:
 * - Agent implementations (via reporter)
 * - Inspection server
 * - Frontend UI
 */


/**
 * Tool definitions
 */
export type JSONSchema = {
  type: "object" | "string" | "number" | "boolean" | "array";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  items?: JSONSchema;
};

export type AgentToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
};

/**
 * Tool call (compatible with OpenAI/OpenRouter format)
 */
export type AgentToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Context message (what gets sent to/from the LLM)
 * Note: reasoning is NOT included here as it's inspection-only
 */
export type ContextMessage = {
  role: string; // system, user, assistant, tool
  content?: string | null;
  tool_calls?: AgentToolCall[];
};

/**
 * Token usage information
 */
export type TokenUsage = {
  totalTokens: number;
  promptTokens?: number | null;
  modelOutputTokens?: number | null;
  modelReasoningTokens?: number | null;
  remainingTokens?: number | null;
  contextLimit?: number | null;
};

/**
 * Inspection event (with structured format for inspection messages)
 */
export enum InspectionEventLabel {
  Content = "Content",
  Reasoning = "Reasoning",
  ToolCalls = "Tool Calls",
  Timing = "Timing",
  TokenUsage = "Token Usage",
  Custom = "Custom",
  InvocationStart = "__INVOCATION_START__",
  InvocationEnd = "__INVOCATION_END__",
  Error = "Error",
}

export type InspectionEventChild = {
  label: InspectionEventLabel;
  data: string;
};

export type InspectionEvent = {
  message: string;
  children?: InspectionEventChild[];
  invocationId?: string;
  evaluable?: boolean;
  userQuery?: string;
};

/**
 * SSE Event types for unified streaming endpoint
 */
export enum SSEEventType {
  Trace = "trace",
  Context = "context",
  Tokens = "tokens",
  Tools = "tools",
  Model = "model",
  AgentStatus = "agent-status",
}

export type SSEEvent = 
  | { type: SSEEventType.Trace; payload: InspectionEvent }
  | { type: SSEEventType.Context; payload: ContextMessage[] }
  | { type: SSEEventType.Tokens; payload: { totalTokens: number; contextLimit: number | null; remainingTokens: number | null } }
  | { type: SSEEventType.Tools; payload: AgentToolDefinition[] }
  | { type: SSEEventType.Model; payload: { model: string } }
  | { type: SSEEventType.AgentStatus; payload: { connected: boolean } };

/**
 * LLM-as-a-Judge evaluation result
 */
export type EvaluationScores = {
  correctness: number;
  completeness: number;
  clarity: number;
  relevance: number;
  helpfulness: number;
};

export type EvaluationResult = {
  scores: EvaluationScores;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

/**
 * MAID Snapshot format for import/export
 * This is the standard format for sharing inspection data
 */
export type MaidSnapshotEvent = {
  ts: number;
  data: string;
  inspectionEvent: InspectionEvent;
};

export type MaidSnapshot = {
  version: "1.0";
  exportedAt: string;
  model: string;
  tokenUsage: TokenUsage;
  tools: AgentToolDefinition[];
  context: ContextMessage[];
  events: MaidSnapshotEvent[];
};
