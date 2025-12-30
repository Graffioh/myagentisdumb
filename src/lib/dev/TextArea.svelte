<script lang="ts">
  let { text }: { text: string } = $props();
</script>

<div class="chat-display">
  <div class="placeholder-text">Optional panel used for development</div>
  <div class="chat-content">{@html text}</div>
</div>

<style>
  .chat-display {
    flex: 1;
    min-height: 0;
    resize: none;
    font-size: 15px;
    font-family: inherit;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    color: #e6edf3;
    margin-bottom: 0;
    white-space: normal;
    line-height: 1.6;
    word-break: break-word;
    overflow-y: auto;
    position: relative;
  }

  .placeholder-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #737373;
    font-size: 14px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.5;
  }

  .chat-content {
    position: relative;
    z-index: 1;
  }
</style>
