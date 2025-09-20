import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarGroup } from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";

export default function Loading() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="w-80 border-r">
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 p-3.5">
                    <Logo className="text-primary" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-2">
                    <Skeleton className="h-9 w-full mb-2" />
                    <SidebarGroup>
                        <div className="space-y-2">
                            {[...Array(15)].map((_, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5" />
                                    <Skeleton className="h-5 flex-1" />
                                </div>
                            ))}
                        </div>
                    </SidebarGroup>
                </div>
            </div>
        </Sidebar>
        <SidebarInset className="flex flex-col">
            <header className="flex h-[57px] items-center gap-4 border-b bg-background px-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-48" />
                <div className="ml-auto flex items-center gap-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-9 w-32 hidden sm:block" />
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-8">
                <Skeleton className="h-10 w-1/2 mb-8" />
                <div className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                </div>
                <Skeleton className="h-8 w-1/3 my-8" />
                <div className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                </div>
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
