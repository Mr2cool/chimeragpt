import 'server-only';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import type { GitHubRepo, PackageJson } from '@/lib/types';
import type { TreeNode } from '@/lib/tree';
import { DirectoryTree } from './directory-tree';
import { ReadmeDisplay } from './readme-display';
import { DependencyList } from './dependency-list';
import { Star, GitFork } from 'lucide-react';
import { Button } from './ui/button';
import { GithubIcon, Logo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface RepoViewProps {
  repo: GitHubRepo;
  tree: TreeNode[];
  readme: string;
  packageJson: PackageJson | null;
}

export function RepoView({ repo, tree, readme, packageJson }: RepoViewProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="w-80 border-r" collapsible="icon">
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 p-3.5">
                    <Logo className="text-primary" />
                    <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
                        Nano GitHub Viewer
                    </span>
                </div>
                <SidebarSeparator />
                <SidebarContent className="p-0">
                    <SidebarGroup className="p-2">
                        <SidebarGroupLabel>Files</SidebarGroupLabel>
                        <DirectoryTree tree={tree} />
                    </SidebarGroup>
                    <SidebarSeparator />
                    {packageJson && (
                        <SidebarGroup className="p-2">
                            <DependencyList packageJson={packageJson} />
                        </SidebarGroup>
                    )}
                </SidebarContent>
            </div>
        </Sidebar>
        <SidebarInset className="flex flex-col">
            <header className="flex h-[57px] items-center gap-4 border-b bg-background px-4">
                <SidebarTrigger className="md:hidden" />
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                        <AvatarFallback>{repo.owner.login.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-headline text-xl font-semibold hover:underline">
                        {repo.full_name}
                    </a>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span>{repo.stargazers_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                        <GitFork className="h-4 w-4 text-muted-foreground" />
                        <span>{repo.forks_count.toLocaleString()}</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                            <GithubIcon className="mr-2 h-4 w-4" />
                            View on GitHub
                        </a>
                    </Button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto">
                <ReadmeDisplay 
                    readmeContent={readme} 
                    repoDescription={repo.description || ''}
                    repoUrl={repo.html_url}
                />
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
