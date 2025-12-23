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
 * await reporter.context(messages);
 * await reporter.tokens(currentUsage, maxTokens);
 * ```
 */

import type { InspectionEvent, ContextMessage, AgentToolDefinition } from "../protocol/types";
import { InspectionEventLabel } from "../protocol/types";

type InspectionReporter = {
    trace: (message: string, children?: Array<{ label: InspectionEventLabel; data: string }>) => Promise<void>;
    context: (ctx: ContextMessage[]) => Promise<void>;
    tokens: (currentUsage: number, maxTokens: number | null) => Promise<void>;
    tools: (toolDefinitions: AgentToolDefinition[]) => Promise<void>;
    model: (modelName: string) => Promise<void>;
    latencyLoopStart: (message?: string) => Promise<void>;
    latencyLoopEnd: (message?: string) => Promise<void>;
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
        async trace(message: string, children?: Array<{ label: InspectionEventLabel; data: string }>): Promise<void> {
            console.log("Sending inspection trace:", message);
            try {
                // If children provided, it's a trace event; otherwise it's a log event
                const event: InspectionEvent = children
                    ? { message, children }
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

        async latencyLoopStart(message: string = "Latency loop started"): Promise<void> {
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.LatencyLoopStart, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send latency loop start: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending latency loop start:", error);
            }
        },

        async latencyLoopEnd(message: string = "Latency loop ended"): Promise<void> {
            try {
                const event: InspectionEvent = {
                    message,
                    children: [{ label: InspectionEventLabel.LatencyLoopEnd, data: "" }]
                };
                const response = await fetch(`${baseUrl}/api/inspection/trace`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event }),
                });

                if (!response.ok) {
                    console.error(`Failed to send latency loop end: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending latency loop end:", error);
            }
        },
    };
}

