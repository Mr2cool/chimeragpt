import { RepoInputForm } from '@/components/repo-input-form';
import { RepoView } from '@/components/repo-view';
import type { GitHubRepo, GitHubFile, PackageJson } from '@/lib/types';
import { buildTree } from '@/lib/tree';

async function fetchRepoData(repoUrl: string) {
  const response = await fetch(`/api/repo?url=${encodeURIComponent(repoUrl)}`, {
    next: { revalidate: 3600 } // Revalidate every hour
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch repository data.');
  }

  return response.json();
}


export default async function Home({ searchParams }: { searchParams: { repo?: string } }) {
  const repoUrl = searchParams.repo;

  if (!repoUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm />
      </main>
    );
  }

  try {
    const { repo, rawTree, readme, packageJson } = await fetchRepoData(repoUrl);
    
    const tree = buildTree(rawTree);

    return <RepoView repo={repo} tree={tree} readme={readme || ''} packageJson={packageJson} />;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
     if (errorMessage.includes("Invalid GitHub repository URL")) {
       return (
          <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <RepoInputForm error={errorMessage} initialValue={repoUrl} />
          </main>
       )
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm error={`Error fetching repository: ${errorMessage}`} initialValue={repoUrl} />
      </main>
    );
  }
}
