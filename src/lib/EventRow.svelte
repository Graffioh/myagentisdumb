<script lang="ts">
  import type { InspectionEvent } from "../../reporter/types";

  interface Props {
    event: InspectionEvent;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
  }

  let { event, onToggleExpand, onRemove }: Props = $props();

  function getFirstLine(data: string): string {
    return data.split("\n")[0];
  }

  const isExpanded = $derived(!!event.expanded);
  const multiline = $derived(event.data.includes("\n"));
</script>

<div class="row">
  <div class="ts">{new Date(event.ts).toLocaleTimeString()}</div>
  <div class="data-container">
    {#if multiline}
      <button class="expand-button" onclick={() => onToggleExpand(event.id)}>
        <span class="arrow {isExpanded ? 'expanded' : ''}">▶</span>
      </button>
    {/if}
    <pre class="data {isExpanded ? '' : 'collapsed'}">{isExpanded || !multiline
        ? event.data
        : getFirstLine(event.data)}</pre>
  </div>
  <div class="remove-container">
    <button
      class="remove-button"
      onclick={() => onRemove(event.id)}
      title="Remove inspection event"
    >
      ×
    </button>
  </div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 90px 1fr auto;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(214, 214, 214, 0.153);
  }

  .ts {
    font-size: 12px;
    color: rgba(230, 237, 243, 0.65);
  }

  .data-container {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .expand-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: rgba(230, 237, 243, 0.65);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .expand-button:hover {
    color: #e6edf3;
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s;
    display: inline-block;
  }

  .arrow.expanded {
    transform: rotate(90deg);
  }

  .data {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #e6edf3;
    flex: 1;
  }

  .data.collapsed {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .remove-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .remove-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(230, 237, 243, 0.65);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 2px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    width: 24px;
    height: 24px;
  }

  .remove-button:hover {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
    background: rgba(248, 81, 73, 0.1);
  }

  .remove-button:active {
    background: rgba(248, 81, 73, 0.2);
  }
</style>
