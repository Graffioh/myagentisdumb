# my agent is dumb (maid)

<p align="center">
  <img width="200" height="180" alt="maid-logo"
       src="https://github.com/user-attachments/assets/2c52da38-c4e0-4221-aee5-93d7e4ed5f7d" />
</p>

my agent is dumb (maid) is a telemetry dev tool to inspect your agent behavior via agent traces.

*(Under development)*

## Why this and not other solutions?

1) Open source
2) It's customizable based on your needs
3) It has a really cool mascot

## Usage

### With Docker (frontend + inspection backend)

- Start both services:
  - `docker compose up --build`
- Open the UI:
  - `http://localhost:5555`
- Connect your own agent 
  - or if you want to understand how the dev tool works, spin up the one in `/dummy-agent`

### Without Docker

- Start the **frontend**: npm run dev:frontend
- Start the **inspection backend**: npm run dev:inspection
- (Optional) Start the **agent**: npm run dev:agent

## Tracking your own agent

How it works?

You have at your disposal methods present in the `InspectorReporter` (`/reporter`) that can be used as *manual hooks* during your agent loop lifecycle.

You can treat these methods as enhanced console logs.

Note: If you don't use typescript, just adapt the code present in the reporter based on your programming language of choice.

### What to pass to the inspector for reporting

When you send SSE events to the inspector to be displayed in the Agent inspection panel you must send specific constrained informations (if you don't customize the frontend).

The main component is the `reporter`:
```ts
import { createHttpInspectionReporter } from "./reporter";
import { InspectionEventLabel } from "./protocol/types";

const reporter = createHttpInspectionReporter();
```

Below are some examples of what informations you can send:

#### Simple log

The `log()` method sends simple string messages without structured children.

```ts
await reporter.log("Full OpenRouter API response: ...");
await reporter.log("Model message: ...");
```

#### Structured trace

The `trace()` method sends events with a parent/child structure that will be displayed with expandable reasoning details in the UI. The reasoning label will be highlighted in orange to distinguish it from other content (if provided).

```ts
// Send a trace event with reasoning
await reporter.trace(
    "Final Assistant message",
    [
        { label: InspectionEventLabel.Reasoning, data: reasoning },
        { label: InspectionEventLabel.Content, data: finalContent }
    ]
);
```

You can optionally include token usage information that will be displayed as a child node:

```ts
await reporter.trace(
    "API request completed",
    [
        { label: InspectionEventLabel.Content, data: "..." }
    ],
    {
        promptTokens: 340,
        modelOutputTokens: 49,
        totalTokens: 389,
        modelReasoningTokens: 30
    }
);
```

#### Execution timing for tools

Measure and report the execution time of tool calls to identify performance bottlenecks. Wrap your tool execution with timing measurements and include both the duration and tool call details in the trace:

```ts
  const startTime = performance.now();
  
  // ... execute your tool here ...
  
  const endTime = performance.now();
  const durationMs = endTime - startTime;

  // Report tool execution with timing
  await inspectionReporter.trace(
      `Tool ${toolName} executed`,
      [
          { label: InspectionEventLabel.Timing, data: `${durationMs.toFixed(2)}ms` },
          { label: InspectionEventLabel.ToolCalls, data: JSON.stringify({ tool: toolName, args, result }, null, 2) }
      ]
  );
```

#### Group invocations & Latency heatmap

You can group invocations to have more readable traces and visualize the time between consecutive events within each agent loop iteration.

The latency heatmap visualizes the time between consecutive events within each agent loop iteration. To enable it, mark the start and end of your agent loop:

```ts
// At the start of processing a user message/request
await reporter.invocationStart("Agent is processing the user input...");

// ... your agent logic, traces, tool calls ...

// At the end of the loop (when response is complete)
await reporter.invocationEnd("Invocation completed");
```

#### Error reporting & Error rate

Report errors that occur during agent execution to track error rates per invocation. 

Wrap error-prone operations in try/catch blocks and report errors:

```ts
try {
  // ... your agent logic ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await reporter.error("Agent loop failed", errorMessage);
  await reporter.invocationEnd("Agent loop failed with error.");
  throw error; // re-throw if needed
}
```

You can also report specific error conditions:

```ts
// Report empty content as an error
if (hasEmptyContent) {
  await reporter.error("Empty content returned", "Model returned empty or null content");
}
```

The error rate is calculated client-side from persisted events, so it survives server restarts and accurately reflects the actual error rate based on what's visible in the UI.

#### Others

- `tokens` ➜ (currentTokensUsage: number, modelContextLimit: number) 
- `model` ➜ (modelName: string)
- `context` ➜ (ctx: ContextMessage[])
- `tools` ➜ (tools: AgentToolDefinition[])

All protocol types are available in `protocol/types.ts`.

You can check the agent implementation in `/dummy-agent` and `/reporter` as a reference.

## Export & Import snapshots

You can export the current inspection state to share or analyze later, and import previously saved snapshots to restore the state.

### Export snapshot

Click the "export ↓" button in the inspection header to download the current state. Two formats are available:

- **JSON** ➜ Full machine-readable snapshot that can be imported back into maid for further analysis
- **TXT** ➜ Human-readable format for easy sharing and review

### Import snapshot

Click the "import ↑" button to load a previously exported JSON snapshot. This restores the complete inspection state, allowing you to review and analyze historical agent behavior without reconnecting to a running agent.

You can generate a snapshot based on your Amp or Claude Code conversation using the `generate-maid-snapshots` skill present in `.agents/skills`or `.claude/skills`.

## Evaluation

Evaluate your agent responses using LLM-based scoring on 5 criteria: correctness, completeness, clarity, relevance, and helpfulness.

Requires `OPENROUTER_API_KEY` in your `.env` file.

```ts
await inspectionReporter.evaluable(userInput, finalContent, requestTokenUsage); // optional: customEvaluationPrompt
```

Returns scores (1-10), overall score, summary, strengths, weaknesses, and suggestions.

You can add a custom system prompt via the UI or when you call the `evaluate()` reporter method.

## Integrating with the help of a coding agent

You can integrate maid to your custom agent loop by using a custom coding agent of your choice and feeding in the `SETUP.md` prompt.

## Artifacts

### Architecture

<img width="1040" height="339" alt="maid-diagram" src="https://github.com/user-attachments/assets/75fd2936-ee9e-4e28-8907-74df9556b499" />

### Visual

<img width="1512" height="879" alt="maid-new-visual" src="https://github.com/user-attachments/assets/c7c281c2-4e3c-40ed-b6ee-1ff328a2a051" />

### Demo

https://github.com/user-attachments/assets/5f740626-092a-4464-a594-a59f03c9cc12
























