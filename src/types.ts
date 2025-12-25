import type { InspectionEvent } from "../protocol/types";

// *** Frontend-specific types ***
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type InspectionEventDisplay = {
  id: number;
  ts: number;
  data: string;
  expanded: boolean;
  warningMarked: boolean;
  inspectionEvent: InspectionEvent;
};

// TokenUsage is now imported from protocol/types.ts
// **********************
