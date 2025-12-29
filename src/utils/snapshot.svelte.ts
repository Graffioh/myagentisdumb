import type {
  AgentToolDefinition,
  ContextMessage,
  TokenUsage,
} from "../../protocol/types";
import type { InspectionEventDisplay } from "../types";

export type ViewMode = "realtime" | "snapshot";

const initialTokenUsage: TokenUsage = {
  totalTokens: 0,
  contextLimit: null,
  remainingTokens: null,
};

class SnapshotState {
  context = $state<ContextMessage[]>([]);
  toolDefinitions = $state<AgentToolDefinition[]>([]);
  tokenUsage = $state<TokenUsage>(initialTokenUsage);
  events = $state<InspectionEventDisplay[]>([]);
  modelName = $state<string>("");
  viewMode = $state<ViewMode>("realtime");

  reset() {
    this.context = [];
    this.toolDefinitions = [];
    this.tokenUsage = initialTokenUsage;
    this.events = [];
    this.modelName = "";
    this.viewMode = "realtime";
  }

  switchToRealtime() {
    this.viewMode = "realtime";
  }
}

export const snapshot = new SnapshotState();
