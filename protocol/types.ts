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
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  contextLimit: number | null;
  remainingTokens: number | null;
};

/**
 * Inspection event (with structured format for inspection messages)
 * Parent event uses message (string), children use label (InspectionEventLabel enum).
 * If children is present, it's a trace event with structured children.
 * If children is absent, it's a log event with just a message.
 */
export enum InspectionEventLabel {
  Content = "Content",
  Reasoning = "Reasoning",
  ToolCalls = "Tool Calls",
  Timing = "Timing",
  Custom = "Custom",
}

export type InspectionEventChild = {
  label: InspectionEventLabel;
  data: string;
};

export type InspectionEvent = {
  message: string;
  children?: InspectionEventChild[];
};
