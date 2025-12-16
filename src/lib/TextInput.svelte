<script lang="ts">
  let message = $state("");
  let { onsend } = $props();
</script>

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

<style>
  textarea {
    height: 10%;
    resize: none;
    font-family: inherit;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 5px;
  }
</style>
