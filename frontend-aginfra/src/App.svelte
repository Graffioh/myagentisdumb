<script lang="ts">
  import Chat from './lib/Chat.svelte'
</script>

<main>
  <div id="panels">
    <div id="panel1">
      Agent inspection panel
    </div>
    <div id="panel2">
      <Chat />
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
    gap: 10px;
    width: 100%;
    height: 100%;
  }

  #panel1 {
    width: 50%;
    background-color: red;
  }

  #panel2 {
    width: 50%;
    background-color: green;
  }
</style>
