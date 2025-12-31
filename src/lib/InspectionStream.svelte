<script lang="ts">
  import EventRow from "./EventRow.svelte";
  import InvocationGroup from "./InvocationGroup.svelte";
  import type { InvocationGroupData } from "./InvocationGroup.svelte";
  import type { InspectionEventDisplay } from "../types";

  type StreamItem =
    | { type: "group"; group: InvocationGroupData }
    | { type: "ungrouped"; event: InspectionEventDisplay };

  let streamElement: HTMLDivElement | null = null;
  const {
    events,
    highlightedEventId,
    onToggleExpand,
    onRemove,
    onRemoveGroup,
    onSelectEvent,
  } = $props();

  const parentEventHandlers = $derived({ onToggleExpand, onRemove, onRemoveGroup, onSelectEvent });

  let previousEventCount = 0;

  let expandedGroups = $state<Set<string>>(new Set());

  const streamItems = $derived.by<StreamItem[]>(() => {
    const groupMap = new Map<string, InvocationGroupData>();

    for (const event of events) {
      if (event.invocationId) {
        let group = groupMap.get(event.invocationId);
        if (!group) {
          group = {
            invocationId: event.invocationId,
            events: [],
            firstTs: event.ts,
            lastTs: event.ts,
          };
          groupMap.set(event.invocationId, group);
        }
        group.events.push(event);
        group.lastTs = event.ts;
      }
    }

    const result: StreamItem[] = [];
    for (const event of events) {
      if (event.invocationId) {
        const group = groupMap.get(event.invocationId)!;
        if (group.events[0].id === event.id) {
          result.push({ type: "group", group });
        }
      } else {
        result.push({ type: "ungrouped", event });
      }
    }

    return result;
  });

  function toggleGroup(invocationId: string) {
    const next = new Set(expandedGroups);
    if (next.has(invocationId)) {
      next.delete(invocationId);
    } else {
      next.add(invocationId);
    }
    expandedGroups = next;
  }

  $effect(() => {
    if (!streamElement) return;

    const currentCount = events.length;

    if (currentCount > previousEventCount) {
      streamElement.scrollTop = streamElement.scrollHeight;
    }

    previousEventCount = currentCount;
  });

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
    {#each streamItems as item (item.type === 'group' ? `g-${item.group.invocationId}` : `e-${item.event.id}`)}
      {#if item.type === "ungrouped"}
        <EventRow
          event={item.event}
          highlighted={highlightedEventId === item.event.id}
          {...parentEventHandlers}
        />
      {:else}
        <InvocationGroup
          group={item.group}
          isExpanded={expandedGroups.has(item.group.invocationId)}
          hasHighlighted={item.group.events.some(e => e.id === highlightedEventId)}
          {highlightedEventId}
          onToggle={() => toggleGroup(item.group.invocationId)}
          {...parentEventHandlers}
        />
      {/if}
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
