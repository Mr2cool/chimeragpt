import 'server-only';
import { GitHubRepo, GitHubTreeResponse, PackageJson, GitHubContentResponse } from './types';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const headers: HeadersInit = {
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

if (GITHUB_TOKEN) {
  headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
}

async function githubFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${GITHUB_API_URL}${endpoint}`, { headers, next: { revalidate: 3600 } });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Resource not found at ${endpoint}.`);
    }
    const errorBody = await res.json();
    throw new Error(`GitHub API error: ${errorBody.message || res.statusText}`);
  }
  return res.json() as T;
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`);
}

export async function getTree(owner: string, repo: string, tree_sha: string): Promise<GitHubTreeResponse['tree']> {
  const data = await githubFetch<GitHubTreeResponse>(`/repos/${owner}/${repo}/git/trees/${tree_sha}?recursive=1`);
  if (data.truncated) {
    console.warn('GitHub tree data was truncated. Some files may be missing.');
  }
  return data.tree;
}

async function getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string | null> {
    try {
        const data = await githubFetch<GitHubContentResponse>(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
        if ('content' in data && data.encoding === 'base64') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        return null;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Not Found')) {
            return null;
        }
        throw error;
    }
}


export async function getReadme(owner: string, repo: string): Promise<string | null> {
    try {
        const data = await githubFetch<GitHubContentResponse>(`/repos/${owner}/${repo}/readme`);
        if (data.encoding === 'base64') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        return null;
    } catch (error) {
        return `# ${repo}\n\nNo README found for this repository.`;
    }
}


export async function getPackageJson(owner: string, repo: string, branch: string): Promise<PackageJson | null> {
    const content = await getFileContent(owner, repo, 'package.json', branch);
    if (content) {
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse package.json", e);
            return null;
        }
    }
    return null;
}
