import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SourceSelector } from "@/components/source-selector";
import { LLMSelector } from "@/components/llm-selector";
import { AnalysisResults } from "@/components/analysis-results";
import { Github, Settings } from "lucide-react";
import { AnalysisResult, LLMModel } from "@/lib/types";

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<LLMModel>("gpt-4o-mini");
  const { toast } = useToast();

  const analyzeRepoMutation = useMutation({
    mutationFn: async (repoUrl: string) => {
      const response = await apiRequest("POST", "/api/analyze", {
        repoUrl,
        model: selectedModel,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Please try again with a different repository",
        variant: "destructive",
      });
    },
  });

  const { data: analysisResult, isLoading: isLoadingResults } = useQuery<AnalysisResult>({
    queryKey: ["/api/analysis"],
    enabled: !analyzeRepoMutation.isPending,
  });

  const handleAnalyzeRepo = (repoUrl: string) => {
    analyzeRepoMutation.mutate(repoUrl);
  };

  const handleModelChange = (model: LLMModel) => {
    setSelectedModel(model);
  };

  const isLoading = analyzeRepoMutation.isPending || isLoadingResults;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Github className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">RepoAnalyzer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
              <Settings className="h-5 w-5" />
            </button>
            <ThemeToggle />
            <button className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
              <span className="mr-2 hidden sm:inline">John Doe</span>
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
                JD
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <SourceSelector onSourceSelected={handleAnalyzeRepo} isLoading={isLoading} />
        <LLMSelector
          selectedModel={selectedModel}
          onModelSelected={handleModelChange}
          disabled={isLoading}
        />
        <AnalysisResults
          results={analysisResult || null}
          isLoading={isLoading}
          selectedModel={selectedModel}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Github className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">RepoAnalyzer</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} RepoAnalyzer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
