<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  type ContextMessage = {
    role: string;
    content: string;
    tool_calls?: any[];
  };

  let context: ContextMessage[] = $state([]);
  let contextExpanded = $state(false);
  let contextEventSource: EventSource | null = null;

  const AGENT_URL =
    import.meta.env.VITE_AGENT_URL || "http://localhost:3002/api";
  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:3003/api";

  async function deleteContext(e: MouseEvent) {
    e.stopPropagation(); 
    
    try {
      const response = await fetch(AGENT_URL + "/agent/context", {
        method: "DELETE",
      });
      
      if (response.ok) {
        context = [];
      } else {
        console.error("Failed to delete context");
      }
    } catch (error) {
      console.error("Error deleting context:", error);
    }
  }

  async function refreshContext(e: MouseEvent) {
    e.stopPropagation();
    
    try {
      const response = await fetch(AGENT_URL + "/agent/context", {
        method: "GET",
      });
      
      if (response.ok) {
        const currentContext = await response.json();
        context = currentContext;
      } else {
        console.error("Failed to refresh context");
      }
    } catch (error) {
      console.error("Error refreshing context:", error);
    }
  }

  onMount(() => {
    contextEventSource = new EventSource(INSPECTION_URL + "/inspection/context");

    contextEventSource.onmessage = (event: MessageEvent) => {
      try {
        const newContext = JSON.parse(event.data);
        context = newContext;
      } catch (e) {
        console.error("Failed to parse context data:", e);
      }
    };

    contextEventSource.onerror = () => {
      console.error("Context SSE connection error");
    };
  });

  onDestroy(() => {
    contextEventSource?.close();
    contextEventSource = null;
  });
</script>

<div class="context-section">
  <div
    class="context-header"
    onclick={() => (contextExpanded = !contextExpanded)}
    onkeydown={(e) => e.key === "Enter" && (contextExpanded = !contextExpanded)}
    role="button"
    tabindex="0"
  >
    <div class="context-header-left">
      <button class="expand-button">
        <span class="arrow {contextExpanded ? 'expanded' : ''}">▶</span>
      </button>
      <span class="context-title"
        >Current Context ({context.length} messages)</span
      >
    </div>
    <div class="context-header-right">
      <button 
        class="refresh-context-button" 
        onclick={refreshContext}
        title="Refresh context"
        aria-label="Refresh context"
      >
        ↺
      </button>
      <button 
        class="delete-context-button" 
        onclick={deleteContext}
        title="Clear context"
        aria-label="Clear context"
      >
        delete context
      </button>
    </div>
  </div>
  {#if contextExpanded}
    <div class="context-content">
      {#if context.length === 0}
        <div class="empty-context">No messages in context yet.</div>
      {:else}
        {#each context as msg, idx (idx)}
          <div class="context-message">
            <div class="context-role {msg.role}">{msg.role}</div>
            <div class="context-text">
              {#if msg.content}
                <pre>{msg.content}</pre>
              {:else if msg.tool_calls}
                <pre>{JSON.stringify(msg.tool_calls, null, 2)}</pre>
              {:else}
                <pre>(empty)</pre>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .context-section {
    border-top: 1px solid rgba(214, 214, 214, 0.224);
    background: rgba(255, 0, 0, 0.02);
  }

  .context-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .context-header:hover {
    border-top: 0.5px solid rgba(255, 255, 255, 0.342);
  }

  .context-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .context-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .context-title {
    font-size: 13px;
    font-weight: 600;
    color: #e6edf3;
  }

  .refresh-context-button {
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
    flex-shrink: 0;
    min-width: 28px;
  }

  .refresh-context-button:hover {
    border-color: rgba(88, 166, 255, 0.7);
    color: #79c0ff;
    background: rgba(88, 166, 255, 0.1);
  }

  .refresh-context-button:active {
    background: rgba(88, 166, 255, 0.2);
  }

  .delete-context-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .delete-context-button:hover {
    border-color: rgba(248, 81, 73, 0.7);
    color: #ff7b72;
    background: rgba(248, 81, 73, 0.1);
  }

  .delete-context-button:active {
    background: rgba(248, 81, 73, 0.2);
  }

  .context-content {
    max-height: 300px;
    overflow-y: auto;
    padding: 0 12px 12px 12px;
    border-top: 1px solid rgba(214, 214, 214, 0.153);
  }

  .empty-context {
    color: rgba(230, 237, 243, 0.7);
    font-size: 12px;
    padding: 10px 0;
  }

  .context-message {
    display: flex;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(214, 214, 214, 0.1);
  }

  .context-message:last-child {
    border-bottom: none;
  }

  .context-role {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
    text-transform: uppercase;
    height: fit-content;
  }

  .context-role.user {
    background: rgba(46, 160, 67, 0.2);
    color: #7ee787;
    border: 1px solid rgba(46, 160, 67, 0.4);
  }

  .context-role.assistant {
    background: rgba(88, 166, 255, 0.2);
    color: #79c0ff;
    border: 1px solid rgba(88, 166, 255, 0.4);
  }

  .context-role.system {
    background: rgba(210, 153, 34, 0.2);
    color: #f2cc60;
    border: 1px solid rgba(210, 153, 34, 0.4);
  }

  .context-role.tool {
    background: rgba(188, 143, 255, 0.2);
    color: #d2a8ff;
    border: 1px solid rgba(188, 143, 255, 0.4);
  }

  .context-text {
    flex: 1;
    font-size: 12px;
    color: #c9d1d9;
  }

  .context-text pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: monospace;
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
</style>
