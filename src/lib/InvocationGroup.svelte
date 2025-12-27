<script lang="ts">
  import EventRow from "./EventRow.svelte";
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel } from "../../protocol/types";

  export type InvocationGroupData = {
    invocationId: string;
    events: InspectionEventDisplay[];
    firstTs: number;
    lastTs: number;
  };

  let {
    group,
    isExpanded,
    hasHighlighted,
    highlightedEventId,
    onToggle,
    onToggleExpand,
    onRemove,
    onToggleWarningMark,
  }: {
    group: InvocationGroupData;
    isExpanded: boolean;
    hasHighlighted: boolean;
    highlightedEventId: number | null;
    onToggle: () => void;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
    onToggleWarningMark: (eventId: number) => void;
  } = $props();

  function formatDuration(startTs: number, endTs: number): string {
    const ms = Math.max(0, endTs - startTs);
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function groupHasToolCalls(group: InvocationGroupData): boolean {
    return group.events.some(e =>
      e.inspectionEvent.children?.some(child => child.label === InspectionEventLabel.ToolCalls)
    );
  }
</script>

<div class="invocation-group" class:highlighted={hasHighlighted && !isExpanded}>
  <button
    class="group-header"
    type="button"
    onclick={onToggle}
  >
    <span class="group-arrow" class:expanded={isExpanded}>▶</span>
    <span class="group-id" title={group.invocationId}>
      {group.invocationId.slice(0, 8)}
    </span>
    {#if groupHasToolCalls(group)}
      <span class="tool-badge" title="Contains tool calls">T</span>
    {/if}
    <span class="group-meta">
      {group.events.length} events • {formatDuration(group.firstTs, group.lastTs)}
    </span>
    <span class="group-time">
      {new Date(group.firstTs).toLocaleTimeString()}
    </span>
  </button>
  {#if isExpanded}
    <div class="group-events">
      {#each group.events as e (e.id)}
        <EventRow
          event={e}
          highlighted={highlightedEventId === e.id}
          {onToggleExpand}
          {onRemove}
          {onToggleWarningMark}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .invocation-group {
    margin-bottom: 4px;
    border: 1px solid rgba(88, 166, 255, 0.25);
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.3s ease;
  }

  .invocation-group.highlighted {
    border-color: rgba(230, 237, 243, 0.5);
    background-color: rgba(230, 237, 243, 0.05);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: rgba(88, 166, 255, 0.08);
    border: none;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: #e6edf3;
    transition: background 0.2s;
  }

  .group-header:hover {
    background: rgba(88, 166, 255, 0.15);
  }

  .group-arrow {
    font-size: 10px;
    color: rgba(230, 237, 243, 0.65);
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .group-arrow.expanded {
    transform: rotate(90deg);
  }

  .group-id {
    font-size: 11px;
    font-family: monospace;
    color: rgba(230, 237, 243, 0.8);
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .tool-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;
    cursor: help;
    background: rgba(163, 113, 247, 0.15);
    color: #a371f7;
    border: 1px solid rgba(163, 113, 247, 0.3);
  }

  .group-meta {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    flex: 1;
  }

  .group-time {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.5);
    font-family: monospace;
  }

  .group-events {
    border-top: 1px solid rgba(88, 166, 255, 0.15);
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.15);
  }
</style>
