/**
 * Protocol package - shared contract for agent inspection.
 * 
 * This package provides:
 * - Type definitions for the wire protocol between agent and inspection server
 * - An HTTP client (InspectionReporter) for sending events to the inspection server
 * 
 * Usage for agent implementations:
 * ```ts
 * import { createHttpInspectionReporter, type InspectionReporter, type TokenUsage } from "./protocol";
 * 
 * const reporter = createHttpInspectionReporter("http://localhost:3003");
 * await reporter.message("Agent is thinking...");
 * await reporter.context(messages);
 * await reporter.tokens(usage);
 * ```
 */

export type {
    AgentRequest,
    AgentResponse,
    AgentMessage,
    AgentToolCall,
    JSONSchema,
    AgentToolDefinition,
    TokenUsage,
    ContextMessage,
    InspectionEvent,
    InspectionReporter,
    InspectionSink,
} from "./types";

export { createHttpInspectionReporter } from "./inspection";
