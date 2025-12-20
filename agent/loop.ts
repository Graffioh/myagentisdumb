import type { AgentMessage, AgentToolCall, TokenUsage } from "./types";
import { toolDefinitions, toolImplementations } from "./tools/base";
import { createHttpInspectionReporter } from "../reporter/index";
import {
    fetchModelContextLimit,
    updateContext,
    clearContext as clearContextUtil,
    getContext as getContextUtil,
    getTokenUsage as getTokenUsageUtil,
    setLastTokenUsage
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

    while (true) {
        const currentContext = getContext();
        const messages: AgentMessage[] = currentContext;

        await inspectionReporter.message(`Agent is processing the user input...`);

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
        await inspectionReporter.message(`Full OpenRouter API response: ${JSON.stringify(data, null, 2)}`);

        // Extract and send token usage
        if (data.usage) {
            const contextLimit = await fetchModelContextLimit(currentModel);
            const tokenUsage: TokenUsage = {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
                contextLimit,
                remainingTokens: contextLimit !== null ? contextLimit - (data.usage.total_tokens || 0) : null,
            };
            setLastTokenUsage(tokenUsage);
            await inspectionReporter.tokens(tokenUsage.totalTokens, tokenUsage.contextLimit);
        }

        const msg = data.choices[0].message;
        await inspectionReporter.message(`Model message: ${JSON.stringify(msg, null, 2)}`);

        const toolCalls: AgentToolCall[] = msg.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            await inspectionReporter.message(`Model decided to use TOOLS: ${toolCalls.map(call => call.function.name).join(", ")}`);

            await updateContext({
                role: "assistant",
                content: "",
                tool_calls: toolCalls
            });

            // Call all tools one by one based on agent reasoning
            for (const call of toolCalls) {
                const toolName = call.function.name;
                const toolDescription = toolDefinitions.find(t => t.function.name === toolName)?.function.description;
                const args = JSON.parse(call.function.arguments || "{}");

                await inspectionReporter.message(`Tool call → ${toolName} \n\n with arguments: ${JSON.stringify(args, null, 2)} \n\n Description: ${toolDescription}`);

                if (!toolImplementations[toolName]) {
                    throw new Error(`Unknown tool: ${toolName}`);
                }

                const result = await toolImplementations[toolName](args);

                await updateContext({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }

            continue;
        }

        const finalContent = msg.content ? msg.content : `The agent is confused x.x`;
        await inspectionReporter.message(`Final Assistant message: ${finalContent}`);

        await updateContext({ role: "assistant", content: msg.content });

        return finalContent;
    }
}
