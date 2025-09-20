import 'server-only';
import { enhanceReadme } from '@/ai/flows/readme-enhancement';
import { ReadmeQna } from './readme-qna';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from './ui/card';

export async function ReadmeDisplay({ readmeContent, repoDescription, repoUrl }: { readmeContent: string; repoDescription: string; repoUrl: string }) {
  let displayContent = readmeContent;
  try {
    const { enhancedReadme } = await enhanceReadme({
      repoDescription,
      readmeContent,
      repoUrl,
    });
    displayContent = enhancedReadme;
  } catch (error) {
    console.error("Failed to enhance README:", error);
  }

  const hasContent = displayContent && displayContent.trim() && !displayContent.includes("No README found");

  if (!hasContent) {
    return (
        <Card className="m-4 flex flex-col items-center justify-center p-8 min-h-[300px]">
            <h2 className='text-xl font-semibold font-headline'>No README found</h2>
            <p className='text-muted-foreground'>This repository does not have a README.md file.</p>
        </Card>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
        <article className="prose dark:prose-invert">
            <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                img: ({node, ...props}) => <img {...props} style={{maxWidth: '100%'}} />
            }}
            >
            {displayContent}
            </ReactMarkdown>
        </article>
        <ReadmeQna readmeContent={readmeContent} />
    </div>
  );
}
