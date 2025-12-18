# my agent is dumb (maid)

<p align="center">
  <img width="200" height="180" alt="maid-logo"
       src="https://github.com/user-attachments/assets/2c52da38-c4e0-4221-aee5-93d7e4ed5f7d" />
</p>

*(Under development)*

The goal is to make the frontend and inspection backend (SSE) a standalone component/package, where you can plug-in any agent loop you want to debug.

## Usage

- Start the **frontend**: npm run dev:frontend
- Start the **inspection backend**: npm run dev:inspection
- (Optional) Start the **agent**: npm run dev:agent

### Running your own agent

Before starting your own agent loop, a client that calls inspection backend needs to be instantiated.

If you want (and use typescript for the agent), you can import/copy `InspectorReporter` (present in `/reporter`) directly into your agent code and then use the various functions to send informations (check the code to understand more).

If you don't use typescript, just adapt the code based on your programming language of choice.

#### Types 

In your own agent loop implementation, you should adhere to a "type contract".

Specifically you need to follow strictly the agent type definitions present in `/src/types.ts` for some implementations (tool definitions, context message, toke usage) otherwise the inspection frontend won't work properly.

You can check my agent implementation in `/agent` as a reference.

I will think of a better way for these stuffs...I promise.

<img width="1040" height="339" alt="maid-diagram" src="https://github.com/user-attachments/assets/75fd2936-ee9e-4e28-8907-74df9556b499" />

<img width="1512" height="883" alt="maid-screen" src="https://github.com/user-attachments/assets/b6d35a4d-3160-4ced-849c-a8000b5dd1d7" />

