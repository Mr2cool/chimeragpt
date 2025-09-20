import 'server-only';
import { analyzeRepo } from '@/ai/flows/repo-analysis';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface RepoAnalysisProps {
  filePaths: string[];
  repoDescription: string;
}

export async function RepoAnalysis({ filePaths, repoDescription }: RepoAnalysisProps) {
  const analysis = await analyzeRepo({ filePaths, repoDescription });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Project Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Technologies Detected</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {analysis.technologies.map((tech) => (
            <Badge key={tech} variant="secondary">{tech}</Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">AI Framework Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.frameworkSuggestions.map((suggestion) => (
            <div key={suggestion.name} className="p-4 border rounded-lg">
              <h3 className="font-semibold text-lg">{suggestion.name}</h3>
              <p className="text-muted-foreground">{suggestion.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
