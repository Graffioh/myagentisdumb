<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  type InspectionEvent = { ts: number; data: string };

  let events: InspectionEvent[] = $state([]);
  let status = $state<"connecting" | "connected" | "error">("connecting");
  let lastError = $state<string | null>(null);

  let eventSource: EventSource | null = null;

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

  function pushEvent(data: string) {
    const next = [...events, { ts: Date.now(), data }];
    events = next.length > 300 ? next.slice(next.length - 300) : next;
  }

  onMount(() => {
    eventSource = new EventSource(BACKEND_URL + "/agent/events/inspection");

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
    <div class="title">Agent inspection</div>
    <div class="pill {status}">
      {#if status === "connecting"}Connecting...{/if}
      {#if status === "connected"}Live{/if}
      {#if status === "error"}Error{/if}
    </div>
  </div>

  {#if lastError}
    <div class="error">{lastError}</div>
  {/if}

  <div class="stream">
    {#if events.length === 0}
      <div class="empty">No events yet.</div>
    {:else}
      {#each events as e (e.ts)}
        <div class="row">
          <div class="ts">{new Date(e.ts).toLocaleTimeString()}</div>
          <pre class="data">{e.data}</pre>
        </div>
      {/each}
    {/if}
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
    background: #0b0f14;
    color: #e6edf3;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }

  .title {
    font-weight: 600;
    font-size: 14px;
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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

  .row {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .ts {
    font-size: 12px;
    color: rgba(230, 237, 243, 0.65);
  }

  .data {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #e6edf3;
  }
</style>
