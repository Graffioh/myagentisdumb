<script lang="ts">
  import EventRow from "./EventRow.svelte";
  import type { InspectionEventDisplay } from "../types";

  interface Props {
    events: InspectionEventDisplay[];
    highlightedEventId: number | null;
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
    onToggleWarningMark: (eventId: number) => void;
  }

  let streamElement: HTMLDivElement | null = null;
  const {
    events,
    highlightedEventId,
    onToggleExpand,
    onRemove,
    onToggleWarningMark,
  } = $props();

  let previousEventCount = 0;

  // Auto-scroll only when new events are added
  $effect(() => {
    if (!streamElement) return;

    const currentCount = events.length;

    if (currentCount > previousEventCount) {
      streamElement.scrollTop = streamElement.scrollHeight;
    }

    previousEventCount = currentCount;
  });

  // Scroll to highlighted event
  $effect(() => {
    if (!streamElement || highlightedEventId === null) return;

    const eventElement = streamElement.querySelector<HTMLElement>(
      `[data-event-id="${highlightedEventId}"]`
    );

    eventElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
</script>

<div class="stream" bind:this={streamElement}>
  {#if events.length === 0}
    <div class="empty">No inspection events yet.</div>
  {:else}
    {#each events as e (e.id)}
      <EventRow
        event={e}
        highlighted={highlightedEventId === e.id}
        {onToggleExpand}
        {onRemove}
        {onToggleWarningMark}
      />
    {/each}
  {/if}
</div>

<style>
  .stream {
    flex: 1;
    overflow: auto;
    padding: 10px 12px;
  }

  .empty {
    color: rgba(230, 237, 243, 0.7);
    font-size: 13px;
  }
</style>
