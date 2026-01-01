<script lang="ts">
  import EventRow from "./EventRow.svelte";
  import TimelineView from "./TimelineView.svelte";
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
    onRemoveGroup,
    onSelectEvent,
  }: {
    group: InvocationGroupData;
    isExpanded: boolean;
    hasHighlighted: boolean;
    highlightedEventId: number | null;
    onToggle: () => void;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
    onRemoveGroup: (invocationId: string) => void;
    onSelectEvent?: (eventId: number) => void;
  } = $props();

  let showTimeline = $state(false);

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

  function groupHasError(group: InvocationGroupData): boolean {
    return group.events.some(e =>
      e.inspectionEvent.children?.some(child => child.label === InspectionEventLabel.Error)
    );
  }

  function toggleTimeline(e: Event) {
    e.stopPropagation();
    showTimeline = !showTimeline;
  }

  function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  }

  function getEventDuration(event: InspectionEventDisplay, index: number): number {
    const children = event.inspectionEvent.children;
    if (!children) return 200;
    const timingChild = children.find(c => c.label === InspectionEventLabel.Timing);
    if (timingChild) {
      const match = timingChild.data.match(/(\d+(?:\.\d+)?)\s*(ms|s)/i);
      if (match) {
        let duration = parseFloat(match[1]);
        if (match[2].toLowerCase() === 's') duration *= 1000;
        return duration;
      }
    }
    if (index < group.events.length - 1) {
      return Math.max(group.events[index + 1].ts - event.ts, 100);
    }
    return 200;
  }

  const latencyPercentiles = $derived.by(() => {
    const durations = group.events.map((e, i) => getEventDuration(e, i)).sort((a, b) => a - b);
    return {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
    };
  });
</script>

<div class="invocation-group" class:highlighted={hasHighlighted && !isExpanded}>
  <div class="group-header">
    <button
      class="group-toggle"
      type="button"
      onclick={onToggle}
    >
      <span class="group-time">
        {new Date(group.firstTs).toLocaleTimeString()}
      </span>
      <span class="group-arrow" class:expanded={isExpanded}>▶</span>
      <span class="group-id" title={group.invocationId}>
        {group.invocationId.slice(0, 8)}
      </span>
      {#if groupHasToolCalls(group)}
        <span class="tool-badge" title="Contains tool calls">T</span>
      {/if}
      {#if groupHasError(group)}
        <span class="error-badge" title="Error occurred">Error</span>
      {/if}
      <span class="group-meta">
        {group.events.length} events • {formatDuration(group.firstTs, group.lastTs)}
      </span>
    </button>
    <div class="group-actions">
      <button
        class="action-button"
        class:active={showTimeline}
        onclick={toggleTimeline}
        title="Show timeline"
      >
        <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
          <rect x="2" y="1" width="8" height="2" rx="1" fill="currentColor"/>
          <rect x="5" y="5" width="7" height="2" rx="1" fill="currentColor"/>
          <rect x="1" y="9" width="5" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>
      <button
        class="remove-button"
        onclick={() => onRemoveGroup(group.invocationId)}
        title="Remove invocation group"
      >
        ×
      </button>
    </div>
  </div>
  {#if showTimeline}
    <div class="group-timeline">
      <TimelineView events={group.events} onSelectEvent={onSelectEvent} latencyPercentiles={latencyPercentiles} />
    </div>
  {/if}
  {#if isExpanded}
    <div class="group-events">
      {#each group.events as e (e.id)}
        <EventRow
          event={e}
          highlighted={highlightedEventId === e.id}
          {onToggleExpand}
          {onRemove}
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
    background: rgba(88, 166, 255, 0.08);
    transition: background 0.2s;
  }

  .group-header:hover {
    background: rgba(88, 166, 255, 0.15);
  }

  .group-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: #e6edf3;
  }

  .group-time {
    font-size: 12px;
    color: rgba(230, 237, 243, 0.65);
    font-family: monospace;
    flex-shrink: 0;
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
    cursor: pointer;
    background: rgba(163, 113, 247, 0.15);
    color: #a371f7;
    border: 1px solid rgba(163, 113, 247, 0.3);
  }

  .error-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;
    cursor: pointer;
    background: rgba(248, 81, 73, 0.15);
    color: #ff7b72;
    border: 1px solid rgba(248, 81, 73, 0.4);
  }

  .group-meta {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    flex: 1;
  }

  .group-events {
    border-top: 1px solid rgba(88, 166, 255, 0.15);
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.15);
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

  .group-actions {
    display: flex;
    gap: 4px;
    margin-right: 8px;
  }

  .action-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(230, 237, 243, 0.65);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    width: 24px;
    height: 24px;
  }

  .action-button:hover {
    border-color: rgba(99, 179, 237, 0.7);
    color: #63b3ed;
    background: rgba(99, 179, 237, 0.1);
  }

  .action-button.active {
    border-color: rgba(99, 179, 237, 0.8);
    color: #63b3ed;
    background: rgba(99, 179, 237, 0.15);
  }

  .group-timeline {
    border-top: 1px solid rgba(88, 166, 255, 0.15);
    background: rgba(0, 0, 0, 0.2);
  }
</style>
