import type { AgentMessage } from "./types";
import type { AgentToolCall, TokenUsage } from "../protocol/types";
import { InspectionEventLabel } from "../protocol/types";
import { toolDefinitions, toolImplementations } from "./tools/base";
import { createHttpInspectionReporter } from "../reporter/index";
import {
    fetchModelContextLimit,
    updateContext,
    clearContext as clearContextUtil,
    getContext as getContextUtil,
    getTokenUsage as getTokenUsageUtil,
    addTokenUsage
} from "./context";

const inspectionReporter = createHttpInspectionReporter();

let currentModel = "openai/gpt-oss-120b";

export async function clearContext() {
    await clearContextUtil(currentModel);
}

export function getContext(): AgentMessage[] {
    return getContextUtil();
}

export function getTokenUsage(): TokenUsage {
    return getTokenUsageUtil();
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `
You are a helpful assistant that can answer questions and help with tasks.
Your response should be concise and to the point.

Format the bold, italic, underline, code, blockquote, list, image, and other special text with HTML.

You have access to tools to help you with your tasks (if needed).

Follow these rules strictly:
- Never invent Tool arguments and these arguments MUST be valid JSON objects
- If unsure, do NOT call tools
- Keep formatting consistent and clean (do not use <p> or similar if not needed)
`.trim();

export async function runLoop(userInput: string) {
    await inspectionReporter.tools(toolDefinitions);
    await inspectionReporter.model(currentModel);

    // Include system prompt in context if it's the first message
    const startContext = getContext();
    if (startContext.length === 0) {
        await updateContext({ role: "system", content: SYSTEM_PROMPT });
    }

    await updateContext({ role: "user", content: userInput });

    await inspectionReporter.latencyStart("Agent is processing the user input...");

    while (true) {
        const currentContext = getContext();
        const messages: AgentMessage[] = currentContext;

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "MyAgentIsDumb",
            },
            body: JSON.stringify({
                model: currentModel,
                messages,
                tools: toolDefinitions,
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();

        await inspectionReporter.log(`Full OpenRouter API response: ${JSON.stringify(data, null, 2)}`);

        // Extract token usage for per-request reporting
        let requestTokenUsage: TokenUsage | null = null;
        if (data.usage) {
            requestTokenUsage = {
                promptTokens: data.usage.prompt_tokens || 0,
                modelOutputTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
                modelReasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens ?? null,
            };
        }

        // Extract token usage for cumulative tracking
        if (data.usage) {
            const contextLimit = await fetchModelContextLimit(currentModel);
            const totalTokens = data.usage.total_tokens || 0;
            const tokenUsage: TokenUsage = {
                promptTokens: data.usage.prompt_tokens || 0,
                modelOutputTokens: data.usage.completion_tokens || 0,
                totalTokens,
                modelReasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens ?? null,
                contextLimit: contextLimit ?? null,
                remainingTokens: null, // Will be calculated in addTokenUsage
            };
            addTokenUsage(tokenUsage);

            // Get the cumulative total after adding
            const cumulativeUsage = getTokenUsageUtil();
            await inspectionReporter.tokens(cumulativeUsage.totalTokens, cumulativeUsage.contextLimit ?? null);
        }

        const msg = data.choices[0].message;

        await inspectionReporter.log(`Model message: ${JSON.stringify(msg, null, 2)}`);

        const { tool_calls: toolCalls, reasoning } = msg;

        if (toolCalls && toolCalls.length > 0) {
            const toolNames = toolCalls.map((call: AgentToolCall) => call.function.name).join(", ");
            const toolCount = toolCalls.length;
            const toolText = toolCount === 1 ? "tool" : "tools";

            // Validate all tool call arguments BEFORE adding to context
            // This prevents corrupted messages from being added if the model returns malformed JSON
            const parsedArgs: Record<string, unknown>[] = [];
            for (const call of toolCalls) {
                try {
                    const args = JSON.parse(call.function.arguments || "{}");
                    parsedArgs.push(args);
                } catch (parseError) {
                    await inspectionReporter.trace(
                        `Error: Model returned malformed tool arguments for ${call.function.name}: ${call.function.arguments}`,
                        [{ label: InspectionEventLabel.ToolCalls, data: JSON.stringify(call, null, 2) }]
                    );
                    throw new Error(`Model returned malformed JSON for tool ${call.function.name} arguments: ${call.function.arguments}`);
                }
            }

            if (reasoning) {
                await inspectionReporter.trace(
                    `Agent executing ${toolCount} ${toolText}: ${toolNames}`,
                    [
                        { label: InspectionEventLabel.Reasoning, data: reasoning },
                        { label: InspectionEventLabel.ToolCalls, data: JSON.stringify(toolCalls, null, 2) }
                    ],
                );
            } else {
                await inspectionReporter.log(`Agent executing ${toolCount} ${toolText}: ${toolNames}`);
            }

            await updateContext({
                role: "assistant",
                content: "",
                tool_calls: toolCalls
            });

            // Call all tools one by one 
            for (let i = 0; i < toolCalls.length; i++) {
                const call = toolCalls[i];
                const toolName = call.function.name;
                const args = parsedArgs[i];

                if (!toolImplementations[toolName]) {
                    throw new Error(`Unknown tool: ${toolName}`);
                }

                const startTime = performance.now();
                const result = await toolImplementations[toolName](args);
                const endTime = performance.now();
                const durationMs = endTime - startTime;

                // Report tool execution with timing
                await inspectionReporter.trace(
                    `Tool ${toolName} executed`,
                    [
                        { label: InspectionEventLabel.Timing, data: `${durationMs.toFixed(2)}ms` },
                        { label: InspectionEventLabel.ToolCalls, data: JSON.stringify({ tool: toolName, args, result }, null, 2) }
                    ],
                    requestTokenUsage
                );

                await updateContext({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }

            continue;
        }

        // No more tool calls, so we can display the final content
        const finalContent = msg.content ? msg.content : `The agent is confused (ᗒᗣᗕ)`;

        if (reasoning) {
            await inspectionReporter.trace(
                "Final Assistant message",
                [
                    { label: InspectionEventLabel.Reasoning, data: reasoning },
                    { label: InspectionEventLabel.Content, data: finalContent }
                ],
                requestTokenUsage
            );
        } else {
            await inspectionReporter.trace(
                "Final Assistant message",
                [{ label: InspectionEventLabel.Content, data: finalContent }],
                requestTokenUsage
            );
        }

        await updateContext({
            role: "assistant",
            content: finalContent
        });

        await inspectionReporter.latencyEnd("Agent loop completed.");

        return finalContent;
    }
}
