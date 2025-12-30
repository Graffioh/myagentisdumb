---
name: generating-maid-snapshots
description: Generates MAID snapshot JSON for agent inspection visualization. Use when asked to create snapshot data, export agent traces, or generate JSON for the MAID inspection panel.
---

# MAID Snapshot Generator

Generate a snapshot JSON that can be imported by MAID for visualization in the InspectionPanel and ContextViewer.

## Critical Output Rules

1. **Create a file** named `maid-snapshot-<id>.json` in the current working directory, where `<id>` is a unique identifier (use a short UUID or timestamp like `1735567890123`)
2. Write ONLY valid JSON to the file (no markdown fences, no explanations)
3. Strict JSON: no trailing commas, no NaN/Infinity, no comments
4. Prefer OMISSION over fabrication:
   - Do NOT guess values
   - If a field is unknown, either omit it or set to null only when explicitly allowed
5. Timestamps:
   - `exportedAt` MUST be ISO 8601 UTC with milliseconds (e.g. `2025-12-29T17:27:06.929Z`)
   - `events[].ts` MUST be unix epoch milliseconds
   - `events[].ts` MUST be monotonic non-decreasing
6. After creating the file, confirm with the file path

## Required Root Shape

```json
{
  "version": "1.0",
  "exportedAt": "<ISO timestamp UTC>",
  "model": "<model id or 'unknown'>",
  "tokenUsage": {
    "totalTokens": "<number>",
    "contextLimit": "<number>",
    "remainingTokens": "<number>"
  },
  "tools": [],
  "context": [],
  "events": []
}
```

Optional tokenUsage fields (include only if known): `promptTokens`, `modelOutputTokens`, `modelReasoningTokens`

## Tools Array

Each tool entry:

```json
{
  "type": "function",
  "function": {
    "name": "<tool name>",
    "description": "<tool description>",
    "parameters": {
      "type": "object",
      "properties": { },
      "required": [ ]
    }
  }
}
```

If tool schemas are unknown, output `"tools": []` (do NOT invent).

## Context Array (Chat Transcript)

Chronological list of messages. The first message SHOULD be the system prompt.

**System prompt (first message):**
```json
{ "role": "system", "content": "<full system prompt text>" }
```

**User/Assistant message:**
```json
{ "role": "user" | "assistant", "content": "<string>" }
```

**Assistant with tool calls:**
```json
{
  "role": "assistant",
  "content": "<string>",
  "tool_calls": [
    {
      "index": 0,
      "id": "<string>",
      "type": "function",
      "function": {
        "name": "<tool name>",
        "arguments": "<JSON string>"
      }
    }
  ]
}
```

**Tool result:**
```json
{
  "role": "tool",
  "tool_call_id": "<matches tool call id>",
  "content": "<string>"
}
```

Rules:
- Keep exact order: assistant(tool_calls) → tool(result) → assistant(final)
- Tool arguments MUST be a JSON STRING, not an object

## Events Array (Inspection Timeline)

Each event:

```json
{
  "ts": "<epoch ms>",
  "data": "<one-line summary>",
  "inspectionEvent": {
    "message": "<can be long>",
    "invocationId": "<uuid for grouping>",
    "children": [
      { "label": "<label>", "data": "<string>" }
    ]
  }
}
```

### Allowed Labels

- `__INVOCATION_START__`
- `__INVOCATION_END__`
- `Content`
- `Reasoning`
- `Tool Calls`
- `Timing`
- `Token Usage`
- `Error`
- `Custom`

### Recommended Event Pattern Per Invocation

1. **Start:** `children: [{ "label": "__INVOCATION_START__", "data": "" }]`
2. **Tool execution:** Include `Reasoning` (short), `Tool Calls` (stringified JSON)
3. **Tool completed:** Include `Timing`, `Tool Calls` with results, `Token Usage`
4. **Final message:** Include `Content`, optionally `Reasoning`
5. **End:** `children: [{ "label": "__INVOCATION_END__", "data": "" }]`

## Important

- Do NOT include private chain-of-thought
- If including "Reasoning", keep it short and high-level
- Omit unknown data rather than guessing
- Output ONLY the JSON object—no markdown, no extra text
