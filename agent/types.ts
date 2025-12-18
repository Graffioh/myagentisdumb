export type AgentRequest = {
    prompt: string;
};

export type AgentResponse = {
    text: string;
};

export type AgentToolCall = {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
};

export type AgentMessage = {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: AgentToolCall[];
};

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