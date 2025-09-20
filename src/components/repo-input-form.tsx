"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Github, Search } from "lucide-react";

interface RepoInputFormProps {
  error?: string;
  initialValue?: string;
}

export function RepoInputForm({ error, initialValue = "" }: RepoInputFormProps) {
  const [repoUrl, setRepoUrl] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (repoUrl) {
      router.push(`/repo?repo=${encodeURIComponent(repoUrl)}`);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-white shadow-lg border-0 transition-all duration-300 hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-[#64B5F6] to-[#42A5F5] text-white rounded-t-lg">
        <CardTitle className="font-['Space_Grotesk'] text-2xl flex items-center gap-3">
          <Github className="w-7 h-7" />
          GitHub Repository Explorer
        </CardTitle>
        <CardDescription className="text-blue-50 font-['Inter']">
          Discover repository insights with AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-['Inter']">{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label 
              htmlFor="repo-url" 
              className="font-['Space_Grotesk'] text-gray-700 text-lg"
            >
              Repository URL
            </Label>
            <div className="relative">
              <Input
                id="repo-url"
                type="text"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="font-['Inter'] pl-12 h-12 border-2 border-gray-200 focus:border-[#64B5F6] transition-colors"
                required
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <p className="font-['Inter'] text-gray-600 text-sm">
              Enter any public GitHub repository URL to explore
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-[#A5D6A7] hover:bg-[#81C784] text-gray-800 font-['Space_Grotesk'] font-semibold transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Github className="w-5 h-5 mr-2" />
            Explore Repository
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}