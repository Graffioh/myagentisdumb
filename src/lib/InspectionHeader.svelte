<script lang="ts">
  import DownloadSnapshot from "./DownloadSnapshot.svelte";
  import ImportSnapshot from "./ImportSnapshot.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import type { InspectionEventDisplay } from "../types";
  import type { MaidSnapshot } from "../../protocol/types";
  import type { ViewMode } from "../utils/snapshot.svelte";

  export type LabelFilter = "all" | "tools" | "errors";

  interface Props {
    modelName: string;
    status: "connecting" | "connected" | "error";
    agentConnected: boolean;
    events: InspectionEventDisplay[];
    errorRate: number;
    viewMode: ViewMode;
    labelFilter: LabelFilter;
    onDeleteAll: () => void;
    onImport: (snapshot: MaidSnapshot) => void;
    onSwitchToRealtime: () => void;
    onLabelFilterChange: (filter: LabelFilter) => void;
  }

  let {
    modelName = "",
    status = "connecting",
    agentConnected = false,
    events = [],
    errorRate = 0,
    viewMode = "realtime",
    labelFilter = "all",
    onDeleteAll,
    onImport,
    onSwitchToRealtime,
    onLabelFilterChange,
  }: Props = $props();

  let showConfirmDialog = $state(false);
  let showExitSnapshotDialog = $state(false);
  let showExitHint = $state(false);
  let prevViewMode = $state<ViewMode>("realtime");

  $effect(() => {
    if (prevViewMode === "realtime" && viewMode === "snapshot") {
      showExitHint = true;
      setTimeout(() => {
        showExitHint = false;
      }, 3000);
    }
    prevViewMode = viewMode;
  });

  const statusClass = $derived(
    status === "error"
      ? "error"
      : status === "connecting"
        ? "connecting"
        : agentConnected
          ? "connected"
          : "idle"
  );

  const statusText = $derived(
    status === "connecting"
      ? "Connecting..."
      : status === "error"
        ? "Error"
        : agentConnected
          ? "Live"
          : "Idle"
  );

  function handleClearClick() {
    showConfirmDialog = true;
  }

  function confirmDelete() {
    onDeleteAll();
    showConfirmDialog = false;
  }

  function cancelDelete() {
    showConfirmDialog = false;
  }

  function handleExitSnapshotClick() {
    showExitSnapshotDialog = true;
  }

  function confirmExitSnapshot() {
    onSwitchToRealtime();
    showExitSnapshotDialog = false;
  }

  function cancelExitSnapshot() {
    showExitSnapshotDialog = false;
  }
</script>

<div class="header">
  <div class="title-section">
    <div class="title">Agent inspection</div>
    <div class="model">{modelName || "no model name available"}</div>
  </div>
    <div class="header-right-half">
      <button
      class="delete-events-button"
      onclick={handleClearClick}
      title="Delete all events"
      aria-label="Delete all events"
      disabled={events.length === 0}
      type="button"
    >
      clear
    </button>
    <select
      class="label-filter-dropdown"
      value={labelFilter}
      onchange={(e) => onLabelFilterChange(e.currentTarget.value as LabelFilter)}
      title="Filter events by label"
    >
      <option value="all">All</option>
      <option value="tools">Tools</option>
      <option value="errors">Errors</option>
    </select>
    <ImportSnapshot {onImport} />
    <DownloadSnapshot />
    <div 
      class="error-rate-pill" 
      class:has-errors={errorRate > 0}
      title="Error rate (errors / invocations)"
    >
      {errorRate.toFixed(1)}% err
    </div>
    {#if viewMode === "realtime"}
      <div class="pill {statusClass}" role="status" aria-live="polite">
        {statusText}
      </div>
    {:else}
      <div class="snapshot-wrapper">
        <button
          class="pill snapshot"
          onclick={handleExitSnapshotClick}
          title="Viewing imported snapshot. Click to switch to real-time."
        >
          Snapshot
        </button>
        {#if showExitHint}
          <div class="exit-hint">Click to exit snapshot mode</div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<ConfirmDialog
  show={showConfirmDialog}
  message="Clear all events?"
  confirmText="clear"
  cancelText="cancel"
  onConfirm={confirmDelete}
  onCancel={cancelDelete}
/>

<ConfirmDialog
  show={showExitSnapshotDialog}
  message="Exit snapshot mode? All events and context will be cleared."
  confirmText="exit"
  cancelText="cancel"
  onConfirm={confirmExitSnapshot}
  onCancel={cancelExitSnapshot}
/>

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
  .pill.snapshot {
    border-color: rgba(255, 225, 73, 0.7);
    color: #ffe2a8;
    background: rgba(255, 242, 143, 0.15);
    cursor: pointer;
    transition: all 0.2s;
  }
  .pill.snapshot:hover {
    background: rgba(255, 242, 143, 0.25);
  }

  .snapshot-wrapper {
    position: relative;
  }

  .exit-hint {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: rgba(40, 40, 40, 0.95);
    border: 1px solid rgba(255, 225, 73, 0.5);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    color: #ffe2a8;
    white-space: nowrap;
    z-index: 1000;
    animation: fadeInOut 3s ease-in-out forwards;
    pointer-events: none;
  }

  .exit-hint::before {
    content: "";
    position: absolute;
    top: -5px;
    right: 12px;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid rgba(255, 225, 73, 0.5);
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(-4px); }
    10% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(4px); }
  }

  .error-rate-pill {
    font-size: 11px;
    font-family: monospace;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(230, 237, 243, 0.6);
    transition: all 0.2s;
  }

  .error-rate-pill.has-errors {
    border-color: rgba(248, 81, 73, 0.5);
    color: #ff7b72;
    background: rgba(248, 81, 73, 0.1);
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

  .label-filter-dropdown {
    background: rgb(0, 0, 0);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: #c9d1d9;
    font-size: 12px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .label-filter-dropdown:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .label-filter-dropdown:focus {
    outline: none;
    border-color: rgba(136, 192, 208, 0.6);
  }

  .label-filter-dropdown option {
    background: #1e1e1e;
    color: #c9d1d9;
  }
</style>
