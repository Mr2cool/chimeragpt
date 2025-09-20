import { NextResponse } from 'next/server';
import { getRepo, getTree, getReadme, getPackageJson } from '@/lib/github';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get('url');

  if (!repoUrl) {
    return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
  }

  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    return NextResponse.json({ error: 'Invalid GitHub repository URL. Please use the format https://github.com/owner/repo' }, { status: 400 });
  }

  const [, owner, repoName] = repoMatch;

  try {
    const repo = await getRepo(owner, repoName);
    const rawTree = await getTree(owner, repoName, repo.default_branch);
    const readme = await getReadme(owner, repoName);
    const packageJson = await getPackageJson(owner, repoName, repo.default_branch);
    
    return NextResponse.json({ repo, rawTree, readme, packageJson });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
