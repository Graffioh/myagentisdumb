import { getWeather } from "./weather";
import { getMovie } from "./film";
import { runNeofetch } from "./neofetch";
import { getMeme } from "./meme";
import type { AgentToolDefinition } from "../../protocol/types";

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
    },
    {
      type: "function",
      function: {
        name: "getMeme",
        description: "Get a random meme from Reddit. Optionally specify a subreddit to get memes from a specific subreddit.",
        parameters: {
          type: "object",
          properties: {
            subreddit: {
              type: "string",
              description: "Optional subreddit name such as 'dankmemes', 'wholesomememes', 'me_irl', etc. If not provided, returns a random meme from default subreddits."
            }
          },
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
    },
    getMeme: async ({ subreddit }: { subreddit?: string }) => {
      return await getMeme(subreddit);
    }
};