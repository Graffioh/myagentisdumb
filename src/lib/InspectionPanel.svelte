<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import CurrentContext from "./CurrentContext.svelte";
  import InspectionHeader, { type LabelFilter } from "./InspectionHeader.svelte";
  import InspectionStream from "./InspectionStream.svelte";
  import LatencyHeatmap from "./LatencyHeatmap.svelte";
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel, type InspectionEvent, type MaidSnapshot } from "../../protocol/types";
  import { load, save } from "../utils/persistence";
  import { snapshot } from "../utils/snapshot.svelte";

  interface Props {
    onOpenChat?: () => void;
  }

  let { onOpenChat }: Props = $props();

  let events: InspectionEventDisplay[] = $state([]);
  let status = $state<"connecting" | "connected" | "error">("connecting");
  let agentConnected = $state<boolean>(false);
  let lastError = $state<string | null>(null);
  let eventId = $state(0);
  let modelName = $state<string>("");
  let highlightedEventId = $state<number | null>(null);
  let labelFilter = $state<LabelFilter>("all");

  let traceEventSource: EventSource | null = null;
  let modelEventSource: EventSource | null = null;
  let agentStatusEventSource: EventSource | null = null;
  let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  // Filter events based on label filter - show all events from invocation groups that contain the label
  const filteredEvents = $derived.by(() => {
    if (labelFilter === "all") return events;

    // Find all invocationIds that have at least one event with the specified label
    const matchingInvocationIds = new Set<string>();

    for (const e of events) {
      if (!e.invocationId) continue;

      const hasLabel = e.inspectionEvent.children?.some((child) => {
        if (labelFilter === "tools") {
          return child.label === InspectionEventLabel.ToolCalls;
        }
        if (labelFilter === "errors") {
          return child.label === InspectionEventLabel.Error;
        }
        return false;
      });

      if (hasLabel) {
        matchingInvocationIds.add(e.invocationId);
      }
    }

    // Return all events from invocation groups that contain the label
    return events.filter((e) => e.invocationId && matchingInvocationIds.has(e.invocationId));
  });

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
    snapshot.events = events;
  }

  function toggleExpand(eventId: number) {
    events = events.map((e) =>
      e.id === eventId ? { ...e, expanded: !e.expanded } : e
    );
    save("events", events);
    snapshot.events = events;
  }

  function removeEventRow(eventId: number) {
    events = events.filter((e) => e.id !== eventId);
    if (highlightedEventId === eventId) {
      highlightedEventId = null;
    }
    save("events", events);
    snapshot.events = events;
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
    snapshot.events = events;
  }

  function deleteAllEvents() {
    events = [];
    eventId = 0;
    highlightedEventId = null;
    save("events", events);
    save("eventId", eventId);
    snapshot.reset();
  }

  function handleImport(importedSnapshot: MaidSnapshot) {
    console.log("Importing snapshot:\n", importedSnapshot);

    const importedEvents: InspectionEventDisplay[] = importedSnapshot.events.map((e, i) => ({
      id: eventId + i,
      ts: e.ts,
      data: e.data,
      expanded: false,
      inspectionEvent: e.inspectionEvent,
      invocationId: e.inspectionEvent.invocationId,
    }));

    eventId += importedEvents.length;
    events = importedEvents;
    modelName = importedSnapshot.model || "";
    highlightedEventId = null;

    save("events", events);
    save("eventId", eventId);

    snapshot.events = events;
    snapshot.modelName = modelName;
    snapshot.context = importedSnapshot.context || [];
    snapshot.toolDefinitions = importedSnapshot.tools || [];
    snapshot.tokenUsage = importedSnapshot.tokenUsage || { totalTokens: 0, contextLimit: null, remainingTokens: null };
    snapshot.viewMode = "snapshot";
  }

  function switchToRealtime() {
    events = [];
    eventId = 0;
    modelName = "";
    highlightedEventId = null;
    save("events", events);
    save("eventId", eventId);
    snapshot.reset();
  }

  function highlightEvent(eventId: number) {
    const event = events.find(e => e.id === eventId);
    if (event) {
      highlightedEventId = event.id;

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
      snapshot.events = events;

      const maxId = cappedEvents.reduce((m, e) => Math.max(m, e.id), 0);
      eventId = Math.max(storedEventId, maxId + 1);
    }

    traceEventSource = new EventSource(INSPECTION_URL + "/inspection/trace");

    traceEventSource.onopen = () => {
      status = "connected";
      lastError = null;
    };

    traceEventSource.onmessage = (event: MessageEvent) => {
      // Safari may not fire onopen reliably, so mark as connected on first message
      if (status === "connecting") {
        status = "connected";
        lastError = null;
      }

      if (snapshot.viewMode === "snapshot") return;

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

    traceEventSource.onerror = () => {
      status = "error";
      lastError = "SSE connection error";
    };

    modelEventSource = new EventSource(INSPECTION_URL + "/inspection/model");

    modelEventSource.onmessage = (event: MessageEvent) => {
      if (snapshot.viewMode === "snapshot") return;
      try {
        const data = JSON.parse(event.data);
        if (data.model !== undefined) {
          modelName = data.model;
          snapshot.modelName = modelName;
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
    traceEventSource?.close();
    traceEventSource = null;
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
    viewMode={snapshot.viewMode}
    {labelFilter}
    onDeleteAll={deleteAllEvents}
    onImport={handleImport}
    onSwitchToRealtime={switchToRealtime}
    onLabelFilterChange={(filter) => labelFilter = filter}
  />

  {#if lastError}
    <div class="error">{lastError}</div>
  {/if}

  <LatencyHeatmap {events} filteredEvents={filteredEvents} onSelectEvent={highlightEvent} />

  <InspectionStream
    events={filteredEvents}
    {highlightedEventId}
    onToggleExpand={toggleExpand}
    onRemove={removeEventRow}
    onRemoveGroup={removeInvocationGroup}
    onSelectEvent={highlightEvent}
  />

  <CurrentContext />

  <div class="footer">
    <a
      href="https://github.com/Graffioh/myagentisdumb"
      target="_blank"
      rel="noopener noreferrer"
      class="maid-link"
    >
      <img src="/maid-logo.svg" alt="my agent is dumb" class="maid-icon" />
    </a>
    {#if onOpenChat}
      <button
        class="chat-button"
        onclick={onOpenChat}
        aria-label="Open chat window"
      >
        <img src="/chat-bubble.svg" alt="Chat" class="chat-icon" />
      </button>
    {/if}
  </div>
</div>

<style>
  #inspection {
    height: 100%;
    display: flex;
    flex-direction: column;
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
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid rgba(214, 214, 214, 0.224);
    background: rgba(255, 255, 255, 0.03);
  }

  .maid-link {
    display: flex;
    align-items: center;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .maid-link:hover {
    opacity: 1;
  }

  .maid-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .chat-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    cursor: pointer;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .chat-button:hover {
    background: rgba(45, 45, 45, 0.892);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .chat-button:hover .chat-icon {
    opacity: 1;
  }

  .chat-icon {
    width: 16px;
    height: 16px;
    opacity: 0.65;
    transition: opacity 0.2s;
  }
</style>
