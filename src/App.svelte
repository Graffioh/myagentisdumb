<script lang="ts">
  import InspectionPanel from "./lib/InspectionPanel.svelte";
  import JudgePanel from "./lib/JudgePanel.svelte";

  let chatWindow: Window | null = null;
  let judgeOpen = $state(false);

  function openChatPopup() {
    if (chatWindow && !chatWindow.closed) {
      chatWindow.focus();
      return;
    }

    chatWindow = window.open(
      "/chat.html",
      "maid-chat",
      "width=600,height=700,resizable=yes,scrollbars=yes"
    );
  }

  function toggleJudge() {
    judgeOpen = !judgeOpen;
  }
</script>

<main>
  <div id="panels">
    <div id="panel-inspection">
      <InspectionPanel onOpenChat={openChatPopup} />
    </div>
    <button
      class="judge-toggle"
      onclick={toggleJudge}
      aria-label={judgeOpen ? "Collapse judge panel" : "Expand judge panel"}
      aria-expanded={judgeOpen}
    >
      <span class="arrow {judgeOpen ? '' : 'collapsed'}">▶</span>
    </button>
    <div id="panel-judge" class={judgeOpen ? "" : "collapsed"}>
      <div id="judge-content" class={judgeOpen ? "" : "hidden"}>
        <JudgePanel />
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
  }

  #panel-judge {
    width: 350px;
    transition: width 0.3s ease;
    flex-shrink: 0;
    background: rgb(15, 15, 15);
  }

  #panel-judge.collapsed {
    width: 0;
    overflow: hidden;
  }

  #judge-content {
    height: 100%;
    overflow: hidden;
  }

  #judge-content.hidden {
    display: none;
  }

  .judge-toggle {
    background: rgb(0, 0, 0);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-top: 0;
    border-bottom: 0;
    border-radius: 0;
    color: rgba(230, 237, 243, 0.65);
    cursor: pointer;
    padding: 8px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    width: 30px;
    height: 100%;
    z-index: 10;
  }

  .judge-toggle:hover {
    background: rgba(45, 45, 45, 0.892);
    color: #e6edf3;
  }

  .judge-toggle:active {
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

  :global(*:focus) {
    outline: none;
  }
</style>
