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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GitHubRepo, PackageJson } from '@/lib/types';
import type { TreeNode } from '@/lib/tree';
import { DirectoryTree } from './directory-tree';
import { ReadmeDisplay } from './readme-display';
import { RepoAnalysis } from './repo-analysis';
import { FrameworkDesigner } from './framework-designer';
import { WebAgent } from './web-agent';
import { VideoGenerator } from './video-generator';
import { StoryCreator } from './story-creator';
import { DependencyList } from './dependency-list';
import { Star, GitFork, Video, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { GithubIcon, Logo } from './icons';
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
                <Tabs defaultValue="readme" className="h-full">
                    <div className='sticky top-0 bg-background z-10 border-b'>
                        <TabsList className="p-0 m-4 bg-transparent gap-4">
                            <TabsTrigger value="readme" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">README</TabsTrigger>
                            <TabsTrigger value="analysis" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">Analysis</TabsTrigger>
                            <TabsTrigger value="designer" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">Designer</TabsTrigger>
                            <TabsTrigger value="web-agent" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">Web Agent</TabsTrigger>
                            <TabsTrigger value="video" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                                <Video className="w-4 h-4 mr-2"/>
                                Video
                            </TabsTrigger>
                            <TabsTrigger value="story-creator" className="h-auto rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary">
                                <Bot className="w-4 h-4 mr-2"/>
                                Story Creator
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="readme" className="mt-0">
                        <ReadmeDisplay 
                            readmeContent={readme} 
                            repoDescription={repo.description || ''}
                            repoUrl={repo.html_url}
                        />
                    </TabsContent>
                    <TabsContent value="analysis" className="mt-0">
                        <RepoAnalysis filePaths={filePaths} repoDescription={repo.description || ''} />
                    </TabsContent>
                    <TabsContent value="designer" className="mt-0">
                        <FrameworkDesigner />
                    </TabsContent>
                     <TabsContent value="web-agent" className="mt-0">
                        <WebAgent />
                    </TabsContent>
                     <TabsContent value="video" className="mt-0">
                        <VideoGenerator />
                    </TabsContent>
                     <TabsContent value="story-creator" className="mt-0">
                        <StoryCreator />
                    </TabsContent>
                </Tabs>
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
