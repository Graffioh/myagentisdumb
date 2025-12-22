<script lang="ts">
  import DownloadSnapshot from "./DownloadSnapshot.svelte";
  import type { InspectionEventDisplay } from "../types";

  interface Props {
    modelName: string;
    status: "connecting" | "connected" | "error";
    events: InspectionEventDisplay[];
  }

  let { modelName = "", status = "connecting", events }: Props = $props();
</script>

<div class="header">
  <div class="title-section">
    <div class="title">Agent inspection</div>
    <div class="model">{modelName || "no model name available"}</div>
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
  .pill.connecting {
    border-color: rgba(210, 153, 34, 0.7);
    color: #f2cc60;
  }
  .pill.error {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
  }
</style>

