import React, { useState } from "react";
import { TerraformCode, TerraformFile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, Download, ChevronsUpDown, CloudLightning } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

interface TerraformCodeDisplayProps {
  terraformCode: TerraformCode | null;
  isLoading: boolean;
  onGenerateTerraform: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  analysisId?: string;
  onDeployToAzure?: (analysisId: string) => void;
}

export function TerraformCodeDisplay({
  terraformCode,
  isLoading,
  onGenerateTerraform,
  isGenerating,
  disabled = false,
  analysisId,
  onDeployToAzure
}: TerraformCodeDisplayProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(true);

  const copyToClipboard = (content: string, name: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        toast({
          title: "Copied to clipboard!",
          description: `${name} has been copied to your clipboard.`,
          variant: "default",
        });
      })
      .catch((error) => {
        console.error("Failed to copy: ", error);
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard.",
          variant: "destructive",
        });
      });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllFiles = () => {
    if (!terraformCode || !terraformCode.files || terraformCode.files.length === 0) return;
    
    // Create a zip file with all Terraform files
    // For simplicity, we'll just download each file individually
    terraformCode.files.forEach(file => {
      downloadFile(file.content, file.name);
    });
    
    toast({
      title: "Files downloaded",
      description: `${terraformCode.files.length} Terraform files have been downloaded.`,
      variant: "default",
    });
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
          <div className="h-96 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!terraformCode) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Terraform Infrastructure as Code</CardTitle>
          <CardDescription>
            Generate infrastructure as code for Azure based on the analysis and hosting recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <File className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              No Terraform code has been generated yet. Generate code to see the infrastructure as code for your application.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={onGenerateTerraform} 
            disabled={disabled || isGenerating}
            className="w-full md:w-auto"
          >
            {isGenerating ? "Generating Code..." : "Generate Terraform Code"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Terraform Infrastructure as Code</CardTitle>
        <CardDescription>
          Complete Infrastructure as Code for deploying your application to Azure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Summary</h3>
          <p>{terraformCode.summary}</p>
        </div>
        
        {/* Deploy to Azure Button */}
        {analysisId && onDeployToAzure && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => onDeployToAzure(analysisId)}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-300"
            >
              <CloudLightning className="h-5 w-5 mr-2" />
              Deploy to Azure
            </Button>
          </div>
        )}
        
        <Collapsible
          open={isInstructionsOpen}
          onOpenChange={setIsInstructionsOpen}
          className="border rounded-lg p-4"
        >
          <div className="flex items-center justify-between space-x-4">
            <h3 className="text-lg font-medium">Deployment Instructions</h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator className="my-2" />
          <CollapsibleContent>
            <div className="whitespace-pre-line text-sm mt-2">
              {terraformCode.instructions}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Terraform Files</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAllFiles}
              className="flex gap-2 items-center"
            >
              <Download className="h-4 w-4" />
              Download All Files
            </Button>
          </div>
          
          <Tabs value={`file-${selectedFileIndex}`} onValueChange={(v) => setSelectedFileIndex(parseInt(v.split('-')[1]))}>
            <TabsList className="mb-4 w-full flex flex-wrap h-auto pb-0">
              {terraformCode.files.map((file, index) => (
                <TabsTrigger
                  key={`file-${index}`}
                  value={`file-${index}`}
                  className="flex items-center gap-2 m-1"
                >
                  <File className="h-4 w-4" />
                  {file.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {terraformCode.files.map((file: TerraformFile, index: number) => (
              <TabsContent key={`file-content-${index}`} value={`file-${index}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{file.name}</Badge>
                    <Badge variant="secondary">{getTerraformFileType(file.name)}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(file.content, file.name)}
                    >
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadFile(file.content, file.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-96 w-full border rounded-lg bg-black p-4">
                  <pre className="text-white text-sm font-mono whitespace-pre overflow-x-auto">
                    {file.content}
                  </pre>
                </ScrollArea>
                
                <div className="text-sm">
                  <p className="font-medium mb-2">Description:</p>
                  <p>{file.description}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function getTerraformFileType(filename: string): string {
  if (filename.includes('main')) return 'Main Config';
  if (filename.includes('variables')) return 'Variables';
  if (filename.includes('outputs')) return 'Outputs';
  if (filename.includes('providers')) return 'Providers';
  if (filename.includes('.tfvars')) return 'Variable Values';
  return 'Terraform';
}