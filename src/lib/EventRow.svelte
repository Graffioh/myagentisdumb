<script lang="ts">
  import type { InspectionEventDisplay } from "../types";
  import { InspectionEventLabel } from "../../protocol/types";

  interface Props {
    event: InspectionEventDisplay;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
  }

  let { event, onToggleExpand, onRemove }: Props = $props();

  function getFirstLine(data: string): string {
    return data.split("\n")[0];
  }

  const isExpanded = $derived(!!event.expanded);
  const hasChildren = $derived(!!event.inspectionEvent.children && event.inspectionEvent.children.length > 0);
  const multiline = $derived(event.data.includes("\n") || hasChildren);
  const hasReasoning = $derived(
    hasChildren && event.inspectionEvent.children?.some((child) => child.label === InspectionEventLabel.Reasoning)
  );
  const hasTiming = $derived(
    hasChildren && event.inspectionEvent.children?.some((child) => child.label === InspectionEventLabel.Timing)
  );
  const timingData = $derived(
    event.inspectionEvent.children?.find((child) => child.label === InspectionEventLabel.Timing)?.data || null
  );
</script>

<div class="row">
  <div class="ts">{new Date(event.ts).toLocaleTimeString()}</div>
  <div class="data-container">
    {#if multiline}
      <button class="expand-button" onclick={() => onToggleExpand(event.id)}>
        <span class="arrow {isExpanded ? 'expanded' : ''}">▶</span>
      </button>
    {/if}
    <div class="data-content">
      <div class="data-with-badge">
        <pre class="data {isExpanded ? '' : 'collapsed'}">{isExpanded || !multiline
            ? event.data
            : getFirstLine(event.data)}</pre>
        {#if hasReasoning}
          <span class="reasoning-badge" title="Contains reasoning details">R</span>
        {/if}
        {#if hasTiming && timingData}
          <span class="timing-badge" title="Tool execution time">{timingData}</span>
        {/if}
      </div>
      {#if isExpanded && hasChildren}
        <div class="children {hasReasoning ? 'has-reasoning' : ''}">
          {#each event.inspectionEvent.children as child}
            <div class="child">
              <div class="child-label {child.label === InspectionEventLabel.Reasoning ? 'reasoning-label' : child.label === InspectionEventLabel.Timing ? 'timing-label' : ''}">{child.label}</div>
              <pre class="child-data">{child.data}</pre>
            </div>
          {/each}
        </div>
      {/if}
    </div>
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
  }

  .data.collapsed {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .data-content {
    flex: 1;
  }

  .data-with-badge {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .reasoning-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 149, 0, 0.15);
    color: #ff9500;
    border: 1px solid rgba(255, 149, 0, 0.3);
    line-height: 1;
    margin-top: 2px;
    cursor: help;
  }

  .timing-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(46, 160, 67, 0.15);
    color: #7ee787;
    border: 1px solid rgba(46, 160, 67, 0.3);
    line-height: 1;
    margin-top: 2px;
    cursor: help;
    font-family: monospace;
  }

  .children {
    margin-top: 8px;
    padding-left: 12px;
    border-left: 2px solid rgba(88, 166, 255, 0.3);
  }

  .children.has-reasoning {
    border-left-color: rgba(255, 149, 0, 0.3);
  }

  .child {
    margin-bottom: 12px;
  }

  .child:last-child {
    margin-bottom: 0;
  }

  .child-label {
    font-size: 11px;
    font-weight: 600;
    color: #79c0ff;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .child-label.reasoning-label {
    color: #ff9500;
  }

  .child-label.timing-label {
    color: #7ee787;
  }

  .child-data {
    margin: 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    color: rgba(230, 237, 243, 0.9);
    background: rgba(255, 255, 255, 0.02);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.06);
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
