<script lang="ts">
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel } from "../../protocol/types";
  import { evaluationStore } from "../stores/evaluation.svelte";

  interface Props {
    event: InspectionEventDisplay;
    highlighted?: boolean;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
  }

  let {
    event,
    highlighted = false,
    onToggleExpand,
    onRemove,
  }: Props = $props();

  const isEvaluable = $derived(!!event.inspectionEvent.evaluable);
  const userQuery = $derived(event.inspectionEvent.userQuery || "");
  const isEvaluating = $derived(evaluationStore.state.isLoading);

  async function handleEvaluate() {
    if (!isEvaluable) return;
    
    const contentChild = event.inspectionEvent.children?.find(
      (child) => child.label === InspectionEventLabel.Content
    );
    const agentResponse = contentChild?.data || event.data;
    
    await evaluationStore.evaluate(userQuery, agentResponse);
  }

  function getFirstLine(data: string): string {
    return data.split("\n")[0];
  }

  const isExpanded = $derived(!!event.expanded);
  const hasChildren = $derived(
    !!event.inspectionEvent.children &&
      event.inspectionEvent.children.length > 0
  );
  const multiline = $derived(event.data.includes("\n") || hasChildren);
  const hasReasoning = $derived(
    hasChildren &&
      event.inspectionEvent.children?.some(
        (child) => child.label === InspectionEventLabel.Reasoning
      )
  );
  const hasTiming = $derived(
    hasChildren &&
      event.inspectionEvent.children?.some(
        (child) => child.label === InspectionEventLabel.Timing
      )
  );
  const timingData = $derived(
    event.inspectionEvent.children?.find(
      (child) => child.label === InspectionEventLabel.Timing
    )?.data || null
  );
  const hasTokenUsage = $derived(
    hasChildren &&
      event.inspectionEvent.children?.some(
        (child) => child.label === InspectionEventLabel.TokenUsage
      )
  );
  const hasError = $derived(
    hasChildren &&
      event.inspectionEvent.children?.some(
        (child) => child.label === InspectionEventLabel.Error
      )
  );
  const hasToolCalls = $derived(
    hasChildren &&
      event.inspectionEvent.children?.some(
        (child) => child.label === InspectionEventLabel.ToolCalls
      )
  );
  const tokenUsageData = $derived(
    event.inspectionEvent.children?.find(
      (child) => child.label === InspectionEventLabel.TokenUsage
    )?.data || null
  );

  // Extract and calculate total tokens from token usage data for badge display
  // Note: reasoning tokens are excluded as they don't count toward context usage
  const tokenUsageBadge = $derived.by<string | null>(() => {
    if (!tokenUsageData) return null;
    // Extract tokens from format like "Prompt: 340 • Model output: 43 • (Extra) Model Reasoning: 24"
    const promptMatch = tokenUsageData.match(/Prompt:\s*(\d+)/);
    const outputMatch = tokenUsageData.match(/Model output:\s*(\d+)/);

    if (promptMatch && outputMatch) {
      const prompt = parseInt(promptMatch[1], 10);
      const output = parseInt(outputMatch[1], 10);
      return (prompt + output).toString();
    }
    return null;
  });
</script>

<div class="row" class:highlighted class:hasError class:hasToolCalls data-event-id={event.id}>
  <button class="row-content" onclick={() => onToggleExpand(event.id)}>
    <div class="ts">{new Date(event.ts).toLocaleTimeString()}</div>
    <div class="data-container">
      {#if multiline}
        <span class="expand-button">
          <span class="arrow {isExpanded ? 'expanded' : ''}">▶</span>
        </span>
      {/if}
      <div class="data-content">
        <div class="data-with-badge">
          <pre class="data {isExpanded ? '' : 'collapsed'}">{isExpanded ||
            !multiline
              ? event.data
              : getFirstLine(event.data)}</pre>
          {#if hasReasoning}
            <span class="reasoning-badge" title="Contains reasoning details"
              >R</span
            >
          {/if}
          {#if hasTiming && timingData}
            <span class="timing-badge" title="Tool execution time"
              >{timingData}</span
            >
          {/if}
          {#if tokenUsageBadge}
            <span
              class="token-usage-badge"
              title={tokenUsageData || "Token usage"}
              >{tokenUsageBadge} tokens</span
            >
          {/if}
        </div>
        {#if isExpanded && hasChildren}
          <div class="children {hasReasoning ? 'has-reasoning' : ''}">
            {#each event.inspectionEvent.children as child}
              <div class="child">
                <div
                  class="child-label {child.label ===
                  InspectionEventLabel.Reasoning
                    ? 'reasoning-label'
                    : child.label === InspectionEventLabel.Timing
                      ? 'timing-label'
                      : child.label === InspectionEventLabel.TokenUsage
                        ? 'token-usage-label'
                        : child.label === InspectionEventLabel.ToolCalls
                          ? 'tool-calls-label'
                          : child.label === InspectionEventLabel.Error
                            ? 'error-label'
                            : ''}"
                >
                  {child.label}
                </div>
                <pre class="child-data">{child.data}</pre>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </button>
  <div class="actions-container">
    {#if isEvaluable}
      <button
        class="evaluate-button"
        onclick={handleEvaluate}
        disabled={isEvaluating}
        title="Evaluate with LLM Judge"
      >
        {#if isEvaluating}
          <span class="eval-text">...</span>
        {:else}
          <span class="eval-text">eval</span>
        {/if}
      </button>
    {/if}
    <button
      class="remove-button"
      onclick={() => onRemove(event.id)}
      title="Remove inspection event"
    >
      ×
    </button>
  </div>
</div>

<style>
  .row {
    display: flex;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(214, 214, 214, 0.153);
    transition:
      background-color 0.3s ease,
      border-color 0.3s ease;
  }

  .row-content {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 10px;
    flex: 1;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    align-items: flex-start;
    transition: background 0.2s;
    border-radius: 4px;
  }

  .row-content:hover {
    background: rgba(230, 237, 243, 0.05);
  }

  .row.highlighted {
    background-color: rgba(230, 237, 243, 0.12);
    border-bottom-color: rgba(230, 237, 243, 0.35);
    border-left: 3px solid rgba(230, 237, 243, 0.5);
    padding-left: 3px;
  }

  .row.highlighted .row-content:hover {
    background: rgba(230, 237, 243, 0.08);
  }

  .row.hasError {
    background-color: rgba(248, 81, 73, 0.12);
    border-bottom-color: rgba(248, 81, 73, 0.35);
    border-left: 3px solid rgba(248, 81, 73, 0.6);
    padding-left: 3px;
  }

  .row.hasError .row-content:hover {
    background: rgba(248, 81, 73, 0.05);
  }

  .row.hasToolCalls {
    background-color: rgba(210, 168, 255, 0.12);
    border-bottom-color: rgba(210, 168, 255, 0.35);
    border-left: 3px solid rgba(210, 168, 255, 0.6);
    padding-left: 3px;
  }

  .row.hasToolCalls .row-content:hover {
    background: rgba(210, 168, 255, 0.05);
  }

  .row.highlighted.hasError {
    background-color: rgba(230, 237, 243, 0.25);
    border-bottom-color: rgba(230, 237, 243, 0.5);
    border-left: 4px solid rgba(230, 237, 243, 0.8);
    padding-left: 2px;
  }

  .row.highlighted.hasToolCalls {
    background-color: rgba(230, 237, 243, 0.25);
    border-bottom-color: rgba(230, 237, 243, 0.5);
    border-left: 4px solid rgba(230, 237, 243, 0.8);
    padding-left: 2px;
  }

  .ts {
    font-size: 12px;
    color: rgba(230, 237, 243, 0.65);
  }

  .data-container {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .expand-button {
    background: none;
    border: none;
    padding: 0;
    color: rgba(230, 237, 243, 0.65);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s;
    display: inline-block;
  }

  .arrow.expanded {
    transform: rotate(90deg);
  }

  .data {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #e6edf3;
  }

  .data.collapsed {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .data-content {
    flex: 1;
  }

  .data-with-badge {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .reasoning-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 149, 0, 0.15);
    color: #ff9500;
    border: 1px solid rgba(255, 149, 0, 0.3);
    line-height: 1;
    margin-top: 2px;
    cursor: pointer;
  }

  .timing-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(46, 160, 67, 0.15);
    color: #7ee787;
    border: 1px solid rgba(46, 160, 67, 0.3);
    line-height: 1;
    margin-top: 2px;
    cursor: pointer;
    font-family: monospace;
  }

  .token-usage-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
    border: 1px solid rgba(236, 72, 153, 0.3);
    line-height: 1;
    margin-top: 2px;
    cursor: pointer;
    font-family: monospace;
  }

  .children {
    margin-top: 8px;
    padding-left: 12px;
    border-left: 2px solid rgba(230, 237, 243, 0.3);
  }

  .children.has-reasoning {
    border-left-color: rgba(230, 237, 243, 0.3);
  }

  .child {
    margin-bottom: 12px;
  }

  .child:last-child {
    margin-bottom: 0;
  }

  .child-label {
    font-size: 11px;
    font-weight: 600;
    color: #79c0ff;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .child-label.reasoning-label {
    color: #ff9500;
  }

  .child-label.timing-label {
    color: #7ee787;
  }

  .child-label.token-usage-label {
    color: #ec4899;
  }

  .child-label.tool-calls-label {
    color: #d2a8ff;
  }

  .child-label.error-label {
    color: #f85149;
  }

  .child-data {
    margin: 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(230, 237, 243, 0.9);
    background: rgba(255, 255, 255, 0.02);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .actions-container {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    flex-shrink: 0;
  }

  .evaluate-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    cursor: pointer;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .eval-text {
    color: white;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .evaluate-button:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.7);
    background: rgba(99, 179, 237, 0.1);
  }

  .evaluate-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .remove-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(230, 237, 243, 0.65);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .remove-button:hover {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
    background: rgba(248, 81, 73, 0.1);
  }

  .remove-button:active {
    background: rgba(248, 81, 73, 0.2);
  }
</style>
