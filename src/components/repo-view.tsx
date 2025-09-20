import 'server-only';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import type { GitHubRepo, PackageJson } from '@/lib/types';
import type { TreeNode } from '@/lib/tree';
import { AppIdeation } from './app-ideation';
import { Logo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getFilePaths } from '@/lib/tree';

interface RepoViewProps {
  repo: GitHubRepo;
  tree: TreeNode[];
  readme: string;
  packageJson: PackageJson | null;
}

export function RepoView({ repo, tree, readme, packageJson }: RepoViewProps) {
  const filePaths = getFilePaths(tree);
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <SidebarInset className="flex flex-col">
            <header className="flex h-[57px] items-center gap-4 border-b bg-background px-4">
                <div className="flex items-center gap-3">
                    <Logo className="text-primary h-8 w-8" />
                    <span className="font-headline text-xl font-semibold">
                        The Chimera Framework
                    </span>
                </div>
                <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
                    Source Repo:
                     <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:underline">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                            <AvatarFallback>{repo.owner.login.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className='font-mono'>{repo.full_name}</span>
                    </a>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                 <AppIdeation repo={{name: repo.name, description: repo.description || '', filePaths}} />
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
