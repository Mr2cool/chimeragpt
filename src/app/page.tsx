import { RepoInputForm } from '@/components/repo-input-form';
import { RepoView } from '@/components/repo-view';
import { getRepo, getTree, getReadme, getPackageJson } from '@/lib/github';
import { buildTree } from '@/lib/tree';

export default async function Home({ searchParams }: { searchParams: { repo?: string } }) {
  const repoUrl = searchParams.repo;

  if (!repoUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm />
      </main>
    );
  }

  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm error="Invalid GitHub repository URL. Please use the format https://github.com/owner/repo" initialValue={repoUrl} />
      </main>
    );
  }

  const [, owner, repoName] = repoMatch;

  try {
    const repo = await getRepo(owner, repoName);
    const rawTree = await getTree(owner, repoName, repo.default_branch);
    const readme = await getReadme(owner, repoName);
    const packageJson = await getPackageJson(owner, repoName, repo.default_branch);
    
    const tree = buildTree(rawTree);

    return <RepoView repo={repo} tree={tree} readme={readme || ''} packageJson={packageJson} />;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch repository data.";
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm error={errorMessage} initialValue={repoUrl} />
      </main>
    );
  }
}
