'use client';
import { RepoInputForm } from '@/components/repo-input-form';
import { RepoView } from '@/components/repo-view';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Loading from '../loading';
import Error from '../error';

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch repository data.');
  }
  return res.json();
});

export default function RepoPage() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get('repo');
  
  const { data, error, isLoading } = useSWR(repoUrl ? `/api/repo?url=${encodeURIComponent(repoUrl)}` : null, fetcher);

  if (!repoUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm />
      </main>
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
     if (error.message.includes("Invalid GitHub repository URL")) {
       return (
          <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <RepoInputForm error={error.message} initialValue={repoUrl} />
          </main>
       )
    }
    return <Error error={error} reset={() => window.location.reload()} />;
  }

  if (data) {
    const { repo, rawTree, readme, packageJson } = data;
    return <RepoView repo={repo} rawTree={rawTree} readme={readme || ''} packageJson={packageJson} />;
  }

  return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <RepoInputForm initialValue={repoUrl} />
      </main>
    );
}
