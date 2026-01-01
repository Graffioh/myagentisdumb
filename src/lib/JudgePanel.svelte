<script lang="ts">
</script>

<div class="judge-panel">
  <div class="header">
    <h2>LLM Judge</h2>
  </div>

  <div class="content">
    <div class="placeholder">
      <p>LLM as a Judge (WIP)</p>
      <p class="hint">Evaluate agent responses with LLM powered analysis</p>
    </div>
  </div>
</div>

<style>
  .judge-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #e6edf3;
  }

  .header {
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  .header h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: rgba(230, 237, 243, 0.9);
  }

  .content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .placeholder {
    text-align: center;
    color: rgba(230, 237, 243, 0.5);
  }

  .placeholder .icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }

  .placeholder p {
    margin: 0;
    font-size: 14px;
  }

  .placeholder .hint {
    margin-top: 8px;
    font-size: 12px;
    color: rgba(230, 237, 243, 0.35);
  }
</style>
