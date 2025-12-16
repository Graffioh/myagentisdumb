import { AgentMessage, AgentToolCall } from "./types";
import { toolDefinitions, toolImplementations } from "./tools/base";
import { sendInspectionMessage } from "./sse-client";

let context: AgentMessage[] = [];

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
`.trim();

// Main loop for the agent using OpenRouter API
export async function runLoop(userInput: string) {
    context.push({ role: "user", content: userInput });

    while (true) {
        const messages: AgentMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...context,
        ];

        sendInspectionMessage(`Agent is thinking...`);

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
        sendInspectionMessage(`📨 Full OpenRouter API response: ${JSON.stringify(data, null, 2)}`);

        const msg = data.choices[0].message;
        sendInspectionMessage(`📨 Model message: ${JSON.stringify(msg, null, 2)}`);

        const toolCalls: AgentToolCall[] = msg.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            sendInspectionMessage(`Model decided to use TOOLS: ${toolCalls.map(call => call.function.name).join(", ")}`);

            context.push({
                role: "assistant",
                content: "",
                tool_calls: toolCalls
            });

            for (const call of toolCalls) {
                const toolName = call.function.name;
                const toolDescription = toolDefinitions.find(t => t.function.name === toolName)?.function.description;
                const args = JSON.parse(call.function.arguments || "{}");

                sendInspectionMessage(`🔧 Tool call → ${toolName} \n\n with arguments: ${JSON.stringify(args, null, 2)} \n\n Description: ${toolDescription}`);

                if (!toolImplementations[toolName]) {
                    throw new Error(`Unknown tool: ${toolName}`);
                }

                const result = await toolImplementations[toolName](args);

                context.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }

            continue;
        }

        sendInspectionMessage(`💬 Final Assistant message: ${msg.content}`);

        const finalContent = msg.content;
        context.push({ role: "assistant", content: finalContent });

        return finalContent;
    }
}
