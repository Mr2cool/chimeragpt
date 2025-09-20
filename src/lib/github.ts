import 'server-only';
import { GitHubRepo, GitHubTreeResponse, PackageJson, GitHubContentResponse, TreeNode, GitHubFile } from './types';

const GITHUB_API_URL = 'https://api.github.com';

const headers: HeadersInit = {
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function githubFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API_URL}${endpoint}`, { headers, next: { revalidate: 3600 } });

    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    
    const text = await res.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('GitHub API fetch error:', error);
    return null;
  }
}

function buildTree(files: GitHubFile[]): TreeNode[] {
  const tree: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    const name = parts[parts.length - 1];
    
    const node: TreeNode = {
      name,
      path: file.path,
      type: file.type,
      children: file.type === 'tree' ? [] : undefined
    };

    pathMap.set(file.path, node);

    if (parts.length === 1) {
      tree.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  return tree;
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const repoData = await githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`);
  if (!repoData) {
    throw new Error(`Repository ${owner}/${repo} not found.`);
  }
  
  return {
    ...repoData,
    watchers_count: repoData.watchers_count || repoData.stargazers_count || 0,
    language: repoData.language || null,
    updated_at: repoData.updated_at || new Date().toISOString()
  };
}

export async function getTree(owner: string, repo: string, tree_sha: string): Promise<TreeNode[]> {
  const data = await githubFetch<GitHubTreeResponse>(`/repos/${owner}/${repo}/git/trees/${tree_sha}?recursive=1`);
  if (!data) {
    return [];
  }
  
  return buildTree(data.tree);
}

export async function getReadme(owner: string, repo: string): Promise<string> {
    const data = await githubFetch<GitHubContentResponse>(`/repos/${owner}/${repo}/readme`);
    if (data && 'content' in data && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return `# ${repo}\n\nNo README found for this repository.`;
}

export async function getPackageJson(owner: string, repo: string, branch: string): Promise<PackageJson | null> {
    const data = await githubFetch<GitHubContentResponse>(`/repos/${owner}/${repo}/contents/package.json?ref=${branch}`);
    if (data && 'content' in data && data.encoding === 'base64') {
        try {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse package.json", e);
            return null;
        }
    }
    return null;
}