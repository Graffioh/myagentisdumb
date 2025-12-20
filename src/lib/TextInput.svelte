<script lang="ts">
  let message = $state("");
  let { onsend } = $props();
</script>

<div class="input-container">
  <textarea
    placeholder="Chat with the agent..."
    bind:value={message}
    onkeypress={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        onsend(message);
        message = "";
        e.preventDefault();
      }
    }}
  ></textarea>

  <button
    onclick={() => {
      onsend(message);
      message = "";
    }}
  >
    Send</button
  >
</div>

<style>
  .input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  textarea {
    height: 80px;
    resize: none;
    font-family: inherit;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: #e6edf3;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }

  textarea:focus {
    outline: none;
    border-color: rgba(88, 166, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  button {
    align-self: flex-end;
    padding: 6px 16px;
    background: #fbce51;
    color: #000000;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: #ffe046ca;
  }
</style>
