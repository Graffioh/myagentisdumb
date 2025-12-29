<script lang="ts">
  import type { MaidSnapshot } from "../../protocol/types";

  interface Props {
    onImport: (snapshot: MaidSnapshot) => void;
  }

  let { onImport }: Props = $props();
  let fileInput: HTMLInputElement | null = null;
  let error = $state<string | null>(null);

  function validateSnapshot(data: unknown): data is MaidSnapshot {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    
    if (obj.version !== "1.0") return false;
    if (typeof obj.exportedAt !== "string") return false;
    if (!Array.isArray(obj.events)) return false;
    
    return true;
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = null;

    try {
      let text = await file.text();
      text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
      const data = JSON.parse(text);

      if (!validateSnapshot(data)) {
        error = "Invalid snapshot format. Expected MAID Snapshot v1.0";
        return;
      }

      /*
      setSnapshotContext(data.context || []);
      setSnapshotToolDefinitions(data.tools || []);
      setSnapshotTokenUsage(
        data.tokenUsage || { totalTokens: 0, contextLimit: null, remainingTokens: null }
      );
      */

      onImport(data);
    } catch (e) {
      error = e instanceof SyntaxError ? "Invalid JSON file" : "Failed to import snapshot";
      console.error("Import error:", e);
    }

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function triggerFileSelect() {
    fileInput?.click();
  }
</script>

<input
  type="file"
  accept=".json"
  bind:this={fileInput}
  onchange={handleFileSelect}
  style="display: none;"
/>

<button
  class="import-button"
  onclick={triggerFileSelect}
  title="Import MAID snapshot (.json)"
>
  import ⬆
</button>

{#if error}
  <span class="error-msg">{error}</span>
{/if}

<style>
  .import-button {
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

  .import-button:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #e6edf3;
    background: rgba(255, 255, 255, 0.05);
  }

  .import-button:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .error-msg {
    color: #ff7b72;
    font-size: 12px;
    margin-left: 8px;
  }
</style>
