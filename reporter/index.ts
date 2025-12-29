/**
 * Inspection Reporter
 *  + HTTP client for sending events to the inspection server to be imported inside the agent loop.
 *  + Invocation markers for grouping agent invocations and calculating latency heatmap.
 *
 * This module provides a ready-to-use client for any agent implementation
 * to send debugging events to the inspection server.
 *
 * Usage:
 * ```ts
 * import { createHttpInspectionReporter } from "./reporter";
 * import { InspectionEventLabel } from "../protocol/types";
 *
 * const reporter = createHttpInspectionReporter("http://localhost:6969");
 * 
 * // Mark invocation boundaries (groups events + enables latency heatmap)
 * await reporter.invocationStart("Agent is processing...");
 * // ... agent work ...
 * await reporter.invocationEnd("Invocation completed");
 * 
 * // Simple log messages (unstructured)
 * await reporter.log("Agent is processing...");
 * await reporter.log("Debug: something happened");
 * 
 * // Structured traces with children
 * await reporter.trace("Model decision", [
 *   { label: InspectionEventLabel.Reasoning, data: "..." },
 *   { label: InspectionEventLabel.Content, data: "..." }
 * ]);
 * 
 * // Traces with token usage for per-request tracking
 * await reporter.trace("API request completed", [
 *   { label: InspectionEventLabel.Content, data: "..." }
 * ], {
 *   promptTokens: 340,
 *   modelOutputTokens: 49,
 *   totalTokens: 389,
 *   modelReasoningTokens: 30
 * });
 * 
 * await reporter.context(messages);
 * await reporter.tokens(currentUsage, maxTokens);
 * 
 * // Report errors (tracks error rate per invocation)
 * try {
 *   // ... agent work ...
 * } catch (error) {
 *   await reporter.error("Operation failed", error.message);
 *   throw error;
 * }
 * ```
 */

import type { InspectionEvent, ContextMessage, AgentToolDefinition, TokenUsage } from "../protocol/types";
import { InspectionEventLabel } from "../protocol/types";

type InspectionReporter = {
    log: (message: string) => Promise<void>;
    trace: (message: string, children: Array<{ label: InspectionEventLabel; data: string }>, tokenUsage?: TokenUsage | null) => Promise<void>;
    context: (ctx: ContextMessage[]) => Promise<void>;
    tokens: (currentUsage: number, maxTokens: number | null) => Promise<void>;
    tools: (toolDefinitions: AgentToolDefinition[]) => Promise<void>;
    model: (modelName: string) => Promise<void>;
    invocationStart: (message?: string) => Promise<void>;
    invocationEnd: (message?: string) => Promise<void>;
    error: (message: string, details?: string) => Promise<void>;
};

/**
 * Creates an HTTP-based inspection reporter that POSTs events to the inspection server.
 *
 * @param baseUrl - The base URL of the inspection server (default: http://localhost:6969)
 */
export function createHttpInspectionReporter(
    baseUrl: string = "http://localhost:6969",
): InspectionReporter {
    return {
        async log(message: string): Promise<void> {
            console.log("Sending inspection log:", message);
            try {
                const event: InspectionEvent = { message };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send inspection log: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending inspection log:", error);
            }
        },

        async trace(message: string, children: Array<{ label: InspectionEventLabel; data: string }>, tokenUsage?: TokenUsage | null): Promise<void> {
            console.log("Sending inspection trace:", message);
            try {
                // Build children array, adding token usage if provided
                let finalChildren = children;
                
                if (tokenUsage) {
                    // Format token usage as a readable string
                    const tokenParts: string[] = [];
                    tokenParts.push(`Prompt: ${tokenUsage.promptTokens}`);
                    tokenParts.push(`Model output: ${tokenUsage.modelOutputTokens}`);
                    if (tokenUsage.modelReasoningTokens !== null && tokenUsage.modelReasoningTokens !== undefined) {
                        tokenParts.push(`(Extra) Model Reasoning: ${tokenUsage.modelReasoningTokens}`);
                    }
                    
                    const tokenUsageData = tokenParts.join(" • ");
                    
                    // Add token usage child
                    const tokenUsageChild = { label: InspectionEventLabel.TokenUsage, data: tokenUsageData };
                    finalChildren = [...children, tokenUsageChild];
                }
                
                const event: InspectionEvent = { message, children: finalChildren };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send inspection trace: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending inspection trace:", error);
            }
        },

        async context(ctx: ContextMessage[]): Promise<void> {
            console.log("Sending context update:", JSON.stringify(ctx));
            try {
                const response = await fetch(`${baseUrl}/api/inspection/context`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ context: ctx }),
                });

                if (!response.ok) {
                    console.error(`Failed to send context update: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending context update:", error);
            }
        },

        async tokens(currentUsage: number, maxTokens: number | null): Promise<void> {
            console.log("Sending tokens update:", JSON.stringify({ currentUsage, maxTokens }));
            try {
                const response = await fetch(`${baseUrl}/api/inspection/tokens`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentUsage, maxTokens }),
                });

                if (!response.ok) {
                    console.error(`Failed to send token usage update: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending token usage update:", error);
            }
        },

        async tools(toolDefinitions: AgentToolDefinition[]): Promise<void> {
            console.log("Sending tool definitions:", JSON.stringify(toolDefinitions));
            try {
                const response = await fetch(`${baseUrl}/api/inspection/tools`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ toolDefinitions }),
                });

                if (!response.ok) {
                    console.error(`Failed to send tool definitions: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending tool definitions:", error);
            }
        },

        async model(modelName: string): Promise<void> {
            console.log("Sending model name:", modelName);
            try {
                const response = await fetch(`${baseUrl}/api/inspection/model`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: modelName }),
                });

                if (!response.ok) {
                    console.error(`Failed to send model name: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending model name:", error);
            }
        },

        async invocationStart(message: string = "Invocation started"): Promise<void> {
            console.log("Sending invocation start:", message);
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.InvocationStart, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send invocation start: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending invocation start:", error);
            }
        },

        async invocationEnd(message: string = "Invocation ended"): Promise<void> {
            console.log("Sending invocation end:", message);
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.InvocationEnd, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send invocation end: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending invocation end:", error);
            }
        },

        async error(message: string, details?: string): Promise<void> {
            console.log("Sending inspection error:", message, details);
            try {
                const response = await fetch(`${baseUrl}/api/inspection/errors`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message, details }),
                });

                if (!response.ok) {
                    console.error(`Failed to send error: ${response.statusText}`);
                }
            } catch (err) {
                console.error("Error sending inspection error:", err);
            }
        },
    };
}

