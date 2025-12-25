<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import TextInput from "./TextInput.svelte";
  import TextArea from "./TextArea.svelte";
  import type { ChatMessage } from "../../types";

  let messages: ChatMessage[] = $state([]);
  let chatText = $state("");
  let isSending = $state(false);
  let contextEventSource: EventSource | null = null;

  const AGENT_URL =
    import.meta.env.VITE_AGENT_URL || "http://localhost:3002/api";
  const INSPECTION_URL =
    import.meta.env.VITE_INSPECTION_URL || "http://localhost:6969/api";

  // Listen to context changes to detect when context is cleared
  onMount(() => {
    contextEventSource = new EventSource(
      INSPECTION_URL + "/inspection/context"
    );

    contextEventSource.onmessage = (event: MessageEvent) => {
      try {
        const newContext = JSON.parse(event.data);
        // If context is cleared (empty array), also clear local chat messages
        if (Array.isArray(newContext) && newContext.length === 0) {
          messages = [];
          updateChatText();
        }
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
</script>

<div id="chat">
  <TextArea text={chatText} />
  {#if isSending}
    <div class="status">Thinking...</div>
  {/if}
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

  .status {
    font-size: 16px;
    color: #b0b0b0;
  }
</style>
