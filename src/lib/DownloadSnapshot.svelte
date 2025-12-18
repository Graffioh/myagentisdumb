<script lang="ts">
  import type { InspectionEvent } from "../types";

  interface Props {
    events: InspectionEvent[];
  }

  let { events }: Props = $props();

  function buildInspectionSnapshot(): string {
    if (events.length === 0) {
      return "No inspection events yet.\n";
    }
    return events
      .map((e) => {
        const timestamp = new Date(e.ts).toLocaleString();
        return `[${timestamp}] ${e.data}`;
      })
      .join("\n");
  }

  function downloadInspectionSnapshot() {
    const content = buildInspectionSnapshot();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inspection-snapshot.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<button
  class="download-button"
  onclick={downloadInspectionSnapshot}
  title="Download inspection log"
>
  download txt snapshot ⬇
</button>

<style>
  .download-button {
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

  .download-button:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #e6edf3;
    background: rgba(255, 255, 255, 0.05);
  }

  .download-button:active {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
