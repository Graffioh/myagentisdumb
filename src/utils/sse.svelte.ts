import { SSEEventType, type SSEEvent, type InspectionEvent, type ContextMessage, type AgentToolDefinition } from "../../protocol/types";

export type SSECallbacks = {
  onTrace?: (event: InspectionEvent) => void;
  onContext?: (context: ContextMessage[]) => void;
  onTokens?: (tokens: { totalTokens: number; contextLimit: number | null; remainingTokens: number | null }) => void;
  onTools?: (tools: AgentToolDefinition[]) => void;
  onModel?: (model: string) => void;
  onAgentStatus?: (connected: boolean) => void;
  onConnected?: () => void;
  onError?: () => void;
};

let eventSource: EventSource | null = null;
let callbacks: SSECallbacks[] = [];
let connectionStatus: "connecting" | "connected" | "error" = "connecting";

const INSPECTION_URL = import.meta.env.VITE_INSPECTION_URL ?? "http://localhost:6969/api";

function handleMessage(event: MessageEvent) {
  try {
    const sseEvent: SSEEvent = JSON.parse(event.data);

    for (const cb of callbacks) {
      switch (sseEvent.type) {
        case SSEEventType.Trace:
          if ((sseEvent.payload as InspectionEvent).message === "connected") {
            connectionStatus = "connected";
            cb.onConnected?.();
          } else {
            cb.onTrace?.(sseEvent.payload);
          }
          break;
        case SSEEventType.Context:
          cb.onContext?.(sseEvent.payload);
          break;
        case SSEEventType.Tokens:
          cb.onTokens?.(sseEvent.payload);
          break;
        case SSEEventType.Tools:
          cb.onTools?.(sseEvent.payload);
          break;
        case SSEEventType.Model:
          cb.onModel?.(sseEvent.payload.model);
          break;
        case SSEEventType.AgentStatus:
          cb.onAgentStatus?.(sseEvent.payload.connected);
          break;
      }
    }
  } catch (e) {
    console.error("Failed to parse SSE event:", e);
  }
}

function handleError() {
  connectionStatus = "error";
  for (const cb of callbacks) {
    cb.onError?.();
  }
}

function handleOpen() {
  connectionStatus = "connected";
  for (const cb of callbacks) {
    cb.onConnected?.();
  }
}

function ensureConnection() {
  if (eventSource) return;

  eventSource = new EventSource(INSPECTION_URL + "/inspection/events");
  eventSource.onmessage = handleMessage;
  eventSource.onerror = handleError;
  eventSource.onopen = handleOpen;
}

export function subscribeSSE(cb: SSECallbacks): () => void {
  ensureConnection();
  callbacks.push(cb);

  return () => {
    callbacks = callbacks.filter((c) => c !== cb);
    if (callbacks.length === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
      connectionStatus = "connecting";
    }
  };
}

export function getConnectionStatus() {
  return connectionStatus;
}
