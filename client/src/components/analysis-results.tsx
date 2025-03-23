import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoHeader } from "@/components/repo-header";
import { ArrowUp, Code, Package, Server, Cloud } from "lucide-react";
import { AnalysisResult, AnalysisDimension, AzureService } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AnalysisResultsProps {
  results: AnalysisResult | null;
  isLoading: boolean;
  selectedModel: string;
}

export function AnalysisResults({ results, isLoading, selectedModel }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<AnalysisDimension>("database");

  const dimensionLabels: Record<AnalysisDimension, string> = {
    database: "Database",
    storage: "Storage",
    configuration: "Configuration",
    apiIntegrations: "API Integrations",
    authentication: "Authentication",
    compute: "Compute",
    networking: "Networking",
    deployment: "Deployment",
    scalability: "Scalability",
    logging: "Logging",
    development: "Development",
    security: "Security",
  };

  if (!results && !isLoading) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Analysis Results</h2>
        {results && <RepoHeader repoName={results.repoName} />}
      </div>

      {/* Language and Framework Detection Summary */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Languages Section Skeleton */}
          <Card className="p-4">
            <div className="flex items-center mb-3">
              <Skeleton className="h-5 w-5 rounded-md mr-2" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </Card>

          {/* Frameworks Section Skeleton */}
          <Card className="p-4">
            <div className="flex items-center mb-3">
              <Skeleton className="h-5 w-5 rounded-md mr-2" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        results && (results.languages.length > 0 || results.frameworks.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Languages Section */}
            <Card className="p-4">
              <div className="flex items-center mb-3">
                <Code className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-md font-semibold">Languages Detected</h3>
              </div>
              <div className="space-y-3">
                {results.languages.slice(0, 5).map((language) => (
                  <div key={language.name} className="space-y-1">
                    <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                      <span>{language.name}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {language.percentage}% ({language.files} files)
                      </span>
                    </div>
                    <Progress value={language.percentage} className="h-2" />
                  </div>
                ))}
                {results.languages.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No languages detected</p>
                )}
              </div>
            </Card>

            {/* Frameworks Section */}
            <Card className="p-4">
              <div className="flex items-center mb-3">
                <Package className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-md font-semibold">Frameworks & Libraries</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.frameworks.map((framework) => (
                  <Badge 
                    key={framework.name} 
                    variant="outline"
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  >
                    <span className="mr-1">{framework.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">({framework.category})</span>
                  </Badge>
                ))}
                {results.frameworks.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No frameworks detected</p>
                )}
              </div>
            </Card>
          </div>
        )
      )}

      <Card className="overflow-hidden shadow-sm mb-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AnalysisDimension)}>
          <ScrollArea className="w-full border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <TabsList className="w-auto h-auto bg-transparent p-0">
              {Object.entries(dimensionLabels).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="px-4 py-3 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap rounded-none"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {isLoading ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-7 w-36" />
              </div>
              <Skeleton className="h-28 w-full rounded-md" />
              <div className="space-y-6">
                <div>
                  <Skeleton className="h-10 w-full rounded-lg mb-4" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-10 w-full rounded-lg mb-4" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-28 w-full rounded-md mt-4" />
            </div>
          ) : (
            results &&
            Object.entries(dimensionLabels).map(([key]) => (
              <TabsContent key={key} value={key} className="p-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {dimensionLabels[key as AnalysisDimension]} Configurations
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Analyzed with</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {selectedModel}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Summary</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      {results.dimensions[key as AnalysisDimension]?.summary}
                    </p>
                  </div>

                  {/* Findings */}
                  <div className="space-y-6">
                    {results.dimensions[key as AnalysisDimension]?.findings.map((finding, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                          <h5 className="font-medium text-slate-900 dark:text-slate-100">{finding.title}</h5>
                          {finding.fileCount && (
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-1"
                              >
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span>Found in {finding.fileCount} files</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{finding.description}</p>
                          {finding.codeExample && (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
                              <pre>{finding.codeExample}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {results.dimensions[key as AnalysisDimension]?.recommendations.length > 0 && (
                    <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md p-4">
                      <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Recommendations</h4>
                      <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-200">
                        {results.dimensions[key as AnalysisDimension]?.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start">
                            <ArrowUp className="mr-2 mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))
          )}
        </Tabs>
      </Card>
      
      {/* Azure Hosting Recommendations */}
      {!isLoading && results && results.hostingRecommendation && (
        <Card className="overflow-hidden shadow-sm mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <div className="flex items-center space-x-2">
              <Cloud className="h-6 w-6 text-white" />
              <h3 className="text-lg font-semibold text-white">Azure Hosting Recommendations</h3>
            </div>
          </div>
          
          <div className="p-6">
            {/* Summary */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-4">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                {results.hostingRecommendation.summary}
              </p>
            </div>
            
            {/* Architecture Overview */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-slate-900 dark:text-slate-100 mb-2">
                Architecture Overview
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {results.hostingRecommendation.architectureSummary}
              </p>
            </div>
            
            {/* Azure Services */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-slate-900 dark:text-slate-100 mb-3">
                Recommended Azure Services
              </h4>
              
              <Accordion type="single" collapsible className="w-full">
                {results.hostingRecommendation.azureServices.map((service: AzureService, index: number) => (
                  <AccordionItem key={index} value={`service-${index}`}> 
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center">
                        <Server className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">{service.name}</span>
                        <Badge 
                          variant={
                            service.necessity === "required" 
                              ? "default" 
                              : service.necessity === "recommended" 
                                ? "secondary" 
                                : "outline"
                          }
                          className="ml-2 text-xs"
                        >
                          {service.necessity}
                        </Badge>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          {service.category}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-6 pt-1 pb-2">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                          {service.description}
                        </p>
                        
                        {service.alternativeServices && service.alternativeServices.length > 0 && (
                          <div className="mb-2">
                            <h5 className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">
                              Alternative Services:
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {service.alternativeServices.map((alt, altIndex) => (
                                <Badge key={altIndex} variant="outline" className="text-xs">
                                  {alt}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {service.estimatedCost && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">
                              Cost Estimate:
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {service.estimatedCost}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            
            {/* Cost Estimate */}
            {results.hostingRecommendation.costEstimateDescription && (
              <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md p-4">
                <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Cost Estimate</h4>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  {results.hostingRecommendation.costEstimateDescription}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Azure Hosting Recommendations Skeleton */}
      {isLoading && (
        <Card className="overflow-hidden shadow-sm mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-7 w-48" />
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <Skeleton className="h-24 w-full rounded-md" />
            
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
            
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-12 w-full rounded-lg mb-2" />
                    <div className="pl-6">
                      <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
