<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import TextInput from "./TextInput.svelte";
  import TextArea from "./TextArea.svelte";
  import type { ChatMessage } from "../../types";
  import { subscribeSSE } from "../../utils/sse.svelte";

  let messages: ChatMessage[] = $state([]);
  let chatText = $state("");
  let isSending = $state(false);
  let unsubscribeSSE: (() => void) | null = null;

  const AGENT_URL =
    import.meta.env.VITE_AGENT_URL || "http://localhost:3002/api";

  onMount(() => {
    unsubscribeSSE = subscribeSSE({
      onContext: (ctx) => {
        if (ctx.length === 0) {
          messages = [];
          updateChatText();
        }
      },
    });
  });

  onDestroy(() => {
    unsubscribeSSE?.();
    unsubscribeSSE = null;
  });

  function updateChatText() {
    chatText = messages
      .map(
        (m) => `<b>${m.role === "user" ? "You" : "Assistant"}:</b> ${m.content}`
      )
      .join("<br><br>");
  }

  async function handleSend(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || isSending) return;

    messages = [...messages, { role: "user", content: trimmed }];
    updateChatText();
    isSending = true;

    try {
      const response = await fetch(AGENT_URL + "/agent", {
        method: "POST",
        body: JSON.stringify({ prompt: trimmed }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      messages = [...messages, { role: "assistant", content: data.text }];
      updateChatText();
    } catch (err) {
      console.error("handleSend error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      messages = [
        ...messages,
        { role: "assistant", content: `Error: ${message}` },
      ];
      updateChatText();
    } finally {
      isSending = false;
    }
  }

  async function deleteContext() {
    try {
      const response = await fetch(AGENT_URL + "/agent/context", {
        method: "DELETE",
      });

      if (response.ok) {
        messages = [];
        updateChatText();
      } else {
        console.error("Failed to delete context");
      }
    } catch (error) {
      console.error("Error deleting context:", error);
    }
  }
</script>

<div id="chat">
  <TextArea text={chatText} />
  <div class="status-container">
    {#if isSending}
      <div class="status">Thinking...</div>
    {/if}
  </div>
  <div class="chat-footer">
    <button
      class="delete-context-button"
      onclick={deleteContext}
      title="Clear context"
      aria-label="Clear context"
    >
      delete context
    </button>
  </div>
  <TextInput onsend={handleSend} disabled={isSending} />
</div>

<style>
  #chat {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    box-sizing: border-box;
  }

  .chat-footer {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
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

  .status-container {
    min-height: 24px;
    display: flex;
    align-items: center;
  }

  .status {
    font-size: 16px;
    color: #b0b0b0;
  }
</style>
