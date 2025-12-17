import { AgentMessage, AgentToolCall } from "./types";
import { toolDefinitions, toolImplementations } from "./tools/base";
import { sendInspectionMessage, sendContextUpdate } from "../inspection/sse/client";

let context: AgentMessage[] = [];

async function updateContext(newMessage: AgentMessage) {
    context.push(newMessage);
    await sendContextUpdate(context);
}

export async function clearContext() {
    context = [];
    await sendContextUpdate(context);
    await sendInspectionMessage("Context cleared");
}

export function getContext(): AgentMessage[] {
    return [...context];
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
    // Include system prompt in context if it's the first message
    if (context.length === 0) {
        await updateContext({ role: "system", content: SYSTEM_PROMPT });
    }
    
    await updateContext({ role: "user", content: userInput });

    while (true) {
        const messages: AgentMessage[] = [...context];

        await sendInspectionMessage(`Agent is thinking...`);

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "MyAgentIsDumb",
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages,
                tools: toolDefinitions,
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        await sendInspectionMessage(`Full OpenRouter API response: ${JSON.stringify(data, null, 2)}`);

        const msg = data.choices[0].message;
        await sendInspectionMessage(`Model message: ${JSON.stringify(msg, null, 2)}`);

        const toolCalls: AgentToolCall[] = msg.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            await sendInspectionMessage(`Model decided to use TOOLS: ${toolCalls.map(call => call.function.name).join(", ")}`);

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

                await sendInspectionMessage(`Tool call → ${toolName} \n\n with arguments: ${JSON.stringify(args, null, 2)} \n\n Description: ${toolDescription}`);

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
        await sendInspectionMessage(`Final Assistant message: ${finalContent}`);

        await updateContext({ role: "assistant", content: msg.content });

        return finalContent;
    }
}
