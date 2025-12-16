import dotenv from "dotenv";
import { AgentMessage, AgentToolCall } from "./types";
import { toolDefinitions, toolImplementations } from "./tools/base";
import { sendSSEMessage } from "./sse-client";

dotenv.config();

let CONTEXT: AgentMessage[] = [];
let SYSTEM_PROMPT: string | null = null;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Main loop for the agent using OpenRouter API
export async function runLoop(userInput: string, systemPrompt?: string) {
    if (systemPrompt && !SYSTEM_PROMPT) {
        SYSTEM_PROMPT = systemPrompt;
    }

    CONTEXT.push({ role: "user", content: userInput });

    while (true) {
        const messages: AgentMessage[] = [];

        if (SYSTEM_PROMPT) {
            messages.push({ role: "system", content: SYSTEM_PROMPT });
        }

        messages.push(...CONTEXT);

        console.log("\n *** Agent is thinking... ***");

        sendSSEMessage(`Agent is thinking...`); 

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
            },
            body: JSON.stringify({
                model: "z-ai/glm-4.5-air:free",
                messages,
                tools: toolDefinitions,
                tool_choice: "auto",
            }),
        });
        
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        const msg = data.choices[0].message;

        console.log("\n📨 Model message:", JSON.stringify(msg, null, 2));

        const toolCalls: AgentToolCall[] = msg.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            console.log("\n*** Model decided: USE A TOOL ***");

            for (const call of toolCalls) {
                const toolName = call.function.name;
                const args = JSON.parse(call.function.arguments || "{}");

                console.log(`🔧 Tool call → ${toolName}`);
                console.log("With arguments:", args);

                if (!toolImplementations[toolName]) {
                    throw new Error(`Unknown tool: ${toolName}`);
                }

                const result = await toolImplementations[toolName](args);

                CONTEXT.push({
                    role: "assistant",
                    content: "",
                    tool_calls: toolCalls
                });

                CONTEXT.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result),
                });
            }

            continue;
        }

        console.log("💬 Final Assistant message:", msg.content);

        const finalContent = msg.content;
        CONTEXT.push({ role: "assistant", content: finalContent });

        return finalContent;
    }
}
