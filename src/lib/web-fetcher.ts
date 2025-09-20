import 'server-only';

export async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        // In a real app, you might want to handle redirects more gracefully
        redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${url}, status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        console.error(`URL did not return HTML content: ${url}`);
        return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching URL content for ${url}:`, error);
    return null;
  }
}
