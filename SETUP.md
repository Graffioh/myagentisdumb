# Integration instructions for LLM agents

You are integrating the "reporter" system from the reference repository:
https://github.com/Graffioh/myagentisdumb

You are implementing a compatible reporter
inside the host codebase that contains a custom agent loop.

## Preconditions (verify before proceeding by asking the user)
- The reference repository has been cloned locally
- The myagentisdumb frontend and inspection backend can be started successfully
- The host codebase already has a functioning agent loop

If any precondition is not met, stop and report what is missing.

---

## Step 1: Reporter implementation

Create a reporter implementation that is functionally equivalent to:
`myagentisdumb/reporter/index.ts` (Check the github repository, not the local cloned one)

Rules:
- Implement the reporter **inside the host codebase**
- Use the **same programming language as the host agent loop**
- Place the reporter near the agent loop implementation (e.g. `/agent`, `/core/agent`, or equivalent)
- Do NOT change the reporter interface or semantics
- Do NOT add new fields or behavior beyond what exists in the reference implementation

---

## Step 2: Type compatibility

Your reporter MUST strictly adhere to the types defined in:
`myagentisdumb/protocol/types.ts` (Check the github repository, not the local cloned one)

Rules:
- Do NOT modify protocol types
- If the host language differs, create a faithful structural equivalent
- Field names, optionality, and semantics must match exactly

If any type cannot be represented, stop and explain why.

---

## Step 3: Agent loop integration

Integrate the reporter into the custom agent loop.

Requirements:
- Instantiate the reporter once per agent lifecycle (not per step unless required)
- Wire reporting calls into meaningful agent events, such as:
  - trace step execution
  - tool invocation
  - latency measurement
  - context or state changes
- Reporter failures MUST NOT crash the agent loop unless explicitly unavoidable

Check `myagentisdumb/dummy-agent/loop.ts` (Github repository not local cloned one) as a reference of what you could add to the user custom agent loop

---

## Completion criteria

You are done when:
- The agent loop runs normally with the reporter enabled
- Reporter events appear in the myagentisdumb inspection backend
- No protocol or type mismatches exist

Double check with the user.
