import 'server-only';

export async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${url}, status: ${response.status}`);
      return `Error: Failed to fetch the URL. Status code: ${response.status}`;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        console.warn(`URL did not return HTML content: ${url}, got ${contentType}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching URL content for ${url}:`, error);
    return `Error: Could not fetch content from the URL. Please check if it's correct.`;
  }
}

export function extractImageUrls(htmlContent: string, baseUrl: string): string[] {
    const imageUrls = new Set<string>();
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
        try {
            const url = new URL(match[1], baseUrl).href;
            imageUrls.add(url);
        } catch (e) {
            // Ignore invalid URLs
        }
    }
    return Array.from(imageUrls);
}

export async function fetchImageAsDataUri(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch image: ${imageUrl}, status: ${response.status}`);
            return null;
        }
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error(`Error fetching image as data URI for ${imageUrl}:`, error);
        return null;
    }
}
