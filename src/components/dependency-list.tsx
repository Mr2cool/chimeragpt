"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Shield, AlertTriangle } from "lucide-react";

interface DependencyListProps {
  packageJson: any;
}

export function DependencyList({ packageJson }: DependencyListProps) {
  const dependencies = packageJson?.dependencies || {};
  const devDependencies = packageJson?.devDependencies || {};
  
  const allDeps = { ...dependencies, ...devDependencies };
  const depEntries = Object.entries(allDeps);

  if (depEntries.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 font-['Inter']">
        No dependencies found
      </div>
    );
  }

  const getDepType = (name: string) => {
    if (dependencies[name]) return "prod";
    if (devDependencies[name]) return "dev";
    return "unknown";
  };

  const getDepIcon = (type: string) => {
    switch (type) {
      case "prod":
        return <Package className="w-3 h-3" />;
      case "dev":
        return <Shield className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getDepColor = (type: string) => {
    switch (type) {
      case "prod":
        return "bg-[#64B5F6] text-white";
      case "dev":
        return "bg-[#A5D6A7] text-gray-800";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="p-4 space-y-3">
        {depEntries.map(([name, version], index) => {
          const type = getDepType(name);
          return (
            <div key={name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge 
                    className={`${getDepColor(type)} flex items-center gap-1 text-xs`}
                  >
                    {getDepIcon(type)}
                    {type}
                  </Badge>
                  <span className="font-['Inter'] text-sm text-gray-700 truncate">
                    {name}
                  </span>
                </div>
                <span className="font-mono text-xs text-gray-500 ml-2">
                  {version as string}
                </span>
              </div>
              {index < depEntries.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}