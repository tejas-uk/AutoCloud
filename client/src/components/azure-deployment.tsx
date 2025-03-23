import React, { useState, useEffect } from "react";
import { DeploymentStatus, DeploymentUpdate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { type VariantProps } from "class-variance-authority";
import { AlertCircle, ChevronDown, CloudLightning, Code, Database, Server, Terminal, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface AzureDeploymentProps {
  analysisId: string;
  repoName: string;
  onDeploymentComplete?: () => void;
}

export function AzureDeployment({ 
  analysisId, 
  repoName,
  onDeploymentComplete
}: AzureDeploymentProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [activeTab, setActiveTab] = useState("updates");

  // Start the deployment process
  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      
      const response = await apiRequest("POST", "/api/azure/deploy", { analysisId });
      const data = await response.json();
      
      if (data.deploymentId) {
        setDeploymentId(data.deploymentId);
        toast({
          title: "Deployment Started",
          description: "Azure deployment has been initiated. You'll see real-time updates as the process continues.",
        });
      } else {
        throw new Error("No deployment ID returned");
      }
    } catch (error) {
      console.error("Failed to start deployment:", error);
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to start deployment",
        variant: "destructive",
      });
      setIsDeploying(false);
    }
  };

  // Fetch deployment status periodically
  useEffect(() => {
    if (!deploymentId) return;

    const fetchStatus = async () => {
      try {
        const response = await apiRequest("GET", `/api/azure/deployment/${deploymentId}`);
        const status = await response.json();
        setDeploymentStatus(status);
        
        // If deployment is completed or failed, stop polling
        if (status.status === 'completed' || status.status === 'failed') {
          setIsDeploying(false);
          
          if (status.status === 'completed' && onDeploymentComplete) {
            onDeploymentComplete();
          }
          
          if (status.status === 'completed') {
            toast({
              title: "Deployment Completed",
              description: "Your Azure resources have been successfully deployed!",
            });
          } else if (status.status === 'failed') {
            toast({
              title: "Deployment Failed",
              description: "There was an error during deployment. Check the logs for details.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch deployment status:", error);
      }
    };

    // Poll for status updates
    const intervalId = setInterval(fetchStatus, 2000);
    fetchStatus(); // Immediate first fetch
    
    return () => clearInterval(intervalId);
  }, [deploymentId, onDeploymentComplete]);

  // If no deployment is in progress, show the deploy button
  if (!deploymentId && !deploymentStatus) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Deploy to Azure</CardTitle>
          <CardDescription>
            Deploy your infrastructure to Azure using the generated Terraform code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2 flex items-center">
              <CloudLightning className="h-5 w-5 mr-2 text-blue-500" />
              Azure Deployment Process
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will execute the Terraform code to create real resources in your Azure account.
              You will be guided through an authentication process if needed.
            </p>
            <div className="space-y-2">
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                  <span className="text-primary text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Azure Authentication</p>
                  <p className="text-xs text-muted-foreground">Login to your Azure account via device code authentication</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                  <span className="text-primary text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Terraform Initialization</p>
                  <p className="text-xs text-muted-foreground">Prepare the Terraform environment and download Azure providers</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                  <span className="text-primary text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Resource Planning</p>
                  <p className="text-xs text-muted-foreground">Terraform will analyze what needs to be created in your account</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                  <span className="text-primary text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Resource Creation</p>
                  <p className="text-xs text-muted-foreground">Creation of all required Azure resources based on the Terraform plan</p>
                </div>
              </div>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              This will create actual resources in your Azure account which may incur costs.
              Make sure you understand what resources will be created before proceeding.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="w-full md:w-auto"
            size="lg"
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initiating Deployment...
              </>
            ) : (
              <>
                <CloudLightning className="mr-2 h-5 w-5" />
                Deploy to Azure
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Display deployment status
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Azure Deployment</CardTitle>
            <CardDescription>
              Deploying {repoName} to Azure
            </CardDescription>
          </div>
          <DeploymentStatusBadge status={deploymentStatus?.status || 'initializing'} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="updates" className="flex-1">Deployment Status</TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">Deployment Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="updates" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Deployment Progress</h3>
              
              <div className="space-y-2">
                {deploymentStatus?.updates.map((update, index) => (
                  <DeploymentUpdateItem key={index} update={update} />
                ))}
                
                {isDeploying && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span>Deployment in progress...</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-black text-white font-mono">
              <pre className="text-xs whitespace-pre-wrap">
                {deploymentStatus?.logs || "No logs available yet..."}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper component for displaying deployment status badges
function DeploymentStatusBadge({ status }: { status: DeploymentStatus['status'] }) {
  switch (status) {
    case 'initializing':
      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Initializing</Badge>;
    case 'authenticating':
      return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Authenticating</Badge>;
    case 'preparing':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">Preparing</Badge>;
    case 'planning':
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Planning</Badge>;
    case 'applying':
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Deploying</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Completed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

// Helper component for displaying individual update items
function DeploymentUpdateItem({ update }: { update: DeploymentUpdate }) {
  const [expanded, setExpanded] = useState(false);
  
  const getUpdateIcon = () => {
    switch (update.status) {
      case 'initializing':
        return <Server className="h-5 w-5 text-blue-500" />;
      case 'authenticating':
        return <Database className="h-5 w-5 text-purple-500" />;
      case 'preparing':
        return <Code className="h-5 w-5 text-indigo-500" />;
      case 'planning':
        return <Terminal className="h-5 w-5 text-amber-500" />;
      case 'applying':
        return <CloudLightning className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <Check className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {getUpdateIcon()}
          <div>
            <p className="font-medium">{update.message}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(update.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        
        {update.details && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
        )}
      </div>
      
      {expanded && update.details && (
        <>
          <Separator className="my-2" />
          <div className="mt-2 bg-muted/50 p-2 rounded text-xs font-mono whitespace-pre-wrap">
            {update.details}
          </div>
        </>
      )}
    </div>
  );
}