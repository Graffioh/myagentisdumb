import type { InspectionEvent } from "../protocol/types";

// *** Frontend-specific types ***
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type InspectionEventDisplay = {
  id: number;
  ts: number;
  data: string;
  expanded: boolean;
  inspectionEvent: InspectionEvent;
  invocationId?: string;
};

// TokenUsage is now imported from protocol/types.ts
// **********************
