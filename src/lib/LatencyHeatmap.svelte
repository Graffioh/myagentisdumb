<script lang="ts">
  import type { InspectionEventDisplay } from "../types";
  import {
    computeLatencies,
    getLatencyIntensity,
    formatLatency,
    hasLoopMarkers,
  } from "../utils/latency";

  interface Props {
    events: InspectionEventDisplay[];
    onSelectEvent?: (eventIndex: number) => void;
  }

  let { events, onSelectEvent }: Props = $props();

  // Track selected bar index
  let selectedIndex = $state<number | null>(null);

  // Reference to the bars container for auto-scroll
  let barsContainer = $state<HTMLDivElement | null>(null);

  // Only compute latencies if loop markers are present
  const hasMarkers = $derived(hasLoopMarkers(events));
  const latencies = $derived<number[]>(hasMarkers ? computeLatencies(events) : []);
  const maxLatency = $derived(
    latencies.length > 0 ? Math.max(...latencies) : 0
  );

  // Compute intensity for each latency (using max for normalization)
  const intensities = $derived(
    latencies.map((latency) => getLatencyIntensity(latency, maxLatency))
  );

  // Auto-scroll to the right when new latency blocks appear
  $effect(() => {
    const count = latencies.length;
    if (count > 0 && barsContainer) {
      const id = requestAnimationFrame(() => {
        if (barsContainer) {
          barsContainer.scrollLeft = barsContainer.scrollWidth;
        }
      });
      return () => cancelAnimationFrame(id);
    }
  });

  // Get border and background colors for intensity (green -> yellow -> red)
  function getColors(intensity: number): {
    border: string;
    hoverBg: string;
    selectedBg: string;
  } {
    if (intensity === 0) {
      return {
        border: "rgba(230, 237, 243, 0.3)",
        hoverBg: "rgba(230, 237, 243, 0.1)",
        selectedBg: "rgba(230, 237, 243, 0.15)",
      };
    }

    // Color scale: green (low) -> yellow (medium) -> red (high)
    if (intensity < 0.5) {
      // Green to yellow
      const ratio = intensity / 0.5;
      const r = Math.round(46 + (255 - 46) * ratio);
      const g = Math.round(160 + (212 - 160) * ratio);
      const b = Math.round(67);
      return {
        border: `rgba(${r}, ${g}, ${b}, ${0.5 + ratio * 0.3})`,
        hoverBg: `rgba(${r}, ${g}, ${b}, ${0.1 + ratio * 0.1})`,
        selectedBg: `rgba(${r}, ${g}, ${b}, ${0.15 + ratio * 0.15})`,
      };
    } else {
      // Yellow to red
      const ratio = (intensity - 0.5) / 0.5;
      const r = Math.round(255);
      const g = Math.round(212 - 140 * ratio);
      const b = Math.round(0);
      return {
        border: `rgba(${r}, ${g}, ${b}, ${0.8 + ratio * 0.2})`,
        hoverBg: `rgba(${r}, ${g}, ${b}, ${0.2 + ratio * 0.1})`,
        selectedBg: `rgba(${r}, ${g}, ${b}, ${0.3 + ratio * 0.2})`,
      };
    }
  }

  function handleSelect(index: number) {
    selectedIndex = index;
    onSelectEvent?.(index);
  }

  function handleSelectMax() {
    // Find the index of the max latency
    const maxIndex = latencies.indexOf(maxLatency);
    if (maxIndex !== -1) {
      handleSelect(maxIndex);
      // Scroll to the max latency bar
      if (barsContainer) {
        const barWidth = 45 + 2; // bar width + gap
        const targetScroll = maxIndex * barWidth - barsContainer.clientWidth / 2 + barWidth / 2;
        barsContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }
</script>

{#if events.length === 0}
  <!-- No events yet, don't show anything -->
{:else if !hasMarkers}
  <!-- No loop markers, don't show heatmap (user hasn't called loopStart/loopEnd) -->
{:else if latencies.length === 0}
  <div class="heatmap-empty">No latency data available</div>
{:else}
  <section class="heatmap-container" aria-label="Latency heatmap">
    <div class="heatmap-header">
      <span class="heatmap-title">Latency Heatmap</span>
      <span class="heatmap-stats">
        {latencies.length} steps • <button
          class="max-button"
          onclick={handleSelectMax}
          title="Click to jump to max latency block"
        >
          Max: {formatLatency(maxLatency)}
        </button>
      </span>
    </div>
    <div class="heatmap-bars" bind:this={barsContainer}>
      {#each latencies as latency, index}
        {@const intensity = intensities[index]}
        {@const colors = getColors(intensity)}
        {@const isSelected = selectedIndex === index}
        <button
          type="button"
          class="heatmap-bar"
          class:selected={isSelected}
          style="border-color: {colors.border}; --hover-bg: {colors.hoverBg}; --selected-bg: {colors.selectedBg}; height: {Math.max(
            20,
            intensity * 50 + 20
          )}px;"
          title="Step {index + 1}: {formatLatency(latency)}"
          aria-label="Step {index + 1}, latency {formatLatency(latency)}"
          aria-pressed={isSelected}
          onclick={() => handleSelect(index)}
        >
          <span class="heatmap-bar-label">{formatLatency(latency)}</span>
        </button>
      {/each}
    </div>
    <div class="heatmap-legend">
      <span class="legend-item">
        <span
          class="legend-color"
          style="background-color: rgba(46, 160, 67, 0.5);"
        ></span>
        <span>Low</span>
      </span>
      <span class="legend-item">
        <span
          class="legend-color"
          style="background-color: rgba(255, 212, 0, 0.7);"
        ></span>
        <span>Medium</span>
      </span>
      <span class="legend-item">
        <span
          class="legend-color"
          style="background-color: rgba(255, 0, 0, 0.8);"
        ></span>
        <span>High</span>
      </span>
    </div>
  </section>
{/if}

<style>
  .heatmap-container {
    padding: 12px;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
    background: rgba(255, 255, 255, 0.02);
  }

  .heatmap-empty {
    padding: 12px;
    color: rgba(230, 237, 243, 0.5);
    font-size: 12px;
    text-align: center;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
  }

  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .heatmap-title {
    font-size: 12px;
    font-weight: 600;
    color: #e6edf3;
  }

  .heatmap-stats {
    font-size: 11px;
    color: rgba(230, 237, 243, 0.6);
    font-family: monospace;
  }

  .max-button {
    background: none;
    border: none;
    padding: 0;
    font-size: 11px;
    font-family: monospace;
    color: #ff4444;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 600;
  }

  .max-button:hover {
    color: #ff6666;
    text-decoration: underline;
  }

  .heatmap-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    min-height: 40px;
    margin-bottom: 8px;
    flex-wrap: nowrap;
    overflow-x: auto;
    border-bottom: 1px solid rgba(230, 237, 243, 0.3);
    padding-bottom: 0;
  }

  .heatmap-bar {
    flex: 0 0 auto;
    width: 45px;
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: none;
    border: 1px solid;
    border-bottom: none;
    padding: 0;
    font: inherit;
  }

  .heatmap-bar:hover:not(.selected) {
    background-color: var(--hover-bg);
    z-index: 1;
  }

  .heatmap-bar.selected {
    background-color: var(--selected-bg);
    z-index: 1;
  }

  .heatmap-bar-label {
    font-size: 9px;
    font-weight: 600;
    font-family: monospace;
    opacity: 0.8;
    transition: opacity 0.2s;
    pointer-events: none;
    text-align: center;
    line-height: 1;
    padding: 1px 2px;
    color: #e6edf3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .heatmap-bar:hover .heatmap-bar-label,
  .heatmap-bar.selected .heatmap-bar-label {
    opacity: 1;
  }

  .heatmap-legend {
    display: flex;
    gap: 12px;
    justify-content: center;
    font-size: 10px;
    color: rgba(230, 237, 243, 0.7);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    display: inline-block;
  }
</style>
