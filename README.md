# my agent is dumb (maid)

<p align="center">
  <img width="200" height="180" alt="maid-logo"
       src="https://github.com/user-attachments/assets/2c52da38-c4e0-4221-aee5-93d7e4ed5f7d" />
</p>

my agent is dumb (maid) is a telemetry dev tool to inspect your agent behavior via agent traces.

*(Under development)*

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

## Running your own agent

Before starting your own agent loop, a client that calls inspection backend needs to be instantiated.

If you want (and use typescript for the agent), you can import/copy `InspectorReporter` (present in `/reporter`) directly into your agent code and then use the various functions to send informations (check the code to understand more).

If you don't use typescript, just adapt the code based on your programming language of choice.

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

#### Latency heatmap

The latency heatmap visualizes the time between consecutive events within each agent loop iteration. To enable it, mark the start and end of your agent loop:

```ts
// At the start of processing a user message/request
await reporter.latencyStart("Agent is processing the user input...");

// ... your agent logic, traces, tool calls ...

// At the end of the loop (when response is complete)
await reporter.latencyEnd("Loop completed");
```

#### Others

- `tokens` ➜ (currentTokensUsage: number, modelContextLimit: number) 
- `model` ➜ (modelName: string)
- `context` ➜ (ctx: ContextMessage[])
- `tools` ➜ (tools: AgentToolDefinition[])

All protocol types are available in `protocol/types.ts`.

You can check the agent implementation in `/dummy-agent` and `/reporter` as a reference. 

## Integrating with the help of a coding agent

You can integrate maid to your custom agent loop by using a custom coding agent of your choice and feeding in the `SETUP.md` prompt:

https://github.com/user-attachments/assets/9d4e250a-2d31-44c0-9e8e-6a1c406af7a2

## Artifacts

### Architecture

<img width="1040" height="339" alt="maid-diagram" src="https://github.com/user-attachments/assets/75fd2936-ee9e-4e28-8907-74df9556b499" />

### Visual

<img width="1512" height="882" alt="new-maid-screen" src="https://github.com/user-attachments/assets/4f95ea99-baa8-4828-b63f-cdf8925168a1" />



### Demo




https://github.com/user-attachments/assets/ac5c291e-074b-4eb0-91af-44be048219eb











