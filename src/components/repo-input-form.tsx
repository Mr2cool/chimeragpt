"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, GithubIcon } from "lucide-react";
import { Logo } from "./icons";

interface RepoInputFormProps {
  error?: string;
  initialValue?: string;
}

export function RepoInputForm({ error, initialValue = "https://github.com/google/genkit" }: RepoInputFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (repoUrl) {
      router.push(`/?repo=${encodeURIComponent(repoUrl)}`);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Logo className="w-16 h-16 text-primary" />
        </div>
        <CardTitle className="font-headline text-3xl">The Chimera Framework</CardTitle>
        <CardDescription>
          Enter a source GitHub repository URL. The framework will analyze it to inspire and generate new, detailed application proposals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Source Repository URL</Label>
            <Input
              id="repo-url"
              type="text"
              placeholder="e.g., https://github.com/google/genkit"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <GithubIcon className="mr-2 h-4 w-4" />
            Start Ideation
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center flex-col items-center">
          <p className="text-xs text-muted-foreground">A multi-agent framework for application development.</p>
      </CardFooter>
    </Card>
  );
}
