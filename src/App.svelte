<script lang="ts">
  import Chat from "./lib/Chat.svelte";
  import InspectionPanel from "./lib/InspectionPanel.svelte";

  let chatOpen = $state(false);

  function toggleChat() {
    chatOpen = !chatOpen;
  }
</script>

<main>
  <div id="panels">
    <div id="panel-inspection">
      <InspectionPanel />
    </div>
    <button
      class="chat-toggle"
      onclick={toggleChat}
      aria-label={chatOpen ? "Collapse chat panel" : "Expand chat panel"}
      aria-expanded={chatOpen}
    >
      <span class="arrow {chatOpen ? '' : 'collapsed'}">▶</span>
    </button>
    <div id="panel-chat" class={chatOpen ? "" : "collapsed"}>
      <div id="chat-content" class={chatOpen ? "" : "hidden"}>
        <Chat />
      </div>
    </div>
  </div>
</main>

<style>
  main {
    height: 100%;
  }

  #panels {
    display: flex;
    flex-direction: row;
    gap: 0;
    width: 100%;
    height: 100%;
    align-items: stretch;
    background: black;
  }

  #panel-inspection {
    flex: 1;
    min-width: 0;
    transition: all 0.3s ease;
  }

  #panel-chat {
    width: 600px;
    transition: width 0.3s ease;
    flex-shrink: 0;
    background: black;
  }

  #panel-chat.collapsed {
    width: 0;
    overflow: hidden;
  }

  #chat-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    height: 100%;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: rgb(0, 0, 0);
    box-sizing: border-box;
  }

  #chat-content.hidden {
    display: none;
  }

  .chat-toggle {
    background: rgb(0, 0, 0);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0;
    color: rgba(230, 237, 243, 0.65);
    cursor: pointer;
    padding: 8px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    width: 40px;
    height: 100%;
    z-index: 10;
  }

  .chat-toggle:hover {
    background: rgba(45, 45, 45, 0.892);
    color: #e6edf3;
    border-color: rgba(88, 166, 255, 0.5);
  }

  .chat-toggle:active {
    background: rgba(0, 0, 0, 0.15);
  }

  .arrow {
    font-size: 12px;
    transition: transform 0.3s ease;
    display: inline-block;
  }

  .arrow.collapsed {
    transform: rotate(180deg);
  }
</style>
