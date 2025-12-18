// *** Frontend types ***
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type InspectionEvent = {
  id: number;
  ts: number;
  data: string;
  expanded: boolean;
};
// **********************

// *** Agent types ***
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

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  contextLimit: number | null;
  remainingTokens: number | null;
};

export type ContextMessage = {
  role: string;
  content: string;
  tool_calls?: unknown[];
};
// **********************
