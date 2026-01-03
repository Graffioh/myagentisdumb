# myagentisdumb (maid)

This project is an agent telemetry dev tool to inspect a custom running agent loop by using manual hooks (log(...), trace(...), context(...) and so on) via a reporter.

## Tech stack

- Svelte
- Vite
- TypeScript
- Express

## Project structure

### Frontend

- `src/`: contains the Svelte 5 frontend
- `protocol/`: contains the protocol used by the reporter and the agent

*Note:* in `src/dev/`: there is the togglable chat panel used only for the development of the project

### Backend

- `inspection/`: contains the inspection backend SSE server
- `reporter/`: contains the reporter implementation used by the user to inspect its own agent
- `dummy-agent/`: contains a dummy agent implementation used as a reference

## Coding style

Write clean, readable, maintainable code without useless comments and YOU MUST FOLLOW THESE CODING STYLE SECTIONS BELOW:

### Svelte

- Write Svelte 5 idiomatic code

### TypeScript

- Follow TypeScript best practices
- Never use any (unless absolute necessary)

- Follow TypeScript best-practices

## Skills

### Playwright skill

When asked to implement or bug fix a feature in the UI, use the playwright skill:

- Check /e2e/ folder for the reference tests
- Use :5555 port for the frontend (even if it's not shown when asked with commands)
- Clear localStorage before checking the new code
