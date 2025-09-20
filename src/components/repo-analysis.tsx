import 'server-only';
import { analyzeRepo } from '@/ai/flows/repo-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Bot, Bug, ShieldAlert, Network } from 'lucide-react';
import type { RepoAnalysisOutput } from '@/lib/schema';

interface RepoAnalysisProps {
  filePaths: string[];
  repoDescription: string;
}

const renderIssues = (issues: RepoAnalysisOutput['potentialBugs'] | undefined) => {
  if (!issues || issues.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No specific issues identified in this category.</p>;
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div key={issue.name} className="p-4 border rounded-lg bg-muted/50 dark:bg-muted/20">
          <h3 className="font-semibold text-lg">{issue.name}</h3>
          <p className="text-muted-foreground text-sm">{issue.reason}</p>
        </div>
      ))}
    </div>
  );
};


export async function RepoAnalysis({ filePaths, repoDescription }: RepoAnalysisProps) {
  const analysis = await analyzeRepo({ filePaths, repoDescription });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Code Auditor Report
          </CardTitle>
          <CardDescription>{analysis.summary}</CardDescription>
        </CardHeader>
        <CardContent>
            <h4 className="font-semibold text-sm mb-2">Technologies Detected</h4>
            <div className="flex flex-wrap gap-2">
                {analysis.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2"><Bug className="w-5 h-5"/>Potential Bugs & Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {renderIssues(analysis.potentialBugs)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2"><ShieldAlert className="w-5 h-5"/>Security Vulnerabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {renderIssues(analysis.securityVulnerabilities)}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2"><Network className="w-5 h-5"/>Architectural Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          {renderIssues(analysis.architecturalLimitations)}
        </CardContent>
      </Card>
    </div>
  );
}
