"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DirectoryTree } from "@/components/directory-tree";
import { DependencyList } from "@/components/dependency-list";
import { ReadmeDisplay } from "@/components/readme-display";
import { Search, Github, Star, GitFork, Eye, Calendar, User, Package } from "lucide-react";
import type { Repository, TreeNode } from "@/lib/types";

interface RepoViewProps {
  repo: Repository;
  rawTree: TreeNode[];
  readme: string;
  packageJson?: any;
}

export function RepoView({ repo, rawTree, readme, packageJson }: RepoViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const filteredTree = useMemo(() => {
    if (!searchQuery) return rawTree;
    
    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce((acc: TreeNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = node.children ? filterTree(node.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }
        
        return acc;
      }, []);
    };
    
    return filterTree(rawTree);
  }, [rawTree, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Github className="w-8 h-8 text-[#64B5F6]" />
              <div>
                <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-gray-900">
                  {repo.name}
                </h1>
                <p className="font-['Inter'] text-gray-600">{repo.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repo.stargazers_count?.toLocaleString() || 0}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {repo.forks_count?.toLocaleString() || 0}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {repo.watchers_count?.toLocaleString() || 0}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 font-['Inter']">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {repo.owner?.login}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated {new Date(repo.updated_at).toLocaleDateString()}
            </div>
            {repo.language && (
              <Badge className="bg-[#A5D6A7] text-gray-800">
                {repo.language}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Search */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-['Space_Grotesk'] text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#64B5F6]" />
                  File Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="font-['Inter']"
                />
              </CardContent>
            </Card>

            {/* Directory Structure */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-['Space_Grotesk'] text-lg">
                  Directory Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DirectoryTree 
                  tree={filteredTree} 
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              </CardContent>
            </Card>

            {/* Dependencies */}
            {packageJson && (
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-['Space_Grotesk'] text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#64B5F6]" />
                    Dependencies
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DependencyList packageJson={packageJson} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                <ReadmeDisplay 
                  readme={readme} 
                  repo={repo}
                  selectedFile={selectedFile}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}