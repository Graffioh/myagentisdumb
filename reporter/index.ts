/**
 * Inspection Reporter
 *  + HTTP client for sending events to the inspection server to be imported inside the agent loop.
 *  + Latency loop markers for tracking agent loop iterations and calculating latency heatmap.
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
 * await reporter.trace("Agent is processing...");
 * await reporter.trace("Model decision", [
 *   { label: InspectionEventLabel.Reasoning, data: "..." },
 *   { label: InspectionEventLabel.Content, data: "..." }
 * ]);
 * // Optional: include token usage for per-request tracking
 * await reporter.trace("API request completed", undefined, {
 *   promptTokens: 340,
 *   modelOutputTokens: 49,
 *   totalTokens: 389,
 *   modelReasoningTokens?: 30
 * });
 * await reporter.context(messages);
 * await reporter.tokens(currentUsage, maxTokens);
 * ```
 */

import type { InspectionEvent, ContextMessage, AgentToolDefinition, TokenUsage } from "../protocol/types";
import { InspectionEventLabel } from "../protocol/types";

type InspectionReporter = {
    trace: (message: string, children?: Array<{ label: InspectionEventLabel; data: string }>, tokenUsage?: TokenUsage | null) => Promise<void>;
    context: (ctx: ContextMessage[]) => Promise<void>;
    tokens: (currentUsage: number, maxTokens: number | null) => Promise<void>;
    tools: (toolDefinitions: AgentToolDefinition[]) => Promise<void>;
    model: (modelName: string) => Promise<void>;
    latencyStart: (message?: string) => Promise<void>;
    latencyEnd: (message?: string) => Promise<void>;
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
        async trace(message: string, children?: Array<{ label: InspectionEventLabel; data: string }>, tokenUsage?: TokenUsage | null): Promise<void> {
            console.log("Sending inspection trace:", message);
            try {
                // Build children array, adding token usage if provided
                let finalChildren: Array<{ label: InspectionEventLabel; data: string }> | undefined = children;
                
                if (tokenUsage) {
                    // Format token usage as a readable string
                    const tokenParts: string[] = [];
                    tokenParts.push(`Prompt: ${tokenUsage.promptTokens}`);
                    tokenParts.push(`Model output: ${tokenUsage.modelOutputTokens}`);
                    if (tokenUsage.modelReasoningTokens !== null && tokenUsage.modelReasoningTokens !== undefined) {
                        tokenParts.push(`(Extra) Model Reasoning: ${tokenUsage.modelReasoningTokens}`);
                    }
                    
                    const tokenUsageData = tokenParts.join(" • ");
                    
                    // Add token usage child, merging with existing children if any
                    const tokenUsageChild = { label: InspectionEventLabel.TokenUsage, data: tokenUsageData };
                    finalChildren = children ? [...children, tokenUsageChild] : [tokenUsageChild];
                }
                
                // If children provided (including token usage), it's a trace event; otherwise it's a log event
                const event: InspectionEvent = finalChildren
                    ? { message, children: finalChildren }
                    : { message };
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

        async latencyStart(message: string = "Latency started"): Promise<void> {
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.LatencyStart, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send latency start: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending latency start:", error);
            }
        },

        async latencyEnd(message: string = "Latency ended"): Promise<void> {
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.LatencyEnd, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send latency end: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending latency end:", error);
            }
        },
    };
}

