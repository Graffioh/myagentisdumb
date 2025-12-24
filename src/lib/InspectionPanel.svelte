<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import CurrentContext from "./CurrentContext.svelte";
  import InspectionHeader from "./InspectionHeader.svelte";
  import InspectionStream from "./InspectionStream.svelte";
  import LatencyHeatmap from "./LatencyHeatmap.svelte";
  import type { InspectionEventDisplay } from "../types";
  import type { InspectionEvent } from "../../protocol/types";
  import { load, save } from "../utils/persistence";

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

  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:6969/api";

  function pushEvent(data: string) {
    let inspectionEvent: InspectionEvent;
    let displayData: string;

    try {
      const parsed = JSON.parse(data);

      // if children exists, it's a structured trace; otherwise it's a log
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.children)) {
          // Trace event: has children
          inspectionEvent = {
            message: parsed.message || "No message",
            children: parsed.children as InspectionEvent["children"],
          };
          displayData = parsed.message || "No message";
        } else if (typeof parsed.message === "string") {
          // Log event: has message
          inspectionEvent = {
            message: parsed.message,
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
      warningMarked: false,
      inspectionEvent,
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

  function toggleWarningMark(eventId: number) {
    events = events.map((e) =>
      e.id === eventId ? { ...e, warningMarked: !e.warningMarked } : e
    );
    save("events", events);
  }

  function deleteAllEvents() {
    events = [];
    eventId = 0;
    highlightedEventId = null;
    save("events", events);
    save("eventId", eventId);
  }

  function highlightEvent(eventIndex: number) {
    if (eventIndex >= 0 && eventIndex < events.length) {
      highlightedEventId = events[eventIndex].id;
      // Clear highlight after 5 seconds
      setTimeout(() => {
        highlightedEventId = null;
      }, 5000);
    }
  }

  onMount(() => {
    // Load persisted events and eventId
    const storedEvents = load<InspectionEventDisplay[]>("events", []);
    const storedEventId = load<number>("eventId", 0);

    if (storedEvents.length > 0) {
      events = storedEvents;
      eventId = storedEventId;
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

    agentStatusEventSource = new EventSource(INSPECTION_URL + "/inspection/agent-status");

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
    onDeleteAll={deleteAllEvents}
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
    onToggleWarningMark={toggleWarningMark}
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
