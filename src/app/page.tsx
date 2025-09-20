import { RepoInputForm } from "@/components/repo-input-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F0F4F8] p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold text-gray-800 mb-2">
            Nano GitHub Viewer
          </h1>
          <p className="font-['Inter'] text-gray-600">
            Explore GitHub repositories with AI-enhanced insights
          </p>
        </header>
        <RepoInputForm />
      </div>
    </main>
  );
}
