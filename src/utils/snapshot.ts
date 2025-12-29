import type {
  AgentToolDefinition,
  ContextMessage,
  TokenUsage,
} from "../../protocol/types";
import type { InspectionEventDisplay } from "../types";

// This module is intentionally "dumb": it just mirrors whatever the UI last received.
// It's used by `DownloadSnapshot.svelte` so the snapshot matches what's displayed,
// without re-fetching from the inspection server.

let snapshotContext: ContextMessage[] = [];
let snapshotToolDefinitions: AgentToolDefinition[] = [];
let snapshotTokenUsage: TokenUsage = {
  totalTokens: 0,
  contextLimit: null,
  remainingTokens: null,
};
let snapshotEvents: InspectionEventDisplay[] = [];
let snapshotModelName: string = "";

export function setSnapshotContext(next: ContextMessage[]) {
  snapshotContext = next;
}

export function setSnapshotToolDefinitions(next: AgentToolDefinition[]) {
  snapshotToolDefinitions = next;
}

export function setSnapshotTokenUsage(next: TokenUsage) {
  snapshotTokenUsage = next;
}

export function setSnapshotEvents(next: InspectionEventDisplay[]) {
  snapshotEvents = next;
}

export function setSnapshotModelName(next: string) {
  snapshotModelName = next;
}

export function getSnapshotState(): {
  context: ContextMessage[];
  tools: AgentToolDefinition[];
  tokenUsage: TokenUsage;
  events: InspectionEventDisplay[];
  modelName: string;
} {
  return {
    context: snapshotContext,
    tools: snapshotToolDefinitions,
    tokenUsage: snapshotTokenUsage,
    events: snapshotEvents,
    modelName: snapshotModelName,
  };
}

