# maid

This project is an agent telemetry dev tool to inspect a custom running agent loop by using manual hooks (log(...), trace(...), context(...) and so on) via a reporter.

## Tech

- Svelte
- Vite
- TypeScript
- Express

## Project structure

- `src/` contains the Svelte 5 frontend
- `inspection/` contains the inspection backend SSE server
- `reporter/` contains the reporter implementation used by the user to inspect its own agent
- `dummy-agent/` contains a dummy agent implementation used as a reference
- `protocol/` contains the protocol used by the reporter and the agent

*Note:* there is `src/dev/`, contains the togglable chat panel used only for the development of the project

## Minimal coding style advised

- Svelte 5 idiomatic
- Follow good TypeScript practices
- Be mindful of the performance impact of your code
- Don't add useless comments

## Testing with playwright skill

When asked to implement or bug fix a feature in the UI, use the playwright skill.

- Use :5555 port for the frontend
- Import maid-snapshot.json present in the root directory to help you test
- Clear local storage before checking the new code
