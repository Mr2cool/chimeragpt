import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface GitHubTreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

interface ProcessedTreeItem {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children?: ProcessedTreeItem[];
}

function processGitHubTree(tree: GitHubTreeItem[]): ProcessedTreeItem[] {
  const result: ProcessedTreeItem[] = [];
  const pathMap = new Map<string, ProcessedTreeItem>();

  // Sort by path to ensure parent directories come before children
  const sortedTree = tree.sort((a, b) => (a.path || '').localeCompare(b.path || ''));

  for (const item of sortedTree) {
    if (!item.path) continue;

    const pathParts = item.path.split('/');
    const name = pathParts[pathParts.length - 1];
    const isDirectory = item.type === 'tree';

    const processedItem: ProcessedTreeItem = {
      name,
      path: item.path,
      type: isDirectory ? 'tree' : 'blob',
      ...(isDirectory && { children: [] })
    };

    pathMap.set(item.path, processedItem);

    if (pathParts.length === 1) {
      // Root level item
      result.push(processedItem);
    } else {
      // Find parent directory
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(processedItem);
      }
    }
  }

  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get('url');

  if (!repoUrl) {
    return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
  }

  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
  }

  const [, owner, repoName] = repoMatch;

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
    });

    // Fetch repository information
    const { data: repo } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    // Fetch repository tree
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo: repoName,
      tree_sha: repo.default_branch,
      recursive: 'true',
    });

    const rawTree = processGitHubTree(treeData.tree);

    // Fetch README
    let readme = '';
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({
        owner,
        repo: repoName,
      });
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    } catch (readmeError) {
      console.warn('README not found or inaccessible');
    }

    // Fetch package.json if it exists
    let packageJson = null;
    try {
      const { data: packageData } = await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path: 'package.json',
      });
      
      if ('content' in packageData) {
        const packageContent = Buffer.from(packageData.content, 'base64').toString('utf-8');
        packageJson = JSON.parse(packageContent);
      }
    } catch (packageError) {
      console.warn('package.json not found or inaccessible');
    }
    
    return NextResponse.json({ 
      repo: {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        watchers_count: repo.watchers_count,
        language: repo.language,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url
        }
      }, 
      rawTree, 
      readme, 
      packageJson 
    });
    
  } catch (error) {
    console.error('GitHub API Error:', error);
    
    if (error instanceof Error) {
      // Handle specific GitHub API errors
      if (error.message.includes('404')) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }
      if (error.message.includes('403')) {
        return NextResponse.json({ error: 'Access forbidden - repository may be private or rate limit exceeded' }, { status: 403 });
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json({ error: 'GitHub API rate limit exceeded' }, { status: 429 });
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: `Failed to fetch repository data: ${errorMessage}` }, { status: 500 });
  }
}