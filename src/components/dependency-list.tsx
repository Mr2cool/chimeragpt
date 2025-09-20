import 'server-only';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { PackageJson } from "@/lib/types";

interface DependencyListProps {
  packageJson: PackageJson;
}

const renderDependencies = (deps: Record<string, string> | undefined) => {
  if (!deps || Object.keys(deps).length === 0) {
    return <p className="text-sm text-muted-foreground px-4">None found.</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      {Object.entries(deps).map(([name, version]) => (
        <li key={name} className="flex justify-between items-center ml-2">
          <span>{name}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-sm">{version}</span>
        </li>
      ))}
    </ul>
  );
};

export function DependencyList({ packageJson }: DependencyListProps) {
  const hasDependencies = packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0;
  const hasDevDependencies = packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0;

  return (
    <Accordion type="multiple" defaultValue={['dependencies']} className="w-full">
      {hasDependencies && (
        <AccordionItem value="dependencies">
          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
            Dependencies ({Object.keys(packageJson.dependencies!).length})
          </AccordionTrigger>
          <AccordionContent>
            {renderDependencies(packageJson.dependencies)}
          </AccordionContent>
        </AccordionItem>
      )}
      {hasDevDependencies && (
        <AccordionItem value="dev-dependencies">
          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
            Dev Dependencies ({Object.keys(packageJson.devDependencies!).length})
          </AccordionTrigger>
          <AccordionContent>
            {renderDependencies(packageJson.devDependencies)}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
