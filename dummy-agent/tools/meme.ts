interface MemeResponse {
  postLink: string;
  subreddit: string;
  title: string;
  url: string;
  nsfw: boolean;
  spoiler: boolean;
  author: string;
  ups: number;
  preview: string[];
}

interface MemeListResponse {
  count: number;
  memes: MemeResponse[];
}

export const getMeme = async (subreddit?: string) => {
  let url = "https://meme-api.com/gimme";
  
  if (subreddit) {
    url = `https://meme-api.com/gimme/${subreddit}`;
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch meme: ${response.statusText}`);
  }

  const data = (await response.json()) as MemeResponse | MemeListResponse;

  // Handle both single meme and list responses
  if ("memes" in data) {
    // If it's a list response, return the first meme
    const meme = data.memes[0];
    return {
      postLink: meme.postLink,
      subreddit: meme.subreddit,
      title: meme.title,
      url: meme.url,
      nsfw: meme.nsfw,
      spoiler: meme.spoiler,
      author: meme.author,
      upvotes: meme.ups,
      preview: meme.preview,
    };
  } else {
    // Single meme response
    return {
      postLink: data.postLink,
      subreddit: data.subreddit,
      title: data.title,
      url: data.url,
      nsfw: data.nsfw,
      spoiler: data.spoiler,
      author: data.author,
      upvotes: data.ups,
      preview: data.preview,
    };
  }
};

