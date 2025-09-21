'use client';
import { RepoInputForm } from '@/components/repo-input-form';
import { EnhancedRepoExplorer } from '@/components/enhanced-repo-explorer';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch repository data.');
  }
  return res.json();
});

function LoadingView() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepoPage() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get('repo');
  
  const { data, error, isLoading } = useSWR(repoUrl ? `/api/repo?url=${encodeURIComponent(repoUrl)}` : null, fetcher);

  if (!repoUrl) {
    return (
      <main className="min-h-screen bg-[#F0F4F8] p-4">
        <div className="max-w-6xl mx-auto">
          <header className="text-center py-8">
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold text-gray-800 mb-2">
              Nano GitHub Viewer
            </h1>
            <p className="font-['Inter'] text-gray-600">
              Explore GitHub repositories with AI-enhanced insights
            </p>
          </header>
          <RepoInputForm />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
     if (error.message.includes("Invalid GitHub repository URL")) {
       return (
          <main className="min-h-screen bg-[#F0F4F8] p-4">
            <div className="max-w-6xl mx-auto">
              <header className="text-center py-8">
                <h1 className="font-['Space_Grotesk'] text-4xl font-bold text-gray-800 mb-2">
                  Nano GitHub Viewer
                </h1>
              </header>
              <RepoInputForm error={error.message} initialValue={repoUrl} />
            </div>
          </main>
       )
    }
    return (
      <div className="min-h-screen bg-[#F0F4F8] p-4">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (data) {
    const { repo, rawTree, readme, packageJson } = data;
    return <EnhancedRepoExplorer repo={repo} rawTree={rawTree} readme={readme || ''} packageJson={packageJson} />;
  }

  return (
      <main className="min-h-screen bg-[#F0F4F8] p-4">
        <div className="max-w-6xl mx-auto">
          <RepoInputForm initialValue={repoUrl} />
        </div>
      </main>
    );
}
