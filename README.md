# my agent is dumb (maid)

<p align="center">
  <img width="200" height="180" alt="maid-logo"
       src="https://github.com/user-attachments/assets/2c52da38-c4e0-4221-aee5-93d7e4ed5f7d" />
</p>

This is essentially a dev tool to inspect your agent behavior via messages, context, token usage and tools.

*(Under development)*

The goal is to make the frontend and inspection backend (SSE) a standalone component/package used as a Dev tool, where you can plug-in any agent loop you want to inspect/debug.

## Usage

### With Docker (frontend + inspection backend)

- Start both services:
  - `docker compose up --build`
- Open the UI:
  - `http://localhost:5173`
- Connect your own agent 
  - or if you want to understand how the dev tool works, spin up the one in `/agent`

### Running your own agent

Before starting your own agent loop, a client that calls inspection backend needs to be instantiated.

If you want (and use typescript for the agent), you can import/copy `InspectorReporter` (present in `/reporter`) directly into your agent code and then use the various functions to send informations (check the code to understand more).

If you don't use typescript, just adapt the code based on your programming language of choice.

#### What to pass to the inspector for reporting

When you send SSE events to the inspector to be displayed in the Agent inspection panel you must send specific constrained informations (if you don't customize the frontend):

##### Less structured

- `message` ➜ (message: string)
- `tokens` ➜ (currentTokensUsage: number, modelContextLimit: number) 
- `model` ➜ (modelName: string)

##### More structured

- `context` ➜ (ctx: ContextMessage[])
  ```ts
  type AgentToolCall = {
      id: string;
      type: "function";
      function: {
          name: string;
          arguments: string;
      };
  };

  type ContextMessage = {
    role: string; // system, user, assistant
    content: string; 
    tool_calls?: AgentToolCall[]; 
  };
  ```
- `tools` ➜ (tools: AgentToolDefinition[])
  ```ts
  type JSONSchema = {
    type: "object" | "string" | "number" | "boolean" | "array";
    properties?: Record<string, JSONSchema>;
    required?: string[];
    description?: string;
    items?: JSONSchema;
  };

  type AgentToolDefinition = {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: JSONSchema;
    };
  };
  ```

You can check my agent implementation in `/agent` and `/reporter` as a reference.

I will think of a better way for these stuffs...I promise.

### Without Docker

- Start the **frontend**: npm run dev:frontend
- Start the **inspection backend**: npm run dev:inspection
- (Optional) Start the **agent**: npm run dev:agent

## Artifacts

### Architecture

<img width="1040" height="339" alt="maid-diagram" src="https://github.com/user-attachments/assets/75fd2936-ee9e-4e28-8907-74df9556b499" />

### Visual

<img width="1512" height="881" alt="maid-screen" src="https://github.com/user-attachments/assets/97e0ab8b-972d-4e63-84e9-14a43cbd9029" />

### Demo

https://github.com/user-attachments/assets/440969ef-31b1-46b5-ad8b-85e0ba0d3c1f






