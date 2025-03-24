import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SourceSelector } from "@/components/source-selector";
import { LLMSelector } from "@/components/llm-selector";
import { AnalysisResults } from "@/components/analysis-results";
import { AzureRecommendationButton } from "@/components/azure-recommendation-button";
import { TerraformGenerationButton } from "@/components/terraform-generation-button";
import { TerraformCodeDisplay } from "@/components/terraform-code-display";
import { AzureDeploymentButton } from "@/components/azure-deployment-button";
import { Github, Settings, Cloud } from "lucide-react";
import { AnalysisResult, LLMModel } from "@/lib/types";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import React from "react";

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<LLMModel>("gpt-4o-mini");
  const [location] = useLocation();
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

  // Azure Hosting Recommendation Mutation
  const azureRecommendationMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await apiRequest("POST", "/api/azure-recommendation", {
        analysisId,
        model: selectedModel,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
      toast({
        title: "Azure Recommendations Generated",
        description: "Azure hosting recommendations have been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Azure Recommendations Failed",
        description: error.message || "Failed to generate Azure hosting recommendations",
        variant: "destructive",
      });
    },
  });

  const { data: analysisResult, isLoading: isLoadingResults } = useQuery<AnalysisResult>({
    queryKey: ["/api/analysis"],
    enabled: !analyzeRepoMutation.isPending && !azureRecommendationMutation.isPending,
  });

  const handleAnalyzeRepo = (repoUrl: string) => {
    analyzeRepoMutation.mutate(repoUrl);
  };

  const handleModelChange = (model: LLMModel) => {
    setSelectedModel(model);
  };
  
  const handleGenerateAzureRecommendations = () => {
    if (analysisResult?.id) {
      azureRecommendationMutation.mutate(analysisResult.id);
    } else {
      toast({
        title: "No Analysis Available",
        description: "Please analyze a repository first before generating Azure recommendations.",
        variant: "destructive",
      });
    }
  };

  // Terraform Code Generation Mutation
  const terraformGenerationMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await apiRequest("POST", "/api/terraform", {
        analysisId,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
      toast({
        title: "Terraform Code Generated",
        description: "Infrastructure as Code has been successfully generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Terraform Generation Failed",
        description: error.message || "Failed to generate Terraform code",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTerraform = () => {
    if (analysisResult?.id) {
      terraformGenerationMutation.mutate(analysisResult.id);
    } else {
      toast({
        title: "No Analysis Available",
        description: "Please analyze a repository first before generating Terraform code.",
        variant: "destructive",
      });
    }
  };

  const isLoading = 
    analyzeRepoMutation.isPending || 
    isLoadingResults || 
    azureRecommendationMutation.isPending || 
    terraformGenerationMutation.isPending;

  // Handle Azure auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const azureStatus = params.get('azure');
    
    if (azureStatus === 'success') {
      toast({
        title: "Azure Connected",
        description: "Successfully connected to Azure. You can now deploy resources.",
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    } else if (azureStatus === 'error') {
      toast({
        title: "Azure Connection Failed",
        description: "Failed to connect to Azure. Please try again.",
        variant: "destructive",
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, [location, toast]);

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
            <Link href="/azure/auth">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                <span>Connect Azure</span>
              </Button>
            </Link>
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
        
        {/* Azure Recommendations Button - Shown only after analysis and if no recommendations exist yet */}
        {analysisResult && !analysisResult.hostingRecommendation && (
          <AzureRecommendationButton 
            onGenerateRecommendations={handleGenerateAzureRecommendations}
            isLoading={azureRecommendationMutation.isPending}
            isDisabled={!analysisResult || isLoading}
          />
        )}
        
        {/* Terraform Generation Button - Shown only after Azure hosting recommendations exist and if no Terraform code exists yet */}
        {analysisResult && analysisResult.hostingRecommendation && !analysisResult.terraformCode && (
          <div className="mt-6">
            <TerraformGenerationButton 
              onGenerateTerraform={handleGenerateTerraform}
              isLoading={terraformGenerationMutation.isPending}
              isDisabled={!analysisResult || !analysisResult.hostingRecommendation || isLoading}
            />
          </div>
        )}
        
        {/* Terraform Code Display - Shown only when Terraform code exists or when generating */}
        {(analysisResult && analysisResult.hostingRecommendation && 
          (analysisResult.terraformCode || terraformGenerationMutation.isPending)) && (
          <div className="mt-6">
            <TerraformCodeDisplay 
              terraformCode={analysisResult?.terraformCode || null}
              isLoading={terraformGenerationMutation.isPending}
              onGenerateTerraform={handleGenerateTerraform}
              isGenerating={terraformGenerationMutation.isPending}
              disabled={!analysisResult || !analysisResult.hostingRecommendation || isLoading}
            />
          </div>
        )}
        
        {/* Azure Deployment Button - Shown only when Terraform code exists */}
        {analysisResult && analysisResult.terraformCode && (
          <div className="mt-6">
            <AzureDeploymentButton 
              analysisId={analysisResult.id}
              terraformCode={analysisResult.terraformCode}
              disabled={!analysisResult || !analysisResult.terraformCode || isLoading}
            />
          </div>
        )}
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
