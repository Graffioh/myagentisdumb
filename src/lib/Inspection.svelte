<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import DownloadSnapshot from "./DownloadSnapshot.svelte";
  import CurrentContext from "./CurrentContext.svelte";
  import EventRow from "./EventRow.svelte";
  import type { InspectionEvent } from "../../reporter/types";

  let events: InspectionEvent[] = $state([]);
  let status = $state<"connecting" | "connected" | "error">("connecting");
  let lastError = $state<string | null>(null);
  let eventId = $state(0);

  let eventSource: EventSource | null = null;

  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:3003/api";

  function pushEvent(data: string) {
    const next = [
      ...events,
      { id: eventId++, ts: Date.now(), data, expanded: false },
    ];
    events = next.length > 300 ? next.slice(next.length - 300) : next;
  }

  function toggleExpand(eventId: number) {
    events = events.map((e) =>
      e.id === eventId ? { ...e, expanded: !e.expanded } : e
    );
  }

  function removeEventRow(eventId: number) {
    events = events.filter((e) => e.id !== eventId);
  }

  onMount(() => {
    eventSource = new EventSource(INSPECTION_URL + "/inspection/messages");

    eventSource.onopen = () => {
      status = "connected";
      lastError = null;
    };

    eventSource.onmessage = (event: MessageEvent) => {
      pushEvent(String(event.data ?? ""));
    };

    eventSource.onerror = () => {
      status = "error";
      lastError = "SSE connection error";
    };
  });

  onDestroy(() => {
    eventSource?.close();
    eventSource = null;
  });
</script>

<div id="inspection">
  <div class="header">
    <div class="title-section">
      <div class="title">Agent inspection</div>
      <div class="model">openai/gpt-oss-120b</div>
    </div>
    <div class="header-right-half">
      <DownloadSnapshot {events} />
      <div class="pill {status}">
        {#if status === "connecting"}Connecting...{/if}
        {#if status === "connected"}Live{/if}
        {#if status === "error"}Error{/if}
      </div>
    </div>
  </div>

  {#if lastError}
    <div class="error">{lastError}</div>
  {/if}

  <div class="stream">
    {#if events.length === 0}
      <div class="empty">No inspection events yet.</div>
    {:else}
      {#each events as e (e.id)}
        <EventRow
          event={e}
          onToggleExpand={toggleExpand}
          onRemove={removeEventRow}
        />
      {/each}
    {/if}
  </div>

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

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
    background: rgba(255, 255, 255, 0.03);
  }

  .header-right-half {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-weight: 600;
    font-size: 14px;
  }

  .model {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    font-family: monospace;
  }

  .pill {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #c9d1d9;
  }
  .pill.connected {
    border-color: rgba(46, 160, 67, 0.6);
    color: #7ee787;
  }
  .pill.connecting {
    border-color: rgba(210, 153, 34, 0.7);
    color: #f2cc60;
  }
  .pill.error {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
  }

  .error {
    padding: 8px 12px;
    font-size: 12px;
    color: #ff7b72;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
  }

  .stream {
    flex: 1;
    overflow: auto;
    padding: 10px 12px;
  }

  .empty {
    color: rgba(230, 237, 243, 0.7);
    font-size: 13px;
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
