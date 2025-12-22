<script lang="ts">
  import { tick } from "svelte";
  import EventRow from "./EventRow.svelte";
  import type { InspectionEventDisplay } from "../types";

  interface Props {
    events: InspectionEventDisplay[];
    onToggleExpand: (eventId: number) => void;
    onRemove: (eventId: number) => void;
  }

  let streamElement: HTMLDivElement | null = $state(null);
  let { events, onToggleExpand, onRemove }: Props = $props();

  // Auto-scroll when events change
  $effect(() => {
    if (events.length > 0 && streamElement) {
      tick().then(() => {
        if (streamElement) {
          streamElement.scrollTop = streamElement.scrollHeight;
        }
      });
    }
  });
</script>

<div class="stream" bind:this={streamElement}>
  {#if events.length === 0}
    <div class="empty">No inspection events yet.</div>
  {:else}
    {#each events as e (e.id)}
      <EventRow event={e} {onToggleExpand} {onRemove} />
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
