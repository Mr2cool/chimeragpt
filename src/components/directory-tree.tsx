"use client";

import * as React from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TreeNode } from '@/lib/types';

interface DirectoryTreeProps {
  tree: TreeNode[];
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
}

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
}

function TreeItem({ node, level, onFileSelect, selectedFile }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFile === node.path;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(node.path);
    }
  };

  const paddingLeft = level * 20;

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-2 px-3 cursor-pointer transition-all duration-200 hover:bg-[#64B5F6]/10 rounded-md mx-2",
          isSelected && "bg-[#A5D6A7]/20 text-gray-800 font-medium"
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-2 text-[#64B5F6] transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2 text-[#64B5F6] transition-transform" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-[#64B5F6]" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-[#64B5F6]" />
            )}
          </>
        ) : (
          <>
            <div className="w-4 h-4 mr-2" />
            <File className="w-4 h-4 mr-2 text-gray-500" />
          </>
        )}
        <span className="font-['Inter'] text-sm truncate text-gray-700">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="transition-all duration-200">
          {node.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectoryTree({ tree, onFileSelect, selectedFile }: DirectoryTreeProps) {
  return (
    <div className="max-h-96 overflow-y-auto">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          level={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
}