import { RepoInputForm } from '@/components/repo-input-form';
import { RepoView } from '@/components/repo-view';
import type { TreeNode } from '@/lib/tree';

// This function is a placeholder for building the tree structure
function buildTree(files: any[]): TreeNode[] {
    const tree: TreeNode = { name: 'root', path: '', type: 'tree', children: [] };
    const map: { [key: string]: TreeNode } = { '': tree };

    files.forEach(file => {
        const parts = file.path.split('/');
        parts.reduce((parentPath, part, index) => {
            const currentPath = parentPath ? `${parentPath}/${part}` : part;
            if (!map[currentPath]) {
                const parentNode = map[parentPath];
                const newNode: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: index === parts.length - 1 ? file.type : 'tree',
                    children: [],
                };
                parentNode.children.push(newNode);
                map[currentPath] = newNode;
            }
            return currentPath;
        }, '');
    });

    Object.values(map).forEach(node => {
        node.children.sort((a, b) => {
            if (a.type === 'tree' && b.type === 'blob') return -1;
            if (a.type === 'blob' && b.type === 'tree') return 1;
            return a.name.localeCompare(b.name);
        });
    });

    return tree.children;
}


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
