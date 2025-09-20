import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get('url');

  if (!repoUrl) {
    return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
  }

  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
  }

  const [, owner, repoName] = repoMatch;

  try {
    // Mock data for demo
    const repo = {
      id: 1,
      name: repoName,
      full_name: `${owner}/${repoName}`,
      description: `A sample repository: ${repoName}`,
      html_url: repoUrl,
      stargazers_count: 1234,
      forks_count: 567,
      watchers_count: 890,
      language: 'TypeScript',
      updated_at: new Date().toISOString(),
      default_branch: 'main',
      owner: {
        login: owner,
        avatar_url: `https://github.com/${owner}.png`
      }
    };

    const rawTree = [
      {
        name: 'src',
        path: 'src',
        type: 'tree' as const,
        children: [
          { name: 'index.ts', path: 'src/index.ts', type: 'blob' as const },
          { name: 'utils.ts', path: 'src/utils.ts', type: 'blob' as const }
        ]
      },
      {
        name: 'package.json',
        path: 'package.json',
        type: 'blob' as const
      },
      {
        name: 'README.md',
        path: 'README.md',
        type: 'blob' as const
      }
    ];

    const readme = `# ${repoName}

Welcome to ${repoName}! This is a sample repository.

## Features
- Modern TypeScript setup
- Clean architecture
- Well documented

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`
`;

    const packageJson = {
      name: repoName,
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'next': '^15.0.0',
        'typescript': '^5.0.0'
      },
      devDependencies: {
        '@types/react': '^18.0.0',
        'eslint': '^8.0.0'
      }
    };
    
    return NextResponse.json({ repo, rawTree, readme, packageJson });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}