<script lang="ts">
  import DownloadSnapshot from "./DownloadSnapshot.svelte";
  import type { InspectionEventDisplay } from "../types";

  interface Props {
    modelName: string;
    status: "connecting" | "connected" | "error";
    agentConnected: boolean;
    events: InspectionEventDisplay[];
    onDeleteAll: () => void;
  }

  let { modelName = "", status = "connecting", agentConnected = false, events, onDeleteAll }: Props = $props();
</script>

<div class="header">
  <div class="title-section">
    <div class="title">Agent inspection</div>
    <div class="model">{modelName || "no model name available"}</div>
  </div>
  <div class="header-right-half">
    <button
      class="delete-events-button"
      onclick={onDeleteAll}
      title="Delete all events"
      aria-label="Delete all events"
      disabled={events.length === 0}
    >
      clear
    </button>
    <DownloadSnapshot {events} />
    <div class="pill {status === 'error' ? 'error' : status === 'connecting' ? 'connecting' : agentConnected ? 'connected' : 'idle'}">
      {#if status === "connecting"}Connecting...{/if}
      {#if status === "error"}Error{/if}
      {#if status === "connected" && agentConnected}Live{/if}
      {#if status === "connected" && !agentConnected}Idle{/if}
    </div>
  </div>
</div>

<style>
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
  .pill.idle {
    border-color: rgba(158, 158, 158, 0.6);
    color: #9e9e9e;
  }
  .pill.connecting {
    border-color: rgba(210, 153, 34, 0.7);
    color: #f2cc60;
  }
  .pill.error {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
  }

  .delete-events-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .delete-events-button:hover:not(:disabled) {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
    background: rgba(248, 81, 73, 0.1);
  }

  .delete-events-button:active:not(:disabled) {
    background: rgba(248, 81, 73, 0.2);
  }

  .delete-events-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
