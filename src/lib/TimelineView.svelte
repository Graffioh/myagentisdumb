<script lang="ts">
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel } from "../../protocol/types";
  import { formatLatency } from "../utils/latency";

  const TRUNCATE_MAX = 50;
  const MIN_EVENT_GAP_MS = 100;
  const LAST_EVENT_MIN_DURATION_MS = 200;
  const LANE_HEIGHT_PX = 24;
  const MIN_TRACK_HEIGHT_PX = 28;
  const TRACK_LABEL_WIDTH_PX = 50;
  const TIME_LABEL_MIN_SPACING_PX = 60;
  const MAX_TIME_LABELS = 100;
  const MIN_BAR_WIDTH_PX = 50;
  const BASE_WIDTH_PER_MS = 0.15;
  const MIN_ZOOM = 0.01;
  const MAX_ZOOM = 10.0;
  const ZOOM_SENSITIVITY = 0.001;

  interface Props {
    events: InspectionEventDisplay[];
    onSelectEvent?: (eventId: number) => void;
    latencyPercentiles?: { p50: number; p95: number; p99: number };
    zoomLevel?: number;
    onZoomChange?: (zoom: number) => void;
  }

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

  let { events, onSelectEvent, latencyPercentiles, zoomLevel = 1.0, onZoomChange }: Props = $props();

  function truncate(text: string, max = TRUNCATE_MAX): string {
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
  }

  function parseDuration(child: ChildEvent | undefined, fallbackMs: number): number {
    if (!child) return fallbackMs;
    const match = child.data.match(/(\d+(?:\.\d+)?)\s*(ms|s)/i);
    if (!match) return fallbackMs;
    let duration = parseFloat(match[1]);
    if (match[2].toLowerCase() === "s") duration *= 1000;
    return duration || fallbackMs;
  }

  function getToolName(obj: unknown): string | null {
    if (!obj || typeof obj !== "object") return null;
    const o = obj as { function?: { name?: string }; name?: string };
    return o.function?.name ?? o.name ?? null;
  }

  function assignLanes(items: Omit<TimelineItem, "lane">[]): TimelineItem[] {
    const result: TimelineItem[] = [];
    const lanes: { endTime: number }[] = [];

    for (const item of items) {
      let assignedLane = -1;
      let minEndTime = Infinity;

      for (let l = 0; l < lanes.length; l++) {
        if (item.startTime >= lanes[l].endTime && lanes[l].endTime < minEndTime) {
          minEndTime = lanes[l].endTime;
          assignedLane = l;
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

  function extractChildren(children: ChildEvent[]): {
    timingChild?: ChildEvent;
    toolChild?: ChildEvent;
    contentChild?: ChildEvent;
    reasoningChild?: ChildEvent;
    errorChild?: ChildEvent;
  } {
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

    return { timingChild, toolChild, contentChild, reasoningChild, errorChild };
  }

  function parseToolItems(
    toolChild: ChildEvent,
    baseItem: Omit<TimelineItem, "lane" | "name" | "type" | "id">,
    nextId: () => number
  ): Omit<TimelineItem, "lane">[] {
    const items: Omit<TimelineItem, "lane">[] = [];

    try {
      const parsed: unknown = JSON.parse(toolChild.data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const t of parsed) {
          items.push({
            ...baseItem,
            id: nextId(),
            type: "tool",
            name: getToolName(t) ?? "tool",
          });
        }
      } else {
        items.push({
          ...baseItem,
          id: nextId(),
          type: "tool",
          name: getToolName(parsed) ?? "tool",
        });
      }
    } catch {
      const patterns = [/"name"\s*:\s*"([^"]+)"/, /"function"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/];
      for (const pattern of patterns) {
        const match = toolChild.data.match(pattern);
        if (match) {
          items.push({
            ...baseItem,
            id: nextId(),
            type: "tool",
            name: match[1],
          });
          break;
        }
      }
    }

    return items;
  }

  function buildTimelineItems(events: InspectionEventDisplay[]): {
    items: Omit<TimelineItem, "lane">[];
    minTime: number;
    maxTime: number;
  } {
    const items: Omit<TimelineItem, "lane">[] = [];
    let minTime = Infinity;
    let maxTime = 0;
    let itemIdCounter = 0;

    const nextId = () => itemIdCounter++;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const children = event.inspectionEvent.children;
      if (!children) continue;

      const { timingChild, toolChild, contentChild, reasoningChild, errorChild } = extractChildren(children);

      const fallbackDuration =
        i < events.length - 1
          ? Math.max(events[i + 1].ts - event.ts, MIN_EVENT_GAP_MS)
          : LAST_EVENT_MIN_DURATION_MS;

      const duration = parseDuration(timingChild, fallbackDuration);

      const baseItem = {
        eventId: event.id,
        startTime: event.ts,
        duration,
        invocationId: event.invocationId,
      };

      if (toolChild) {
        items.push(...parseToolItems(toolChild, baseItem, nextId));
      } else if (contentChild || reasoningChild) {
        items.push({
          ...baseItem,
          id: nextId(),
          type: "llm",
          name: truncate(event.inspectionEvent.message),
        });
      }

      if (errorChild) {
        items.push({
          ...baseItem,
          id: nextId(),
          type: "error",
          name: truncate(errorChild.data),
        });
      }

      const end = event.ts + duration;
      if (event.ts < minTime) minTime = event.ts;
      if (end > maxTime) maxTime = end;
    }

    return { items, minTime, maxTime };
  }

  const timelineData: TimelineData = $derived.by(() => {
    const { items, minTime, maxTime } = buildTimelineItems(events);

    const llmItems = assignLanes(
      items.filter((i) => i.type === "llm").sort((a, b) => a.startTime - b.startTime)
    );
    const toolItems = assignLanes(
      items.filter((i) => i.type === "tool").sort((a, b) => a.startTime - b.startTime)
    );
    const errorItems = assignLanes(
      items.filter((i) => i.type === "error").sort((a, b) => a.startTime - b.startTime)
    );

    const llmLaneCount = llmItems.length > 0 ? Math.max(...llmItems.map((i) => i.lane)) + 1 : 1;
    const toolLaneCount = toolItems.length > 0 ? Math.max(...toolItems.map((i) => i.lane)) + 1 : 1;
    const errorLaneCount = errorItems.length > 0 ? Math.max(...errorItems.map((i) => i.lane)) + 1 : 1;

    const hasItems = items.length > 0;

    return {
      llmItems,
      toolItems,
      errorItems,
      llmLaneCount,
      toolLaneCount,
      errorLaneCount,
      minTime: hasItems ? minTime : 0,
      maxTime: hasItems ? maxTime : 0,
    };
  });

  const totalDuration = $derived(timelineData.maxTime - timelineData.minTime);
  const minWidthPerMs = $derived(BASE_WIDTH_PER_MS * zoomLevel);
  const trackWidth = $derived(Math.max(totalDuration * minWidthPerMs, 100));
  const axisMarginLeft = TRACK_LABEL_WIDTH_PX + 8;

  const timeMarkers = $derived.by(() => {
    if (totalDuration === 0) return [0];
    const markers: number[] = [];
    const availableWidth = trackWidth;
    const maxLabels = Math.min(MAX_TIME_LABELS, Math.floor(availableWidth / TIME_LABEL_MIN_SPACING_PX) || 1);
    const idealInterval = totalDuration / maxLabels;

    const niceIntervals = [100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000];
    const interval = niceIntervals.find((i) => i >= idealInterval) || idealInterval;

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
    const width = Math.max(item.duration * minWidthPerMs, MIN_BAR_WIDTH_PX);
    const laneGap = 2;
    const laneHeight = (100 - (laneCount - 1) * laneGap) / laneCount;
    const top = item.lane * (laneHeight + laneGap);
    return `left: ${left}px; width: ${width}px; top: ${top}%; height: ${laneHeight}%;`;
  }

  function getTrackHeight(laneCount: number): number {
    return Math.max(MIN_TRACK_HEIGHT_PX, laneCount * LANE_HEIGHT_PX);
  }

  let selectedId = $state<number | null>(null);
  let hoveredId = $state<number | null>(null);

  function handleSelect(item: TimelineItem) {
    selectedId = item.id;
    onSelectEvent?.(item.eventId);
  }

  function handleHover(id: number | null) {
    hoveredId = id;
  }

  let scrollContainer = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let isDraggable = $state(false);
  let dragStartX = 0;
  let dragScrollLeft = 0;

  function setZoom(next: number) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    onZoomChange?.(zoom);
  }

  function handleWheel(e: WheelEvent) {
    if (!scrollContainer) return;

    e.preventDefault();

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = zoomLevel + delta;

    if (newZoom === zoomLevel) return;

    const rect = scrollContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const scrollLeft = scrollContainer.scrollLeft;
    const timeAtMouse = (scrollLeft + mouseX) / minWidthPerMs + timelineData.minTime;

    const newMinWidthPerMs = BASE_WIDTH_PER_MS * Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    const newScrollLeft = timeAtMouse * newMinWidthPerMs - timelineData.minTime * newMinWidthPerMs - mouseX;

    setZoom(newZoom);

    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
      }
    });
  }

  function handleMouseDown(e: MouseEvent) {
    if (!scrollContainer || e.button !== 0) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragScrollLeft = scrollContainer.scrollLeft;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !scrollContainer) return;

    e.preventDefault();

    const deltaX = e.clientX - dragStartX;
    scrollContainer.scrollLeft = dragScrollLeft - deltaX;
  }

  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  $effect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  $effect(() => {
    const checkDraggable = () => {
      isDraggable = scrollContainer ? scrollContainer.scrollWidth > scrollContainer.clientWidth : false;
    };
    checkDraggable();
    if (!scrollContainer) return;
    const observer = new ResizeObserver(checkDraggable);
    observer.observe(scrollContainer);
    return () => observer.disconnect();
  });

  $effect(() => {
    void zoomLevel;
    void trackWidth;
    requestAnimationFrame(() => {
      isDraggable = scrollContainer ? scrollContainer.scrollWidth > scrollContainer.clientWidth : false;
    });
  });
</script>

{#snippet timelineBar(item: TimelineItem, laneCount: number, typeClass: string)}
  <button
    type="button"
    class="timeline-bar {typeClass}"
    class:selected={selectedId === item.id}
    class:hovered={hoveredId === item.id}
    style={getBarStyle(item, laneCount)}
    title="{item.name}: {formatLatency(item.duration)}"
    aria-pressed={selectedId === item.id}
    aria-label="{item.type.toUpperCase()} {item.name}, duration {formatLatency(item.duration)}"
    onmouseenter={() => handleHover(item.id)}
    onmouseleave={() => handleHover(null)}
    onfocus={() => handleHover(item.id)}
    onblur={() => handleHover(null)}
    onclick={() => handleSelect(item)}
  >
    <span class="bar-label">{item.name}</span>
  </button>
{/snippet}

{#if timelineData.llmItems.length + timelineData.toolItems.length + timelineData.errorItems.length === 0}
  <div class="timeline-empty">No timeline data</div>
{:else}
  {@const totalItems = timelineData.llmItems.length + timelineData.toolItems.length + timelineData.errorItems.length}
  <section
    class="timeline-container"
    aria-label="Agent telemetry timeline"
    aria-describedby="timeline-hint"
  >
    <div class="timeline-header">
      <span class="timeline-title" id="timeline-title">Timeline</span>
      <span class="timeline-stats">
        <span>{totalItems} items</span>
        {#if latencyPercentiles}
          <span class="percentiles">
            • p50: {formatLatency(latencyPercentiles.p50)} | p95: {formatLatency(latencyPercentiles.p95)} | p99: {formatLatency(latencyPercentiles.p99)}
          </span>
        {/if}
      </span>
    </div>
    <div class="timeline-hint" id="timeline-hint">Scroll to zoom • Drag to pan</div>

    <div class="timeline-legend" aria-hidden="true">
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

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="timeline-scroll-container"
      class:dragging={isDragging}
      class:draggable={isDraggable}
      bind:this={scrollContainer}
      onwheel={handleWheel}
      onmousedown={handleMouseDown}
      role="application"
      aria-label="Zoomable and pannable timeline area"
    >
      <div class="timeline-tracks" style="width: {trackWidth + axisMarginLeft}px;">
        <div class="timeline-track" role="group" aria-label="LLM events">
          <div class="track-label">LLM</div>
          <div class="track-bars" style="height: {getTrackHeight(timelineData.llmLaneCount)}px; min-width: {trackWidth}px;">
            {#each timelineData.llmItems as item (item.id)}
              {@render timelineBar(item, timelineData.llmLaneCount, "llm")}
            {/each}
          </div>
        </div>

        <div class="timeline-track" role="group" aria-label="Tool events">
          <div class="track-label">Tools</div>
          <div class="track-bars" style="height: {getTrackHeight(timelineData.toolLaneCount)}px; min-width: {trackWidth}px;">
            {#each timelineData.toolItems as item (item.id)}
              {@render timelineBar(item, timelineData.toolLaneCount, "tool")}
            {/each}
          </div>
        </div>

        <div class="timeline-track" role="group" aria-label="Error events">
          <div class="track-label">Errors</div>
          <div class="track-bars" style="height: {getTrackHeight(timelineData.errorLaneCount)}px; min-width: {trackWidth}px;">
            {#each timelineData.errorItems as item (item.id)}
              {@render timelineBar(item, timelineData.errorLaneCount, "error")}
            {/each}
          </div>
        </div>

        <div class="timeline-axis" style="min-width: {trackWidth}px; margin-left: {axisMarginLeft}px;" aria-hidden="true">
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
    --track-label-width: 50px;
    --track-gap: 8px;
    --lane-height: 24px;
    --min-track-height: 28px;
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

  .timeline-hint {
    font-size: 10px;
    color: rgba(230, 237, 243, 0.4);
    margin-bottom: 10px;
  }

  .timeline-stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    font-family: monospace;
  }

  .percentiles {
    color: rgba(230, 237, 243, 0.5);
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

  .timeline-scroll-container.draggable {
    cursor: grab;
  }

  .timeline-scroll-container.dragging {
    cursor: grabbing;
    user-select: none;
  }

  .timeline-tracks {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-track {
    display: flex;
    align-items: stretch;
    gap: var(--track-gap);
  }

  .track-label {
    width: var(--track-label-width);
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

  .timeline-bar:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 1px;
    z-index: 12;
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
