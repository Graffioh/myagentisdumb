/**
 * Protocol types - shared wire contract between agent, inspection, and frontend.
 * 
 * This module defines the stable interface that allows:
 * - Any agent implementation to work with the inspection server
 * - The frontend to work with any agent implementation
 * - The inspection server to remain agent-agnostic
 */

// ============================================================================
// Agent API Types (used by agent server + frontend)
// ============================================================================

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

// ============================================================================
// Token Usage Types (used by agent + inspection + frontend)
// ============================================================================

export type TokenUsage = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    contextLimit: number | null;
    remainingTokens: number | null;
};

// ============================================================================
// Context Types (used by inspection + frontend)
// ============================================================================

export type ContextMessage = {
    role: string;
    content: string;
    tool_calls?: AgentToolCall[];
};

// ============================================================================
// Inspection Event Types (used by frontend)
// ============================================================================

export type InspectionEvent = {
    id: number;
    ts: number;
    data: string;
    expanded?: boolean;
};

// ============================================================================
// Inspection Reporter Interface (for agent implementations)
// ============================================================================

/**
 * Interface that agent implementations can use to emit inspection events.
 * This allows agents to be decoupled from the inspection server implementation.
 */
export interface InspectionReporter {
    /** Send a log/debug message to inspection */
    message(line: string): Promise<void>;
    /** Update the current context view */
    context(ctx: unknown[]): Promise<void>;
    /** Update token usage display */
    tokens(usage: TokenUsage): Promise<void>;
}

/**
 * @deprecated Use `InspectionReporter` instead.
 * Kept for backwards compatibility with older imports.
 */
export type InspectionSink = InspectionReporter;

