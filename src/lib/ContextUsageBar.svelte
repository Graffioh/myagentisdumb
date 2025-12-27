<script lang="ts">
  interface TokenBreakdown {
    systemTokens: number;
    toolTokens: number;
    conversationTokens: number;
    remainingTokens: number;
    totalLimit: number;
    hasContextLimit: boolean;
  }

  interface Props {
    breakdown: TokenBreakdown;
  }

  let { breakdown }: Props = $props();

  function formatTokens(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  }

  const safeTotal = $derived(breakdown.totalLimit > 0 ? breakdown.totalLimit : 1);

  const segmentWidths = $derived({
    system: Math.max(0, (breakdown.systemTokens / safeTotal) * 100),
    tools: Math.max(0, (breakdown.toolTokens / safeTotal) * 100),
    conversation: Math.max(0, (breakdown.conversationTokens / safeTotal) * 100),
    remaining: breakdown.hasContextLimit
      ? Math.max(0, (breakdown.remainingTokens / safeTotal) * 100)
      : 0,
  });

  const remainingDisplay = $derived(
    breakdown.hasContextLimit
      ? formatTokens(breakdown.remainingTokens)
      : "No limit"
  );
</script>

<div class="usage-visualization">
  <div class="usage-bar" aria-hidden="true">
    <div
      class="usage-segment system-prompt"
      style="width: {segmentWidths.system}%"
      title="System Prompt: {formatTokens(breakdown.systemTokens)} tokens"
    ></div>
    <div
      class="usage-segment tools"
      style="width: {segmentWidths.tools}%"
      title="Tools: {formatTokens(breakdown.toolTokens)} tokens"
    ></div>
    <div
      class="usage-segment conversation"
      style="width: {segmentWidths.conversation}%"
      title="User/Assistant: {formatTokens(breakdown.conversationTokens)} tokens"
    ></div>
    <div
      class="usage-segment remaining"
      style="width: {segmentWidths.remaining}%"
      title="Remaining: {remainingDisplay} tokens"
    ></div>
  </div>
  <div class="usage-legend">
    <div class="legend-item">
      <div class="legend-color system-prompt"></div>
      <span class="legend-label">System Prompt</span>
      <span class="legend-value">{formatTokens(breakdown.systemTokens)}</span>
    </div>
    <div class="legend-item">
      <div class="legend-color tools"></div>
      <span class="legend-label">Tools</span>
      <span class="legend-value">{formatTokens(breakdown.toolTokens)}</span>
    </div>
    <div class="legend-item">
      <div class="legend-color conversation"></div>
      <span class="legend-label">User/Assistant</span>
      <span class="legend-value"
        >{formatTokens(breakdown.conversationTokens)}</span
      >
    </div>
    <div class="legend-item">
      <div class="legend-color remaining"></div>
      <span class="legend-label">Remaining</span>
      <span class="legend-value">{remainingDisplay}</span>
    </div>
  </div>
</div>

<style>
  .usage-visualization {
    padding: 16px 0;
  }

  .usage-bar {
    display: flex;
    width: 100%;
    height: 40px;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 16px;
    background: #000000;
    border: 1px solid rgba(230, 237, 243, 0.3);
  }

  .usage-segment {
    height: 100%;
    transition: all 0.2s ease;
    position: relative;
    min-width: 0;
    border-right: 1px solid rgba(0, 0, 0, 0.3);
  }

  .usage-segment:last-child {
    border-right: none;
  }

  .usage-segment:hover {
    cursor: default;
    filter: brightness(1.15);
  }

  .usage-segment.system-prompt {
    background: rgba(210, 153, 34, 0.5);
  }

  .usage-segment.tools {
    background: rgba(188, 143, 255, 0.5);
  }

  .usage-segment.conversation {
    background: rgba(88, 166, 255, 0.5);
  }

  .usage-segment.remaining {
    background: rgb(15, 15, 15);
  }

  .usage-legend {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: rgba(230, 237, 243, 0.7);
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
    border: 1px solid rgba(230, 237, 243, 0.3);
  }

  .legend-color.system-prompt {
    background: rgba(210, 153, 34, 0.5);
  }

  .legend-color.tools {
    background: rgba(188, 143, 255, 0.5);
  }

  .legend-color.conversation {
    background: rgba(88, 166, 255, 0.5);
  }

  .legend-color.remaining {
    background: rgba(230, 237, 243, 0.15);
  }

  .legend-label {
    flex: 1;
  }

  .legend-value {
    font-weight: 600;
    color: #e6edf3;
    font-family: monospace;
    font-size: 11px;
  }
</style>

