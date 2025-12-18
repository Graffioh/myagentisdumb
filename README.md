# my agent is dumb (maid)

<p align="center">
  <img width="200" height="180" alt="maid-logo"
       src="https://github.com/user-attachments/assets/2c52da38-c4e0-4221-aee5-93d7e4ed5f7d" />
</p>


The goal is to make the frontend and inspection backend (SSE) a standalone component/package, where you can plug-in any agent loop you want to debug.

For this purpose, `/reporter` package is used as a bridge between the inspection and the agent. The agent code need to instantiate an `InspectionReporter` so that it can send messages, context and other informations that will be useful during debugging.

<img width="1512" height="883" alt="maid-screen" src="https://github.com/user-attachments/assets/b6d35a4d-3160-4ced-849c-a8000b5dd1d7" />

