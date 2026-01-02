<script lang="ts">
  import { evaluationManager } from "../managers/evaluation.svelte";

  const evalState = $derived(evaluationManager.state);
  let promptExpanded = $state(false);

  function getScoreColor(score: number): string {
    if (score >= 8) return "#7ee787";
    if (score >= 6) return "#f0e68c";
    if (score >= 4) return "#ffa657";
    return "#f85149";
  }

  function getScoreLabel(score: number): string {
    if (score >= 9) return "Excellent";
    if (score >= 8) return "Very Good";
    if (score >= 7) return "Good";
    if (score >= 6) return "Satisfactory";
    if (score >= 5) return "Average";
    if (score >= 4) return "Below Average";
    if (score >= 3) return "Poor";
    return "Very Poor";
  }
</script>

<div class="judge-panel">
  <div class="header">
    <h2>LLM Judge</h2>
  </div>

  <div class="content">
    <details class="prompt-details" bind:open={promptExpanded}>
      <summary>Custom Evaluation Prompt</summary>
      <div class="system-prompt-section">
        <textarea
          id="system-prompt"
          placeholder="Enter a custom evaluation prompt... (leave empty to use default)"
          bind:value={evaluationManager.customSystemPrompt}
          rows="3"
        ></textarea>
        <p class="hint">
          If empty, the default evaluation criteria will be used.
          <span class="hint-note">Note: If a custom prompt is set in the agent loop via the reporter, that one will be used instead.</span>
        </p>
      </div>
    </details>
    {#if evalState.isLoading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Evaluating response...</p>
      </div>
    {:else if evalState.error}
      <div class="error-state">
        <p class="error-title">Evaluation Failed</p>
        <p class="error-message">{evalState.error}</p>
        <button class="retry-button" onclick={() => evaluationManager.clear()}>Dismiss</button>
      </div>
    {:else if evalState.result}
      <div class="evaluation">
        <button class="clear-button" onclick={() => evaluationManager.clear()}>Clear Result</button>
        <div class="overall-score" style="--score-color: {getScoreColor(evalState.result.overallScore)}">
          <div class="score-value">{evalState.result.overallScore.toFixed(1)}</div>
          <div class="score-max">/10</div>
          <div class="score-label">{getScoreLabel(evalState.result.overallScore)}</div>
        </div>

        <div class="scores-grid">
          {#each Object.entries(evalState.result.scores) as [key, value]}
            <div class="score-card">
              <div class="score-card-value" style="color: {getScoreColor(value as number)}">{value}</div>
              <div class="score-card-label">{key}</div>
            </div>
          {/each}
        </div>

        <div class="summary-section">
          <h3>Summary</h3>
          <p>{evalState.result.summary}</p>
        </div>

        {#if evalState.result.strengths.length > 0}
          <div class="list-section strengths">
            <h3>✓ Strengths</h3>
            <ul>
              {#each evalState.result.strengths as strength}
                <li>{strength}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if evalState.result.weaknesses.length > 0}
          <div class="list-section weaknesses">
            <h3>✗ Weaknesses</h3>
            <ul>
              {#each evalState.result.weaknesses as weakness}
                <li>{weakness}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if evalState.result.suggestions.length > 0}
          <div class="list-section suggestions">
            <h3>💡 Suggestions</h3>
            <ul>
              {#each evalState.result.suggestions as suggestion}
                <li>{suggestion}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="context-section">
          <details>
            <summary>View Evaluated Content</summary>
            <div class="context-content">
              <div class="context-item">
                <span class="context-label">User Query</span>
                <pre>{evalState.userQuery}</pre>
              </div>
              <div class="context-item">
                <span class="context-label">Agent Response</span>
                <pre>{evalState.agentResponse}</pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    {:else}
      <div class="placeholder">
        <p>LLM as a Judge</p>
        <p class="hint">Click the 'EVAL' button on any assistant response to evaluate it</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .judge-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #e6edf3;
    overflow: hidden;
    background: rgb(0, 0, 0);
  }

  .header {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(214, 214, 214, 0.224);
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.03);
  }

  .header h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #e6edf3;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .system-prompt-section {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .prompt-details {
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    border: 1px solid rgba(214, 214, 214, 0.153);
  }

  .prompt-details > summary {
    padding: 10px 12px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: rgba(201, 209, 217, 0.7);
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s;
  }

  .prompt-details > summary::-webkit-details-marker {
    display: none;
  }

  .prompt-details > summary::before {
    content: "▶";
    font-size: 10px;
    color: rgba(230, 237, 243, 0.65);
    transition: transform 0.2s;
    display: inline-block;
  }

  .prompt-details[open] > summary::before {
    transform: rotate(90deg);
  }

  .prompt-details > summary:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .prompt-details .system-prompt-section {
    padding: 0 12px 12px;
    margin-bottom: 0;
  }

  .system-prompt-section textarea {
    width: 100%;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: #c9d1d9;
    font-size: 12px;
    resize: vertical;
    min-height: 60px;
    font-family: monospace;
  }

  .system-prompt-section textarea:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }

  .system-prompt-section textarea::placeholder {
    color: rgba(201, 209, 217, 0.4);
  }

  .system-prompt-section .hint {
    margin: 0;
    font-size: 11px;
    color: rgba(201, 209, 217, 0.5);
  }

  .system-prompt-section .hint .hint-note {
    display: block;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
  }

  .placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: rgba(201, 209, 217, 0.7);
  }

  .placeholder p {
    margin: 0;
    font-size: 13px;
  }

  .placeholder .hint {
    margin-top: 8px;
    font-size: 11px;
    color: rgba(201, 209, 217, 0.5);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    gap: 12px;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(88, 166, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading p {
    color: rgba(201, 209, 217, 0.7);
    font-size: 12px;
  }

  .error-state {
    text-align: center;
    padding: 20px;
  }

  .error-title {
    color: #ff7b72;
    font-weight: 600;
    font-size: 13px;
    margin: 0 0 8px 0;
  }

  .error-message {
    color: rgba(201, 209, 217, 0.7);
    font-size: 12px;
    margin: 0 0 12px 0;
  }

  .retry-button,
  .clear-button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(201, 209, 217, 0.7);
    padding: 4px 12px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .retry-button:hover,
  .clear-button:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
    color: rgba(201, 209, 217, 0.9);
  }

  .evaluation {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .overall-score {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    border: 1px solid rgba(214, 214, 214, 0.153);
  }

  .score-value {
    font-size: 42px;
    font-weight: 700;
    color: var(--score-color);
    line-height: 1;
  }

  .score-max {
    font-size: 20px;
    color: rgba(201, 209, 217, 0.5);
  }

  .score-label {
    width: 100%;
    text-align: center;
    font-size: 13px;
    color: var(--score-color);
    margin-top: 8px;
    font-weight: 500;
  }

  .scores-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .score-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(214, 214, 214, 0.153);
    border-radius: 4px;
    padding: 10px 6px;
    text-align: center;
  }

  .score-card-value {
    font-size: 18px;
    font-weight: 600;
  }

  .score-card-label {
    font-size: 10px;
    color: rgba(201, 209, 217, 0.6);
    text-transform: capitalize;
    margin-top: 4px;
  }

  .summary-section,
  .list-section {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    padding: 10px 12px;
    border: 1px solid rgba(214, 214, 214, 0.1);
  }

  .summary-section h3,
  .list-section h3 {
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 600;
    color: rgba(201, 209, 217, 0.7);
    text-transform: uppercase;
  }

  .summary-section p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #c9d1d9;
  }

  .list-section ul {
    margin: 0;
    padding-left: 16px;
  }

  .list-section li {
    font-size: 12px;
    line-height: 1.5;
    color: #c9d1d9;
    margin-bottom: 4px;
  }

  .strengths h3 {
    color: #7ee787;
  }

  .weaknesses h3 {
    color: #ffa657;
  }

  .suggestions h3 {
    color: #79c0ff;
  }

  .context-section {
    margin-top: 4px;
  }

  .context-section details {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    border: 1px solid rgba(214, 214, 214, 0.153);
  }

  .context-section summary {
    padding: 10px 12px;
    cursor: pointer;
    font-size: 12px;
    color: rgba(201, 209, 217, 0.6);
    transition: color 0.15s;
  }

  .context-section summary:hover {
    color: rgba(201, 209, 217, 0.9);
  }

  .context-content {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .context-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .context-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(201, 209, 217, 0.5);
    text-transform: uppercase;
  }

  .context-content pre {
    margin: 0;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #c9d1d9;
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: 4px;
    max-height: 150px;
    overflow-y: auto;
    font-family: monospace;
  }

  .clear-button {
    align-self: center;
    margin-top: 4px;
  }
</style>
