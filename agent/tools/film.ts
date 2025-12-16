interface MovieResponse {
    Title: string;
    Year: string;
    Rated: string;
    Released: string;
    Runtime: string;
    Genre: string;
    Director: string;
    Actors: string;
    Plot: string;
    Language: string;
    Country: string;
    Ratings: {
      Source: string;
      Value: string;
    }[];
    imdbRating: string;
    imdbVotes: string;
    imdbID: string;
    Type: string;
    Poster: string;
    Response: "True" | "False";
    Error?: string;
  }

const OMDB_API_KEY = process.env.OMDB_API_KEY!;

export const getMovie = async (title: string) => {
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(
    title
  )}&apikey=${OMDB_API_KEY}`;

  const response = await fetch(url);
  const data = (await response.json()) as MovieResponse;

  if (data.Response === "False") {
    throw new Error(data.Error || `Movie '${title}' not found`);
  }

  return {
    title: data.Title,
    year: data.Year,
    genre: data.Genre,
    runtime: data.Runtime,
    plot: data.Plot,
    director: data.Director,
    actors: data.Actors,
    imdbRating: data.imdbRating,
    ratings: data.Ratings,
    poster: data.Poster,
    imdbId: data.imdbID,
  };
};

  