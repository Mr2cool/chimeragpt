"use client";

import * as React from 'react';
import { Folder, FileText, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/lib/tree';

interface DirectoryTreeProps {
  tree: TreeNode[];
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  searchQuery: string;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, searchQuery }) => {
  const isFolder = node.type === 'tree';
  const [isOpen, setIsOpen] = React.useState(depth < 2);

  const toggleOpen = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-primary/30 rounded-sm">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div>
      <div
        className={cn(
            "flex items-center p-1 rounded-md hover:bg-accent cursor-pointer text-sm",
            isFolder ? "font-medium" : "text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 1}rem` }}
        onClick={toggleOpen}
      >
        {isFolder ? (
          <div className="flex items-center flex-1 gap-1">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Folder className="h-4 w-4 text-primary" />
            <span>{highlightMatch(node.name, searchQuery)}</span>
          </div>
        ) : (
          <div className="flex items-center flex-1 gap-1 ml-4">
            <FileText className="h-4 w-4" />
            <span>{highlightMatch(node.name, searchQuery)}</span>
          </div>
        )}
      </div>
      {isFolder && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};

const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;

    const lowerCaseQuery = query.toLowerCase();

    return nodes.reduce((acc: TreeNode[], node) => {
        if (node.name.toLowerCase().includes(lowerCaseQuery)) {
            acc.push(node);
            return acc;
        }

        if (node.type === 'tree') {
            const filteredChildren = filterTree(node.children, query);
            if (filteredChildren.length > 0) {
                acc.push({ ...node, children: filteredChildren });
            }
        }
        return acc;
    }, []);
};


export const DirectoryTree: React.FC<DirectoryTreeProps> = ({ tree }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredTree, setFilteredTree] = React.useState(tree);

  React.useEffect(() => {
    setFilteredTree(filterTree(tree, searchQuery));
  }, [searchQuery, tree]);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search files..."
          className="pl-8 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
            {filteredTree.length > 0 ? (
                filteredTree.map((node) => <TreeItem key={node.path} node={node} depth={0} searchQuery={searchQuery} />)
            ) : (
                <p className="text-sm text-muted-foreground p-2">No files found.</p>
            )}
        </div>
      </ScrollArea>
    </div>
  );
};
