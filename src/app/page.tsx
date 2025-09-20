import { RepoInputForm } from '@/components/repo-input-form';
import { RepoView } from '@/components/repo-view';

async function fetchRepoData(repoUrl: string) {
  // Use the full URL for fetch on the server-side.
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:9002';
  const response = await fetch(`${baseUrl}/api/repo?url=${encodeURIComponent(repoUrl)}`, {
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
    
    return <RepoView repo={repo} rawTree={rawTree} readme={readme || ''} packageJson={packageJson} />;

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
