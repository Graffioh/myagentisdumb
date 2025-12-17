export interface AgentRequest {
    prompt: string;
}

export interface AgentResponse {
    text: string;
}

export interface AgentMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: AgentToolCall[];
}

export interface AgentToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface InspectionEvent {
    id: number;
    ts: number;
    data: string;
    expanded?: boolean;
  };
