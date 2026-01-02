import type { EvaluationResult } from "../../protocol/types";

export type EvaluationState = {
  isLoading: boolean;
  result: EvaluationResult | null;
  error: string | null;
  userQuery: string | null;
  agentResponse: string | null;
};

function createEvaluationStore() {
  let state = $state<EvaluationState>({
    isLoading: false,
    result: null,
    error: null,
    userQuery: null,
    agentResponse: null,
  });

  return {
    get state() {
      return state;
    },
    async evaluate(userQuery: string, agentResponse: string): Promise<EvaluationResult | null> {
      console.log("[evaluate] Starting evaluation...");
      console.log("[evaluate] userQuery:", userQuery);
      console.log("[evaluate] agentResponse:", agentResponse.slice(0, 100));
      
      state.isLoading = true;
      state.error = null;
      state.result = null;
      state.userQuery = userQuery;
      state.agentResponse = agentResponse;

      try {
        console.log("[evaluate] Sending fetch request...");
        const response = await fetch("http://127.0.0.1:6969/api/inspection/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userQuery, agentResponse }),
        });
        console.log("[evaluate] Response received, status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.log("[evaluate] Error response:", errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("[evaluate] Success! Evaluation result:", data.evaluation);
        state.result = data.evaluation;
        return data.evaluation;
      } catch (e) {
        console.error("[evaluate] Error:", e);
        state.error = e instanceof Error ? e.message : "Evaluation failed";
        return null;
      } finally {
        console.log("[evaluate] Done, isLoading set to false");
        state.isLoading = false;
      }
    },
    clear() {
      state.result = null;
      state.error = null;
      state.userQuery = null;
      state.agentResponse = null;
    },
  };
}

export const evaluationStore = createEvaluationStore();
