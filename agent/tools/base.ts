import { getWeather } from "./weather";
import { getMovie } from "./film";
import { runNeofetch } from "./neofetch";
import type { AgentToolDefinition } from "../types";

export const toolDefinitions: AgentToolDefinition[] = [
    {
      type: "function",
      function: {
        name: "getWeather",
        description: "Get weather conditions for a given city name.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name such as 'Berlin', 'London', etc."
            }
          },
          required: ["location"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getMovie",
        description: "Get information about a movie, tv serie or anime by title.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Movie, tv serie or anime title such as 'The Dark Knight', 'Inception', 'Attack on Titan', etc."
            }
          },
          required: ["title"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "runNeofetch",
        description: "Run the neofetch CLI command to display system information including OS, hostname, kernel, uptime, packages, shell, resolution, and more.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    }
  ];

export const toolImplementations = {
    getWeather: async ({ location }: { location: string }) => {
      return await getWeather(location);
    },
    getMovie: async ({ title }: { title: string }) => {
      return await getMovie(title);
    },
    runNeofetch: async () => {
      return await runNeofetch();
    }
};