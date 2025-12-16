import { getWeather } from "./weather";
import { getMovie } from "./film";

export const toolDefinitions = [
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
        description: "Get information about a movie by title.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Movie title such as 'The Dark Knight', 'Inception', etc."
            }
          },
          required: ["title"]
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
    }
};