"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Sparkles } from "lucide-react";
import type { Repository } from "@/lib/types";

interface ReadmeDisplayProps {
  readme: string;
  repo: Repository;
  selectedFile?: string | null;
}

export function ReadmeDisplay({ readme, repo, selectedFile }: ReadmeDisplayProps) {
  const [enhancedReadme, setEnhancedReadme] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    const enhanceReadme = async () => {
      if (!readme) return;
      
      setIsEnhancing(true);
      
      // Simulate AI enhancement - in real app, this would call an AI service
      const intro = `## 🚀 Welcome to ${repo.name}

${repo.description || "A powerful repository ready for exploration."}

This repository contains ${repo.language ? `primarily **${repo.language}** code` : "various technologies"} and has been starred by **${repo.stargazers_count?.toLocaleString() || 0}** developers. Last updated on ${new Date(repo.updated_at).toLocaleDateString()}.

---

`;
      
      setEnhancedReadme(intro + readme);
      setIsEnhancing(false);
    };

    enhanceReadme();
  }, [readme, repo]);

  if (selectedFile) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-[#64B5F6]" />
          <h3 className="font-['Space_Grotesk'] text-lg font-semibold">File Content</h3>
          <Badge variant="outline">{selectedFile}</Badge>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          <p className="text-gray-600">File content would be displayed here...</p>
          <p className="text-gray-500 mt-2">Path: {selectedFile}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-6 h-6 text-[#64B5F6]" />
        <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-gray-800">
          README
        </h2>
        {isEnhancing && (
          <Badge className="bg-[#A5D6A7] text-gray-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Enhanced
          </Badge>
        )}
      </div>
      
      <div className="prose prose-lg max-w-none font-['Inter']">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-800 mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-gray-800 mt-8 mb-4">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-['Space_Grotesk'] text-xl font-semibold text-gray-700 mt-6 mb-3">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-gray-600 leading-relaxed mb-4">
                {children}
              </p>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                  {children}
                </code>
              ) : (
                <code className="block bg-gray-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  {children}
                </code>
              );
            },
            a: ({ children, href }) => (
              <a 
                href={href} 
                className="text-[#64B5F6] hover:text-[#42A5F5] underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[#A5D6A7] pl-4 italic text-gray-600 my-4">
                {children}
              </blockquote>
            ),
          }}
        >
          {enhancedReadme || readme || "No README available for this repository."}
        </ReactMarkdown>
      </div>
    </div>
  );
}