import type { InspectionEventDisplay } from "../types";
import { InspectionEventLabel } from "../../protocol/types";

/**
 * Checks if an event has a specific label in its children.
 */
function hasLabel(event: InspectionEventDisplay, label: InspectionEventLabel): boolean {
  return event.inspectionEvent.children?.some(child => child.label === label) ?? false;
}

/**
 * Checks if any events have latency loop markers (LatencyLoopStart or LatencyLoopEnd).
 * The heatmap should only be displayed if loop markers are present.
 */
export function hasLoopMarkers(events: InspectionEventDisplay[]): boolean {
  return events.some(event => 
    hasLabel(event, InspectionEventLabel.LatencyLoopStart) || 
    hasLabel(event, InspectionEventLabel.LatencyLoopEnd)
  );
}

/**
 * Computes latency (time difference) between consecutive events within each loop.
 * A new loop starts when an event has the LatencyLoopStart label.
 * First event of each loop has latency 0.
 * 
 * Requires loop markers to be set via reporter.latencyLoopStart() and reporter.latencyLoopEnd().
 */
export function computeLatencies(events: InspectionEventDisplay[]): number[] {
  if (events.length === 0) return [];

  const latencies: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevEvent = i > 0 ? events[i - 1] : null;
    const isLoopStart = hasLabel(event, InspectionEventLabel.LatencyLoopStart);

    if (isLoopStart || !prevEvent) {
      // First event of a new loop (or very first event) has latency 0
      latencies.push(0);
    } else {
      // Calculate latency from previous event
      latencies.push(event.ts - prevEvent.ts);
    }
  }

  return latencies;
}

/**
 * Gets the color intensity for a latency value relative to the max latency.
 * Uses a simple linear scale with a minimum threshold.
 * @returns Color intensity from 0 (low) to 1 (high)
 */
export function getLatencyIntensity(latency: number, maxLatency: number): number {
  if (latency <= 0 || maxLatency <= 0) return 0;

  // Use log scale for better distribution when there's high variance
  const logLatency = Math.log1p(latency);
  const logMax = Math.log1p(maxLatency);

  return Math.min(1, logLatency / logMax);
}

/**
 * Formats latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 1) {
    return "<1ms";
  } else if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

