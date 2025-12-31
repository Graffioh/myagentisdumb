<script lang="ts">
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel } from "../../protocol/types";
  import { formatLatency } from "../utils/latency";

  interface Props {
    events: InspectionEventDisplay[];
    onSelectEvent?: (eventId: number) => void;
  }

  let { events, onSelectEvent }: Props = $props();

  type TimelineItem = {
    id: number;
    eventId: number;
    type: "llm" | "tool" | "error";
    name: string;
    startTime: number;
    duration: number;
    invocationId?: string;
    lane: number;
  };

  interface TimelineData {
    llmItems: TimelineItem[];
    toolItems: TimelineItem[];
    errorItems: TimelineItem[];
    llmLaneCount: number;
    toolLaneCount: number;
    errorLaneCount: number;
    minTime: number;
    maxTime: number;
  }

  type ChildEvent = NonNullable<InspectionEventDisplay["inspectionEvent"]["children"]>[number];

  function truncate(text: string, max = 50): string {
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
  }

  function getToolName(obj: unknown): string | null {
    if (!obj || typeof obj !== "object") return null;
    const o = obj as { function?: { name?: string }; name?: string };
    return o.function?.name ?? o.name ?? null;
  }

  function assignLanes(items: Omit<TimelineItem, 'lane'>[]): TimelineItem[] {
    const result: TimelineItem[] = [];
    const lanes: { endTime: number }[] = [];

    for (const item of items) {
      let assignedLane = -1;
      let minEndTime = Infinity;

      for (let l = 0; l < lanes.length; l++) {
        if (item.startTime >= lanes[l].endTime) {
          if (lanes[l].endTime < minEndTime) {
            minEndTime = lanes[l].endTime;
            assignedLane = l;
          }
        }
      }

      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push({ endTime: item.startTime + item.duration });
      } else {
        lanes[assignedLane].endTime = item.startTime + item.duration;
      }

      result.push({ ...item, lane: assignedLane });
    }

    return result;
  }

  const timelineData: TimelineData = $derived.by(() => {
    const items: Omit<TimelineItem, 'lane'>[] = [];
    let minTime = Infinity;
    let maxTime = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const children = event.inspectionEvent.children;
      if (!children) continue;

      let timingChild: ChildEvent | undefined;
      let toolChild: ChildEvent | undefined;
      let contentChild: ChildEvent | undefined;
      let reasoningChild: ChildEvent | undefined;
      let errorChild: ChildEvent | undefined;

      for (const c of children) {
        switch (c.label) {
          case InspectionEventLabel.Timing:
            timingChild ??= c;
            break;
          case InspectionEventLabel.ToolCalls:
            toolChild ??= c;
            break;
          case InspectionEventLabel.Content:
            contentChild ??= c;
            break;
          case InspectionEventLabel.Reasoning:
            reasoningChild ??= c;
            break;
          case InspectionEventLabel.Error:
            errorChild ??= c;
            break;
        }
      }

      let duration = 0;
      if (timingChild) {
        const match = timingChild.data.match(/(\d+(?:\.\d+)?)\s*(ms|s)/i);
        if (match) {
          duration = parseFloat(match[1]);
          if (match[2].toLowerCase() === 's') duration *= 1000;
        }
      }

      if (duration === 0 && i < events.length - 1) {
        const nextTs = events[i + 1].ts;
        duration = Math.max(nextTs - event.ts, 100);
      } else if (duration === 0) {
        duration = 200;
      }

      if (toolChild) {
        try {
          const parsed: unknown = JSON.parse(toolChild.data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const t of parsed) {
              const toolName = getToolName(t) ?? "tool";
              items.push({
                id: items.length,
                eventId: event.id,
                type: "tool" as const,
                name: toolName,
                startTime: event.ts,
                duration,
                invocationId: event.invocationId,
              });
            }
          } else {
            const toolName = getToolName(parsed) ?? "tool";
            items.push({
              id: items.length,
              eventId: event.id,
              type: "tool" as const,
              name: toolName,
              startTime: event.ts,
              duration,
              invocationId: event.invocationId,
            });
          }
        } catch {
          const patterns = [
            /"name"\s*:\s*"([^"]+)"/,
            /"function"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/,
          ];
          for (const pattern of patterns) {
            const match = toolChild.data.match(pattern);
            if (match) {
              items.push({
                id: items.length,
                eventId: event.id,
                type: "tool" as const,
                name: match[1],
                startTime: event.ts,
                duration,
                invocationId: event.invocationId,
              });
              break;
            }
          }
        }
      } else if (contentChild || reasoningChild) {
        items.push({
          id: items.length,
          eventId: event.id,
          type: "llm" as const,
          name: truncate(event.inspectionEvent.message),
          startTime: event.ts,
          duration,
          invocationId: event.invocationId,
        });
      }

      if (errorChild) {
        items.push({
          id: items.length,
          eventId: event.id,
          type: "error" as const,
          name: truncate(errorChild.data),
          startTime: event.ts,
          duration,
          invocationId: event.invocationId,
        });
      }

      const end = event.ts + duration;
      if (event.ts < minTime) minTime = event.ts;
      if (end > maxTime) maxTime = end;
    }

    const llmItems = assignLanes(items.filter(i => i.type === "llm").sort((a, b) => a.startTime - b.startTime));
    const toolItems = assignLanes(items.filter(i => i.type === "tool").sort((a, b) => a.startTime - b.startTime));
    const errorItems = assignLanes(items.filter(i => i.type === "error").sort((a, b) => a.startTime - b.startTime));
    const llmLaneCount = llmItems.length > 0 ? Math.max(...llmItems.map(i => i.lane)) + 1 : 1;
    const toolLaneCount = toolItems.length > 0 ? Math.max(...toolItems.map(i => i.lane)) + 1 : 1;
    const errorLaneCount = errorItems.length > 0 ? Math.max(...errorItems.map(i => i.lane)) + 1 : 1;

    const hasItems = items.length > 0;

    return {
      llmItems, 
      toolItems,
      errorItems,
      llmLaneCount, 
      toolLaneCount,
      errorLaneCount,
      minTime: hasItems ? minTime : 0, 
      maxTime: hasItems ? maxTime : 0 
    };
  });

  const totalDuration = $derived(timelineData.maxTime - timelineData.minTime);
  const minWidthPerMs = 0.15;
  const trackWidth = $derived(Math.max(totalDuration * minWidthPerMs, 100));

  const timeMarkers = $derived.by(() => {
    if (totalDuration === 0) return [0];
    const markers: number[] = [];
    const minLabelSpacing = 60;
    const availableWidth = trackWidth;
    const MAX_LABELS = 100;
    const maxLabels = Math.min(MAX_LABELS, Math.floor(availableWidth / minLabelSpacing) || 1);
    const idealInterval = totalDuration / maxLabels;
    
    const niceIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000];
    let interval = niceIntervals.find(i => i >= idealInterval) || idealInterval;
    
    for (let t = 0; t <= totalDuration; t += interval) {
      markers.push(t);
    }
    const lastMarker = markers[markers.length - 1];
    if (totalDuration - lastMarker > interval * 0.3) {
      markers.push(totalDuration);
    }
    return markers;
  });

  function getBarStyle(item: TimelineItem, laneCount: number): string {
    if (totalDuration === 0) return "left: 0px; width: 60px; top: 0; height: 100%;";
    const left = (item.startTime - timelineData.minTime) * minWidthPerMs;
    const width = Math.max(item.duration * minWidthPerMs, 50);
    const laneGap = 2;
    const laneHeight = (100 - (laneCount - 1) * laneGap) / laneCount;
    const top = item.lane * (laneHeight + laneGap);
    return `left: ${left}px; width: ${width}px; top: ${top}%; height: ${laneHeight}%;`;
  }

  let selectedId = $state<number | null>(null);
  let hoveredId = $state<number | null>(null);
  let llmBarsContainer = $state<HTMLDivElement | undefined>(undefined);
  let toolBarsContainer = $state<HTMLDivElement | undefined>(undefined);

  function syncScroll(source: HTMLDivElement, targets: HTMLDivElement[]) {
    const left = source.scrollLeft;
    for (const target of targets) {
      if (target.scrollLeft !== left) {
        target.scrollLeft = left;
      }
    }
  }

  function handleScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    const targets: HTMLDivElement[] = [];
    if (llmBarsContainer && target !== llmBarsContainer) targets.push(llmBarsContainer);
    if (toolBarsContainer && target !== toolBarsContainer) targets.push(toolBarsContainer);
    if (targets.length > 0) {
      syncScroll(target, targets);
    }
  }

  function handleSelect(item: TimelineItem) {
    selectedId = item.id;
    onSelectEvent?.(item.eventId);
  }
</script>

{#if timelineData.llmItems.length + timelineData.toolItems.length + timelineData.errorItems.length === 0}
  <div class="timeline-empty">No timeline data</div>
{:else}
  {@const totalItems = timelineData.llmItems.length + timelineData.toolItems.length + timelineData.errorItems.length}
  <section class="timeline-container" aria-label="Timeline view">
    <div class="timeline-header">
      <span class="timeline-title">Timeline</span>
      <span class="timeline-stats">
        {totalItems} items • Duration: {formatLatency(totalDuration)}
      </span>
    </div>
    
    <div class="timeline-legend">
      <span class="legend-item">
        <span class="legend-color llm"></span>
        <span>LLM</span>
      </span>
      <span class="legend-item">
        <span class="legend-color tool"></span>
        <span>Tool</span>
      </span>
      <span class="legend-item">
        <span class="legend-color error"></span>
        <span>Error</span>
      </span>
    </div>

    <div class="timeline-scroll-container">
      <div class="timeline-tracks" style="width: {trackWidth + 58}px;">
        <div class="timeline-track">
          <div class="track-label">LLM</div>
          <div
            class="track-bars"
            bind:this={llmBarsContainer}
            style="height: {Math.max(28, timelineData.llmLaneCount * 24)}px; min-width: {trackWidth}px;"
          >
            {#each timelineData.llmItems as item (item.id)}
              <button
                type="button"
                class="timeline-bar llm"
                class:selected={selectedId === item.id}
                class:hovered={hoveredId === item.id}
                style={getBarStyle(item, timelineData.llmLaneCount)}
                title="{item.name}: {formatLatency(item.duration)}"
                onmouseenter={() => hoveredId = item.id}
                onmouseleave={() => hoveredId = null}
                onclick={() => handleSelect(item)}
              >
                <span class="bar-label">{item.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="timeline-track">
          <div class="track-label">Tools</div>
          <div
            class="track-bars"
            bind:this={toolBarsContainer}
            style="height: {Math.max(28, timelineData.toolLaneCount * 24)}px; min-width: {trackWidth}px;"
          >
            {#each timelineData.toolItems as item (item.id)}
              <button
                type="button"
                class="timeline-bar tool"
                class:selected={selectedId === item.id}
                class:hovered={hoveredId === item.id}
                style={getBarStyle(item, timelineData.toolLaneCount)}
                title="{item.name}: {formatLatency(item.duration)}"
                onmouseenter={() => hoveredId = item.id}
                onmouseleave={() => hoveredId = null}
                onclick={() => handleSelect(item)}
              >
                <span class="bar-label">{item.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="timeline-track">
          <div class="track-label">Errors</div>
          <div
            class="track-bars"
            style="height: {Math.max(28, timelineData.errorLaneCount * 24)}px; min-width: {trackWidth}px;"
          >
            {#each timelineData.errorItems as item (item.id)}
              <button
                type="button"
                class="timeline-bar error"
                class:selected={selectedId === item.id}
                class:hovered={hoveredId === item.id}
                style={getBarStyle(item, timelineData.errorLaneCount)}
                title="{item.name}: {formatLatency(item.duration)}"
                onmouseenter={() => hoveredId = item.id}
                onmouseleave={() => hoveredId = null}
                onclick={() => handleSelect(item)}
              >
                <span class="bar-label">{item.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="timeline-axis" style="min-width: {trackWidth}px; margin-left: 58px;">
          {#each timeMarkers as marker}
            <span style="left: {marker * minWidthPerMs}px;">{formatLatency(marker)}</span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .timeline-container {
    padding: 12px;
  }

  .timeline-empty {
    padding: 8px;
    color: rgba(230, 237, 243, 0.5);
    font-size: 11px;
    text-align: center;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .timeline-title {
    font-size: 12px;
    font-weight: 600;
    color: #e6edf3;
  }

  .timeline-stats {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    font-family: monospace;
  }

  .timeline-legend {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 10px;
    color: rgba(230, 237, 243, 0.7);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-color.llm {
    background: rgba(99, 179, 237, 0.7);
  }

  .legend-color.tool {
    background: rgba(192, 132, 252, 0.7);
  }

  .legend-color.error {
    background: rgba(248, 113, 113, 0.7);
  }

  .timeline-scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    margin-bottom: 8px;
  }

  .timeline-tracks {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-track {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .track-label {
    width: 50px;
    font-size: 10px;
    color: rgba(230, 237, 243, 0.6);
    text-align: right;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .track-bars {
    position: relative;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
  }

  .timeline-bar {
    position: absolute;
    border: none;
    border-radius: 3px;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 0 4px;
    font: inherit;
  }

  .timeline-bar.llm {
    background: rgba(99, 179, 237, 0.6);
    border: 1px solid rgba(99, 179, 237, 0.8);
  }

  .timeline-bar.tool {
    background: rgba(192, 132, 252, 0.6);
    border: 1px solid rgba(192, 132, 252, 0.8);
  }

  .timeline-bar.error {
    background: rgba(248, 113, 113, 0.6);
    border: 1px solid rgba(248, 113, 113, 0.8);
  }

  .timeline-bar:hover,
  .timeline-bar.hovered {
    z-index: 10;
    transform: scaleY(1.15);
  }

  .timeline-bar.llm:hover,
  .timeline-bar.llm.hovered {
    background: rgba(99, 179, 237, 0.85);
  }

  .timeline-bar.tool:hover,
  .timeline-bar.tool.hovered {
    background: rgba(192, 132, 252, 0.85);
  }

  .timeline-bar.error:hover,
  .timeline-bar.error.hovered {
    background: rgba(248, 113, 113, 0.85);
  }

  .timeline-bar.selected {
    z-index: 11;
  }

  .timeline-bar.llm.selected {
    box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.9);
  }

  .timeline-bar.tool.selected {
    box-shadow: 0 0 0 2px rgba(192, 132, 252, 0.9);
  }

  .timeline-bar.error.selected {
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.9);
  }

  .bar-label {
    font-size: 9px;
    font-weight: 600;
    font-family: monospace;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.9;
  }

  .timeline-axis {
    position: relative;
    height: 18px;
    font-size: 9px;
    color: rgba(230, 237, 243, 0.5);
    font-family: monospace;
    margin-top: 4px;
  }

  .timeline-axis span {
    position: absolute;
    transform: translateX(-50%);
    white-space: nowrap;
    padding: 2px 0;
  }
</style>
