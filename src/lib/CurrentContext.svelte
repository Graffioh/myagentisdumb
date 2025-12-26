<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ContextUsageBar from "./ContextUsageBar.svelte";
  import type {
    AgentToolDefinition,
    ContextMessage,
  } from "../../protocol/types";
  import type { TokenUsage } from "../../protocol/types";

  let context: ContextMessage[] = $state([]);
  let tokenUsage: TokenUsage = $state({
    totalTokens: 0,
    contextLimit: null,
    remainingTokens: null,
  });
  let contextExpanded = $state(false);
  let activeTab: "context" | "tools" | "usage" = $state("usage");
  let toolDefinitions: AgentToolDefinition[] = $state([]);
  let contextEventSource: EventSource | null = null;
  let tokenEventSource: EventSource | null = null;
  let toolEventSource: EventSource | null = null;

  // Count tool calls per tool name
  const toolCallCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const msg of context) {
      if ("tool_calls" in msg && msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          const toolName = toolCall.function.name;
          counts[toolName] = (counts[toolName] || 0) + 1;
        }
      }
    }
    return counts;
  });

  // Calculate token breakdown by category
  const tokenBreakdown = $derived.by(() => {
    // Estimate tokens using ~4 characters = 1 token (typical for English text)
    const estimateTokens = (text: string) => {
      return Math.ceil(text.length / 4);
    };

    // System prompt tokens are FIXED
    let systemTokens = 0;
    for (const msg of context) {
      if (msg.role === "system") {
        systemTokens += estimateTokens(msg.content || "");
      }
    }
    
    // Tool definitions tokens are FIXED
    // ~1.5x for schema overhead when sending tool defs to LLM (they convert them to natural language prompt)
    const toolTokens = toolDefinitions.length === 0 
      ? 0 
      : Math.ceil(estimateTokens(JSON.stringify(toolDefinitions)) * 1.5);
    
    // Calculate conversation tokens from actual messages (GROWING, not fixed)
    let conversationTokens = 0;
    for (const msg of context) {
      if (msg.role === "user" || msg.role === "assistant") {
        if ("content" in msg && msg.content) {
          conversationTokens += estimateTokens(msg.content);
        }
        if ("tool_calls" in msg && msg.tool_calls) {
          // Tool calls include function name + arguments + formatting overhead
          conversationTokens += Math.ceil(estimateTokens(JSON.stringify(msg.tool_calls)) * 1.2);
        }
      } else if (msg.role === "tool") {
        // Tool responses also have some formatting overhead
        conversationTokens += Math.ceil(estimateTokens(msg.content || "") * 1.1);
      }
    }

    // Calculate current context size (what would be sent in the next API call)
    const currentContextTokens = systemTokens + toolTokens + conversationTokens;
    
    // Get context limits from API
    const limit = tokenUsage.contextLimit || 100000;
    const hasContextLimit = tokenUsage.contextLimit !== null;
    
    const remaining = Math.max(0, limit - currentContextTokens);

    return {
      systemTokens,
      toolTokens,
      conversationTokens,
      remainingTokens: remaining,
      totalLimit: limit,
      usedTokens: currentContextTokens,
      hasContextLimit,
    };
  });

  const AGENT_URL =
    import.meta.env.VITE_AGENT_URL || "http://localhost:3002/api";
  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:6969/api";

  async function refreshContext(e: MouseEvent) {
    e.stopPropagation();

    try {
      const [contextResponse, tokenResponse, toolsResponse] = await Promise.all([
        fetch(INSPECTION_URL + "/inspection/context/current", {
          method: "GET",
        }),
        fetch(INSPECTION_URL + "/inspection/tokens/current", {
          method: "GET",
        }),
        fetch(INSPECTION_URL + "/inspection/tools/current", {
          method: "GET",
        }),
      ]);

      if (contextResponse.ok) {
        const currentContext = await contextResponse.json();
        context = currentContext;
      } else {
        console.error("Failed to refresh context");
      }

      if (tokenResponse.ok) {
        const currentTokenUsage = await tokenResponse.json();
        tokenUsage = currentTokenUsage;
      } else {
        console.error("Failed to refresh token usage");
      }

      if (toolsResponse.ok) {
        const currentTools = await toolsResponse.json();
        toolDefinitions = currentTools;
      } else {
        console.error("Failed to refresh tool definitions");
      }
    } catch (error) {
      console.error("Error refreshing context:", error);
    }
  }

  function formatTokens(num: number | null): string {
    if (num === null) {
      return "?";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  }

  onMount(() => {
    contextEventSource = new EventSource(
      INSPECTION_URL + "/inspection/context"
    );

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

    tokenEventSource = new EventSource(INSPECTION_URL + "/inspection/tokens");

    tokenEventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.totalTokens !== undefined) {
          tokenUsage = data;
        }
      } catch (e) {
        console.error("Failed to parse token data:", e);
      }
    };

    tokenEventSource.onerror = () => {
      console.error("Token SSE connection error");
    };

    toolEventSource = new EventSource(INSPECTION_URL + "/inspection/tools");

    toolEventSource.onmessage = (event: MessageEvent) => {
      try {
        const tools = JSON.parse(event.data);
        toolDefinitions = tools;
      } catch (e) {
        console.error("Failed to parse tool definitions data:", e);
      }
    };

    toolEventSource.onerror = () => {
      console.error("Tool definitions SSE connection error");
    };
  });

  onDestroy(() => {
    contextEventSource?.close();
    contextEventSource = null;
    tokenEventSource?.close();
    tokenEventSource = null;
    toolEventSource?.close();
    toolEventSource = null;
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
      <span class="token-info">
        {formatTokens(tokenBreakdown.usedTokens)} / {formatTokens(
          tokenUsage.contextLimit ?? null
        )} tokens
      </span>
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
    </div>
  </div>
  {#if contextExpanded}
    <div class="tabs-container">
      <div class="tabs-header">
        <button
          class="tab-button usage-tab {activeTab === 'usage' ? 'active' : ''}"
          onclick={(e) => {
            e.stopPropagation();
            activeTab = "usage";
          }}
        >
          usage
        </button>
        <button
          class="tab-button {activeTab === 'context' ? 'active' : ''}"
          onclick={(e) => {
            e.stopPropagation();
            activeTab = "context";
          }}
        >
          messages
        </button>
        <button
          class="tab-button tools-tab {activeTab === 'tools' ? 'active' : ''}"
          onclick={(e) => {
            e.stopPropagation();
            activeTab = "tools";
          }}
        >
          tools
        </button>
      </div>
      <div class="context-content">
        {#if activeTab === "usage"}
          <ContextUsageBar breakdown={tokenBreakdown} />
        {:else if activeTab === "context"}
          {#if context.length === 0}
            <div class="empty-context">No messages in context yet.</div>
          {:else}
            {#each context as ctx, idx (idx)}
              <div class="context-message">
                <div class="context-role {ctx.role}">{ctx.role}</div>
                <div class="context-text">
                  {#if "tool_calls" in ctx && ctx.tool_calls}
                    <pre>{JSON.stringify(ctx.tool_calls, null, 2)}</pre>
                  {:else if "content" in ctx && ctx.content}
                    <pre>{ctx.content}</pre>
                  {:else}
                    <pre>(empty)</pre>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        {:else if activeTab === "tools"}
          {#if toolDefinitions.length === 0}
            <div class="empty-context">No tool definition available.</div>
          {:else}
            {#each toolDefinitions as tool, idx (idx)}
              <div class="tool-definition">
                <div class="tool-name-container">
                  <div class="tool-name">{tool.function.name}</div>
                  {#if toolCallCounts[tool.function.name]}
                    <span
                      class="tool-call-count"
                      title="Number of times this tool has been called"
                    >
                      ({toolCallCounts[tool.function.name]} calls)
                    </span>
                  {/if}
                </div>
                <div class="tool-description">{tool.function.description}</div>
                <pre class="tool-params">{JSON.stringify(
                    tool.function.parameters,
                    null,
                    2
                  )}</pre>
              </div>
            {/each}
          {/if}
        {/if}
      </div>
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

  .token-info {
    font-size: 11px;
    color: rgba(201, 209, 217, 0.7);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 8px;
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

  .tabs-container {
    border-top: 1px solid rgba(214, 214, 214, 0.153);
  }

  .tabs-header {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(214, 214, 214, 0.153);
    background: rgba(0, 0, 0, 0.1);
  }

  .tab-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(201, 209, 217, 0.7);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 12px;
    transition: all 0.2s;
    text-transform: lowercase;
  }

  .tab-button:hover {
    border-color: rgba(88, 166, 255, 0.5);
    color: rgba(201, 209, 217, 0.9);
    background: rgba(88, 166, 255, 0.05);
  }

  .tab-button.tools-tab:hover {
    border-color: rgba(188, 143, 255, 0.5);
    background: rgba(188, 143, 255, 0.05);
  }

  .tab-button.active {
    border-color: rgba(88, 166, 255, 0.7);
    color: #79c0ff;
    background: rgba(88, 166, 255, 0.15);
  }

  .tab-button.tools-tab.active {
    border-color: rgba(188, 143, 255, 0.7);
    color: #d2a8ff;
    background: rgba(188, 143, 255, 0.15);
  }

  .tool-definition {
    padding: 8px 0;
    border-bottom: 1px solid rgba(214, 214, 214, 0.1);
  }

  .tool-definition:last-child {
    border-bottom: none;
  }

  .tool-name-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .tool-name {
    font-size: 12px;
    font-weight: 600;
    color: #d2a8ff;
  }

  .tool-call-count {
    font-size: 11px;
    color: rgb(201, 209, 217);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .tool-description {
    font-size: 11px;
    color: rgba(201, 209, 217, 0.8);
    margin-bottom: 6px;
  }

  .tool-params {
    font-size: 10px;
    color: rgba(201, 209, 217, 0.6);
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: 4px;
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .tab-button.usage-tab:hover {
    border-color: rgba(46, 160, 67, 0.5);
    background: rgba(46, 160, 67, 0.05);
  }

  .tab-button.usage-tab.active {
    border-color: rgba(46, 160, 67, 0.7);
    color: #7ee787;
    background: rgba(46, 160, 67, 0.15);
  }
</style>
