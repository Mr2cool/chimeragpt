'use server';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import type { GitHubRepo, PackageJson } from '@/lib/types';
import { AppIdeation } from './app-ideation';
import { Logo } from './icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getFilePaths, buildTree, type TreeNode } from '@/lib/tree';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadmeDisplay } from './readme-display';
import { RepoAnalysis } from './repo-analysis';
import { DirectoryTree } from './directory-tree';
import { DependencyList } from './dependency-list';
import { ScrollArea } from './ui/scroll-area';
import { FrameworkDesigner } from './framework-designer';
import { WebAgent } from './web-agent';
import { VideoGenerator } from './video-generator';
import { StoryCreator } from './story-creator';
import { ConversationStarter } from './conversation-starter';

interface RepoViewProps {
  repo: GitHubRepo;
  rawTree: any[];
  readme: string;
  packageJson: PackageJson | null;
}

export async function RepoView({ repo, rawTree, readme, packageJson }: RepoViewProps) {
  const filePaths = getFilePaths(rawTree);
  const tree = buildTree(rawTree);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="w-80 border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-[57px] items-center gap-2 border-b p-3.5">
              <Logo className="text-primary" />
              <h2 className="font-headline text-xl font-semibold">
                The Chimera Framework
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:underline">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                    <AvatarFallback>{repo.owner.login.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className='font-mono text-lg'>{repo.full_name}</span>
                </a>
                <p className="text-sm text-muted-foreground mt-2">{repo.description}</p>
              </div>

              <Tabs defaultValue="files" className="w-full p-2">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="deps">Dependencies</TabsTrigger>
                </TabsList>
                <TabsContent value="files" className="mt-2">
                   <div className="h-[calc(100vh-220px)]">
                    <DirectoryTree tree={tree} />
                  </div>
                </TabsContent>
                <TabsContent value="deps" className="mt-2">
                  <div className="h-[calc(100vh-220px)]">
                    <ScrollArea className="h-full">
                      <div className='px-2'>
                        {packageJson ? (
                          <DependencyList packageJson={packageJson} />
                        ) : (
                          <p className="text-sm text-muted-foreground p-4 text-center">No package.json found.</p>
                        )}
                      </div>
                    </ScrollArea>
                   </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <main className="flex-1 overflow-y-auto">
            <Tabs defaultValue="modernize" className="h-full flex flex-col">
              <div className="flex-shrink-0 px-4 pt-4">
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="modernize">Modernize</TabsTrigger>
                  <TabsTrigger value="readme">README</TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="design">Architect</TabsTrigger>
                  <TabsTrigger value="story">Story</TabsTrigger>
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  <TabsTrigger value="web">Web</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="modernize" className="flex-1 overflow-y-auto">
                <AppIdeation repo={{ name: repo.name, description: repo.description || '', filePaths }} />
              </TabsContent>
              <TabsContent value="readme" className="flex-1 overflow-y-auto">
                <ReadmeDisplay readmeContent={readme} repoDescription={repo.description || ''} repoUrl={repo.html_url} />
              </TabsContent>
              <TabsContent value="review" className="flex-1 overflow-y-auto">
                <RepoAnalysis filePaths={filePaths} repoDescription={repo.description || ''} />
              </TabsContent>
              <TabsContent value="design" className="flex-1 overflow-y-auto">
                <FrameworkDesigner />
              </TabsContent>
              <TabsContent value="web" className="flex-1 overflow-y-auto">
                <WebAgent />
              </TabsContent>
              <TabsContent value="video" className="flex-1 overflow-y-auto">
                <VideoGenerator />
              </TabsContent>
              <TabsContent value="story" className="flex-1 overflow-y-auto">
                <StoryCreator />
              </TabsContent>
              <TabsContent value="conversation" className="flex-1 overflow-y-auto">
                <ConversationStarter />
              </TabsContent>
            </Tabs>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
