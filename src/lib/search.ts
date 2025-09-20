import 'server-only';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
}

interface SearchResponse {
  items: SearchResultItem[];
}

export async function searchGoogle(query: string): Promise<SearchResponse> {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_CX) {
    console.warn("Google Search API Key or CX is not configured. Returning mock data.");
    return {
      items: [
        { title: "Mock Search Result 1", link: "https://example.com/1", snippet: "This is a mock search result because the API keys are not configured." },
        { title: "Mock Search Result 2", link: "https://example.com/2", snippet: "To enable real search, please set GOOGLE_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX in your .env file." },
      ]
    };
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Google Search API error: ${error.error.message}`);
    }
    const data = await res.json() as SearchResponse;
    return data;
  } catch (error) {
    console.error("Failed to fetch from Google Search API:", error);
    throw error;
  }
}
