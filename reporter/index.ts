/**
 * Inspection Reporter - HTTP client for sending events to the inspection server to be imported inside the agent loop.
 *
 * This module provides a ready-to-use client for any agent implementation
 * to send debugging events to the inspection server.
 *
 * Usage:
 * ```ts
 * import { createHttpInspectionReporter } from "@you/protocol";
 *
 * const reporter = createHttpInspectionReporter("http://localhost:3003");
 * await reporter.message("Agent is thinking...");
 * await reporter.context(messages);
 * await reporter.tokens(usage);
 * ```
 */

type InspectionReporter = {
    message: (msg: string) => Promise<void>;
    context: (ctx: unknown[]) => Promise<void>;
    tokens: (usage: unknown) => Promise<void>;
};

/**
 * Creates an HTTP-based inspection reporter that POSTs events to the inspection server.
 *
 * @param baseUrl - The base URL of the inspection server (default: http://localhost:3003)
 */
export function createHttpInspectionReporter(
    baseUrl: string = "http://localhost:3003",
): InspectionReporter {
    return {
        async message(msg: string): Promise<void> {
            console.log("Sending inspection message:", msg);
            try {
                const response = await fetch(`${baseUrl}/api/inspection/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: msg }),
                });

                if (!response.ok) {
                    console.error(`Failed to send inspection message: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending inspection message:", error);
            }
        },

        async context(ctx: unknown[]): Promise<void> {
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

        async tokens(usage: unknown): Promise<void> {
            try {
                const response = await fetch(`${baseUrl}/api/inspection/tokens`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(usage),
                });

                if (!response.ok) {
                    console.error(`Failed to send token usage update: ${response.statusText}`);
                }
            } catch (error) {
                console.error("Error sending token usage update:", error);
            }
        },
    };
}

