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
import { InspectionEventLabel, SSEEventType } from "../protocol/types";

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
    evaluable: (userQuery: string, agentResponse: string, tokenUsage?: TokenUsage | null) => Promise<void>;
};

export function createHttpInspectionReporter(
    baseUrl: string = "http://localhost:6969",
): InspectionReporter {
    const endpoint = `${baseUrl}/api/inspection/events`;

    async function send(type: SSEEventType, payload: unknown): Promise<void> {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, payload }),
            });

            if (!response.ok) {
                console.error(`Failed to send ${type} event: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error sending ${type} event:`, error);
        }
    }

    return {
        async log(message: string): Promise<void> {
            console.log("Sending inspection log:", message);
            const event: InspectionEvent = { message };
            await send(SSEEventType.Trace, event);
        },

        async trace(message: string, children: Array<{ label: InspectionEventLabel; data: string }>, tokenUsage?: TokenUsage | null): Promise<void> {
            console.log("Sending inspection trace:", message);
            let finalChildren = children;
            
            if (tokenUsage) {
                const tokenParts: string[] = [];
                tokenParts.push(`Prompt: ${tokenUsage.promptTokens}`);
                tokenParts.push(`Model output: ${tokenUsage.modelOutputTokens}`);
                if (tokenUsage.modelReasoningTokens !== null && tokenUsage.modelReasoningTokens !== undefined) {
                    tokenParts.push(`(Extra) Model Reasoning: ${tokenUsage.modelReasoningTokens}`);
                }
                
                const tokenUsageData = tokenParts.join(" • ");
                const tokenUsageChild = { label: InspectionEventLabel.TokenUsage, data: tokenUsageData };
                finalChildren = [...children, tokenUsageChild];
            }
            
            const event: InspectionEvent = { message, children: finalChildren };
            await send(SSEEventType.Trace, event);
        },

        async context(ctx: ContextMessage[]): Promise<void> {
            console.log("Sending context update:", JSON.stringify(ctx));
            await send(SSEEventType.Context, ctx);
        },

        async tokens(currentUsage: number, maxTokens: number | null): Promise<void> {
            console.log("Sending tokens update:", JSON.stringify({ currentUsage, maxTokens }));
            await send(SSEEventType.Tokens, { currentUsage, maxTokens });
        },

        async tools(toolDefinitions: AgentToolDefinition[]): Promise<void> {
            console.log("Sending tool definitions:", JSON.stringify(toolDefinitions));
            await send(SSEEventType.Tools, toolDefinitions);
        },

        async model(modelName: string): Promise<void> {
            console.log("Sending model name:", modelName);
            await send(SSEEventType.Model, { model: modelName });
        },

        async invocationStart(message: string = "Invocation started"): Promise<void> {
            console.log("Sending invocation start:", message);
            const event: InspectionEvent = {
                message,
                children: [{ label: InspectionEventLabel.InvocationStart, data: "" }]
            };
            await send(SSEEventType.Trace, event);
        },

        async invocationEnd(message: string = "Invocation ended"): Promise<void> {
            console.log("Sending invocation end:", message);
            const event: InspectionEvent = {
                message,
                children: [{ label: InspectionEventLabel.InvocationEnd, data: "" }]
            };
            await send(SSEEventType.Trace, event);
        },

        async error(message: string, details?: string): Promise<void> {
            console.log("Sending inspection error:", message, details);
            const event: InspectionEvent = {
                message: `Error: ${message}`,
                children: details ? [{ label: InspectionEventLabel.Error, data: details }] : [],
            };
            await send(SSEEventType.Trace, event);
        },

        async evaluable(userQuery: string, agentResponse: string, tokenUsage?: TokenUsage | null): Promise<void> {
            console.log("Sending evaluable trace:", agentResponse.slice(0, 50));
            let children: Array<{ label: InspectionEventLabel; data: string }> = [
                { label: InspectionEventLabel.Content, data: agentResponse }
            ];

            if (tokenUsage) {
                const tokenParts: string[] = [];
                tokenParts.push(`Prompt: ${tokenUsage.promptTokens}`);
                tokenParts.push(`Model output: ${tokenUsage.modelOutputTokens}`);
                if (tokenUsage.modelReasoningTokens !== null && tokenUsage.modelReasoningTokens !== undefined) {
                    tokenParts.push(`(Extra) Model Reasoning: ${tokenUsage.modelReasoningTokens}`);
                }
                const tokenUsageData = tokenParts.join(" • ");
                children.push({ label: InspectionEventLabel.TokenUsage, data: tokenUsageData });
            }

            const event: InspectionEvent = {
                message: "Final Assistant message",
                children,
                evaluable: true,
                userQuery,
            };
            await send(SSEEventType.Trace, event);
        },
    };
}
