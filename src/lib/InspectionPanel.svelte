<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import CurrentContext from "./CurrentContext.svelte";
  import InspectionHeader from "./InspectionHeader.svelte";
  import InspectionStream from "./InspectionStream.svelte";
  import LatencyHeatmap from "./LatencyHeatmap.svelte";
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel, type InspectionEvent, type MaidSnapshot } from "../../protocol/types";
  import { load, save } from "../utils/persistence";
  import {
    setSnapshotContext,
    setSnapshotToolDefinitions,
    setSnapshotTokenUsage,
  } from "../utils/inspectionSnapshotState";

  let events: InspectionEventDisplay[] = $state([]);
  let status = $state<"connecting" | "connected" | "error">("connecting");
  let agentConnected = $state<boolean>(false);
  let lastError = $state<string | null>(null);
  let eventId = $state(0);
  let modelName = $state<string>("");
  let highlightedEventId = $state<number | null>(null);

  let eventSource: EventSource | null = null;
  let modelEventSource: EventSource | null = null;
  let agentStatusEventSource: EventSource | null = null;
  let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  // Calculate error rate from events (derived from persisted events)
  const errorRate = $derived.by(() => {
    // Get unique invocation IDs (each represents one invocation)
    const invocationIds = new Set<string>();
    const errorInvocationIds = new Set<string>();

    for (const e of events) {
      if (e.invocationId) {
        invocationIds.add(e.invocationId);
        
        // Check if this event has an error
        const hasError = e.inspectionEvent.children?.some(
          child => child.label === InspectionEventLabel.Error
        );
        if (hasError) {
          errorInvocationIds.add(e.invocationId);
        }
      }
    }

    const invocationCount = invocationIds.size;
    const errorCount = errorInvocationIds.size;
    
    if (invocationCount === 0) return 0;
    return Math.round((errorCount / invocationCount) * 100 * 100) / 100;
  });

  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:6969/api";

  function pushEvent(data: string) {
    let inspectionEvent: InspectionEvent;
    let displayData: string;

    try {
      const parsed = JSON.parse(data);

      // if children exists, it's a structured trace; otherwise it's a log
      if (parsed && typeof parsed === "object") {
        const invocationId = typeof parsed.invocationId === "string" ? parsed.invocationId : undefined;
        if (Array.isArray(parsed.children)) {
          // Trace event: has children
          inspectionEvent = {
            message: parsed.message || "No message",
            children: parsed.children as InspectionEvent["children"],
            invocationId,
          };
          displayData = parsed.message || "No message";
        } else if (typeof parsed.message === "string") {
          // Log event: has message
          inspectionEvent = {
            message: parsed.message,
            invocationId,
          };
          displayData = parsed.message;
        } else {
          // Fallback: treat as log event
          inspectionEvent = { message: data };
          displayData = data;
        }
      } else {
        // Not an object, treat as log event
        inspectionEvent = { message: data };
        displayData = data;
      }
    } catch {
      inspectionEvent = { message: data };
      displayData = data;
    }

    const eventData: InspectionEventDisplay = {
      id: eventId++,
      ts: Date.now(),
      data: displayData,
      expanded: false,
      inspectionEvent,
      invocationId: inspectionEvent.invocationId,
    };

    const next = [...events, eventData];
    events = next.length > 300 ? next.slice(next.length - 300) : next;
    save("events", events);
    save("eventId", eventId);
  }

  function toggleExpand(eventId: number) {
    events = events.map((e) =>
      e.id === eventId ? { ...e, expanded: !e.expanded } : e
    );
    save("events", events);
  }

  function removeEventRow(eventId: number) {
    events = events.filter((e) => e.id !== eventId);
    if (highlightedEventId === eventId) {
      highlightedEventId = null;
    }
    save("events", events);
  }

  function removeInvocationGroup(invocationId: string) {
    const removedEventIds = events
      .filter((e) => e.invocationId === invocationId)
      .map((e) => e.id);
    events = events.filter((e) => e.invocationId !== invocationId);
    if (highlightedEventId !== null && removedEventIds.includes(highlightedEventId)) {
      highlightedEventId = null;
    }
    save("events", events);
  }

  function deleteAllEvents() {
    events = [];
    eventId = 0;
    highlightedEventId = null;
    save("events", events);
    save("eventId", eventId);
  }

  function handleImport(snapshot: MaidSnapshot) {
    setSnapshotContext(snapshot.context || []);
    setSnapshotToolDefinitions(snapshot.tools || []);
    setSnapshotTokenUsage(
      snapshot.tokenUsage || { totalTokens: 0, contextLimit: null, remainingTokens: null }
    );

    const importedEvents: InspectionEventDisplay[] = snapshot.events.map((e, i) => ({
      id: eventId + i,
      ts: e.ts,
      data: e.data,
      expanded: false,
      inspectionEvent: e.inspectionEvent,
      invocationId: e.inspectionEvent.invocationId,
    }));

    eventId += importedEvents.length;
    events = importedEvents;
    modelName = snapshot.model || "";
    highlightedEventId = null;

    save("events", events);
    save("eventId", eventId);
  }

  function highlightEvent(eventIndex: number) {
    if (eventIndex >= 0 && eventIndex < events.length) {
      highlightedEventId = events[eventIndex].id;

      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }

      highlightTimeout = setTimeout(() => {
        highlightedEventId = null;
        highlightTimeout = null;
      }, 5000);
    }
  }

  onMount(() => {
    // Load persisted events and eventId
    const storedEvents = load<InspectionEventDisplay[]>("events", []);
    const storedEventId = load<number>("eventId", 0);

    if (storedEvents.length > 0) {
      const cappedEvents =
        storedEvents.length > 300
          ? storedEvents.slice(storedEvents.length - 300)
          : storedEvents;
      events = cappedEvents;

      const maxId = cappedEvents.reduce((m, e) => Math.max(m, e.id), 0);
      eventId = Math.max(storedEventId, maxId + 1);
    }

    eventSource = new EventSource(INSPECTION_URL + "/inspection/trace");

    eventSource.onopen = () => {
      status = "connected";
      lastError = null;
    };

    eventSource.onmessage = (event: MessageEvent) => {
      // Safari may not fire onopen reliably, so mark as connected on first message
      if (status === "connecting") {
        status = "connected";
        lastError = null;
      }

      const data = String(event.data ?? "");
      // Filter out the initial connection message
      try {
        const parsed = JSON.parse(data);
        if (parsed?.message === "connected") {
          return;
        }
      } catch {
        // Do nothing
      }

      pushEvent(data);
    };

    eventSource.onerror = () => {
      status = "error";
      lastError = "SSE connection error";
    };

    modelEventSource = new EventSource(INSPECTION_URL + "/inspection/model");

    modelEventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.model !== undefined) {
          modelName = data.model;
        }
      } catch (e) {
        console.error("Failed to parse model data:", e);
      }
    };

    modelEventSource.onerror = () => {
      console.error("Model SSE connection error");
    };

    agentStatusEventSource = new EventSource(
      INSPECTION_URL + "/inspection/agent-status"
    );

    agentStatusEventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.connected !== undefined) {
          agentConnected = data.connected;
        }
      } catch (e) {
        console.error("Failed to parse agent status data:", e);
      }
    };

    agentStatusEventSource.onerror = () => {
      console.error("Agent status SSE connection error");
    };
  });

  onDestroy(() => {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
    eventSource?.close();
    eventSource = null;
    modelEventSource?.close();
    modelEventSource = null;
    agentStatusEventSource?.close();
    agentStatusEventSource = null;
  });
</script>

<div id="inspection">
  <InspectionHeader
    {modelName}
    {status}
    {agentConnected}
    {events}
    {errorRate}
    onDeleteAll={deleteAllEvents}
    onImport={handleImport}
  />

  {#if lastError}
    <div class="error">{lastError}</div>
  {/if}

  <LatencyHeatmap {events} onSelectEvent={highlightEvent} />

  <InspectionStream
    {events}
    {highlightedEventId}
    onToggleExpand={toggleExpand}
    onRemove={removeEventRow}
    onRemoveGroup={removeInvocationGroup}
  />

  <CurrentContext />

  <div class="footer">
    <img src="/maid-logo.svg" alt="" class="maid-icon" />
    <a
      href="https://github.com/Graffioh/myagentisdumb"
      target="_blank"
      rel="noopener noreferrer"
      class="maid-text">my agent is dumb</a
    >
  </div>
</div>

<style>
  #inspection {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: rgb(0, 0, 0);
    color: #e6edf3;
    box-sizing: border-box;
  }

  .error {
    padding: 8px 12px;
    font-size: 12px;
    color: #ff7b72;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
  }

  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid rgba(214, 214, 214, 0.224);
    background: rgba(255, 255, 255, 0.03);
  }

  .maid-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .maid-text {
    font-size: 12px;
    font-style: italic;
    text-decoration: none;
    transition: color 0.2s;
    color: rgb(230, 237, 243);
  }

  .maid-text:hover {
    color: #ffffff;
    text-decoration: underline;
  }
</style>
