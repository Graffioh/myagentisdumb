import type { AgentMessage } from "./types";
import type { TokenUsage, ContextMessage } from "../protocol/types";
import { createHttpInspectionReporter } from "../reporter/index";

const inspectionReporter = createHttpInspectionReporter();

let context: AgentMessage[] = [];
let lastTokenUsage: TokenUsage = {
    promptTokens: 0,
    modelOutputTokens: 0,
    totalTokens: 0,
    modelReasoningTokens: null,
    contextLimit: null,
    remainingTokens: null,
};

const modelContextCache: Record<string, number> = {};

export async function fetchModelContextLimit(model: string): Promise<number | null> {
    // The model context limit is cached to avoid unnecessary API calls since it doesn't change 
    if (modelContextCache[model]) {
        return modelContextCache[model];
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });
        const data = await response.json();
        const modelInfo = data.data?.find((m: { id: string }) => m.id === model);
        const contextLength = modelInfo?.context_length;
        if (contextLength) {
            modelContextCache[model] = contextLength;
        }
        return contextLength || null;
    } catch {
        return null;
    }
}

export async function updateContext(newMessage: AgentMessage) {
    context.push(newMessage);
    // Convert to ContextMessage[] (excluding reasoning) for inspection
    const contextForInspection: ContextMessage[] = context.map((msg) => {
        const { reasoning, ...rest } = msg;
        return rest as ContextMessage;
    });
    await inspectionReporter.context(contextForInspection);
}

export async function clearContext(currentModel: string) {
    context = [];
    await inspectionReporter.context([]);
    await inspectionReporter.trace("Context cleared");
    
    const contextLimit = await fetchModelContextLimit(currentModel);
    const resetTokenUsage: TokenUsage = {
        promptTokens: 0,
        modelOutputTokens: 0,
        totalTokens: 0,
        modelReasoningTokens: null,
        contextLimit: contextLimit ?? null,
        remainingTokens: contextLimit ?? null
    };
    lastTokenUsage = resetTokenUsage;
    await inspectionReporter.tokens(resetTokenUsage.totalTokens, resetTokenUsage.contextLimit ?? null);
}

export function getContext(): AgentMessage[] {
    return [...context];
}

export function getTokenUsage(): TokenUsage {
    return { ...lastTokenUsage };
}

export function setLastTokenUsage(usage: TokenUsage) {
    lastTokenUsage = usage;
}
