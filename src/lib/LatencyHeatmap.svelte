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

  // Only compute latencies if loop markers are present
  const hasMarkers = $derived(hasLoopMarkers(events));
  const latencies = $derived(hasMarkers ? computeLatencies(events) : []);
  const maxLatency = $derived(
    latencies.length > 0 ? Math.max(...latencies) : 0
  );

  // Compute intensity for each latency (using max for normalization)
  const intensities = $derived(
    latencies.map((latency) => getLatencyIntensity(latency, maxLatency))
  );

  // Get color for intensity (green -> yellow -> red)
  function getColor(intensity: number): string {
    if (intensity === 0) {
      return "rgba(230, 237, 243, 0.15)"; // Very light gray for zero latency
    }

    // Color scale: green (low) -> yellow (medium) -> red (high)
    // Using colors that work well on dark background
    if (intensity < 0.5) {
      // Green to yellow
      const ratio = intensity / 0.5;
      const r = Math.round(46 + (255 - 46) * ratio);
      const g = Math.round(160 + (212 - 160) * ratio);
      const b = Math.round(67);
      const alpha = 0.4 + ratio * 0.4;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Yellow to red
      const ratio = (intensity - 0.5) / 0.5;
      const r = Math.round(255);
      const g = Math.round(212 - 140 * ratio);
      const b = Math.round(0);
      const alpha = 0.8 + ratio * 0.2;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  <div class="heatmap-container">
    <div class="heatmap-header">
      <span class="heatmap-title">Latency Heatmap</span>
      <span class="heatmap-stats">
        {latencies.length} steps • Max: {formatLatency(maxLatency)}
      </span>
    </div>
    <div class="heatmap-bars">
      {#each latencies as latency, index}
        {@const intensity = intensities[index]}
        {@const color = getColor(intensity)}
        <div
          class="heatmap-bar"
          style="background-color: {color}; height: {Math.max(
            20,
            intensity * 50 + 20
          )}px;"
          title="Step {index + 1}: {formatLatency(latency)}"
          role="button"
          tabindex="0"
          aria-label="Step {index + 1}, latency {formatLatency(latency)}"
          onclick={() => onSelectEvent?.(index)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectEvent?.(index);
            }
          }}
        >
          <span class="heatmap-bar-label">{formatLatency(latency)}</span>
        </div>
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
  </div>
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

  .heatmap-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    min-height: 40px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .heatmap-bar {
    flex: 1;
    min-width: 8px;
    border-radius: 2px;
    cursor: pointer;
    transition:
      opacity 0.2s,
      transform 0.1s;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .heatmap-bar:hover {
    opacity: 0.9;
    transform: scaleY(1.05);
    z-index: 1;
  }

  .heatmap-bar:focus {
    outline: 2px solid rgba(88, 166, 255, 0.6);
    outline-offset: 2px;
  }

  .heatmap-bar-label {
    font-size: 9px;
    font-weight: 600;
    font-family: monospace;
    opacity: 0.95;
    transition: opacity 0.2s;
    pointer-events: none;
    text-align: center;
    line-height: 1;
    padding: 1px 2px;
    /* Use text shadow for better readability on colored backgrounds */
    text-shadow:
      0 0 2px rgba(0, 0, 0, 0.8),
      0 0 4px rgba(0, 0, 0, 0.6);
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .heatmap-bar:hover .heatmap-bar-label {
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
