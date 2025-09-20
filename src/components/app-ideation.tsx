"use client";
import * as React from 'react';
import { generateAppIdeas } from '@/ai/flows/app-ideation';
import { AppIdeationInput, AppIdeationOutput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Bot, Code, ListTodo, WandSparkles, Cpu } from 'lucide-react';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface AppIdeationProps {
  repo: {
    name: string;
    description: string;
    filePaths: string[];
  }
}

export function AppIdeation({ repo }: AppIdeationProps) {
  const [result, setResult] = React.useState<AppIdeationOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [numIdeas, setNumIdeas] = React.useState(3);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const input: AppIdeationInput = {
        repoName: repo.name,
        repoDescription: repo.description,
        filePaths: repo.filePaths,
        numIdeas,
      };
      const response = await generateAppIdeas(input);
      setResult(response);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <WandSparkles className="w-6 h-6 text-primary" />
            AI-Powered App Ideation
          </CardTitle>
          <CardDescription>
            Click the button below to generate new application ideas based on the current repository. A multi-agent system will analyze the repo, brainstorm concepts, and create a detailed plan for each.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="num-ideas">Number of Ideas ({numIdeas})</Label>
                     <Slider
                        id="num-ideas"
                        min={1}
                        max={5}
                        step={1}
                        value={[numIdeas]}
                        onValueChange={(value) => setNumIdeas(value[0])}
                        disabled={isLoading}
                      />
                </div>
                 <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? 'Generating Ideas...' : 'Generate App Ideas'}
                </Button>
            </div>
        </CardContent>
      </Card>
      
      {isLoading && (
         <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(numIdeas)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                         <div className="space-y-2">
                            <Skeleton className="h-5 w-1/4" />
                            <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {result.ideas.map((idea, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{idea.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 flex-1">
                <p className="text-sm text-muted-foreground">{idea.description}</p>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Code className="w-4 h-4"/>Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {idea.techStack.map(tech => <Badge key={tech} variant="secondary">{tech}</Badge>)}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Cpu className="w-4 h-4"/>AI Agents</h4>
                  <div className="space-y-2 text-sm">
                    {idea.agents.map(agent => (
                      <div key={agent.name}>
                        <p className="font-medium text-foreground">{agent.name}</p>
                        <p className="text-muted-foreground text-xs">{agent.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start p-6 bg-muted/50 dark:bg-muted/20">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ListTodo className="w-4 h-4"/>To-Do List</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {idea.todoList.map((task, i) => <li key={i}>{task}</li>)}
                </ul>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
