import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, Terminal, CheckCircle, AlertCircle, ArrowRight, Loader2, CloudOff } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

interface AzureDeploymentButtonProps {
  analysisId: string;
  terraformCode: any;
  disabled?: boolean;
}

type DeploymentStepStatus = 'pending' | 'active' | 'complete' | 'error';

interface DeploymentStepProps {
  status: DeploymentStepStatus;
  title: string;
  description: string;
}

function DeploymentStep({ status, title, description }: DeploymentStepProps) {
  return (
    <div className={`flex flex-col items-center text-center p-3 rounded-md border ${
      status === 'active' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
      status === 'complete' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
      status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-800' :
      'bg-muted border-muted-foreground/20'
    }`}>
      <div className="mb-2">
        {status === 'pending' && (
          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
            {title === 'Authenticate' ? '1' : title === 'Plan' ? '2' : '3'}
          </div>
        )}
        
        {status === 'active' && (
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        
        {status === 'complete' && (
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        )}
        
        {status === 'error' && (
          <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        )}
      </div>
      
      <h4 className={`text-sm font-medium ${
        status === 'active' ? 'text-blue-700 dark:text-blue-300' :
        status === 'complete' ? 'text-green-700 dark:text-green-300' :
        status === 'error' ? 'text-red-700 dark:text-red-300' :
        'text-muted-foreground'
      }`}>
        {title}
      </h4>
      
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function AzureAccountInfo() {
  const { data: accountInfo } = useQuery({
    queryKey: ['azure-account'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/azure/account-info");
      if (!response.ok) return null;
      return response.json();
    }
  });

  if (!accountInfo?.subscription || !accountInfo?.tenant) return null;

  return (
    <div className="mb-4 p-4 bg-muted rounded-lg">
      <h4 className="font-semibold mb-2 flex items-center">
        <Cloud className="w-4 h-4 mr-2" />
        Connected Azure Account
      </h4>
      <div className="text-sm space-y-1 text-muted-foreground">
        <p><span className="font-medium">Subscription:</span> {accountInfo.subscription}</p>
        <p><span className="font-medium">Tenant:</span> {accountInfo.tenant}</p>
        <p><span className="font-medium">Environment:</span> {accountInfo.environment || 'AzureCloud'}</p>
      </div>
    </div>
  );
}

export function AzureDeploymentButton({
  analysisId,
  terraformCode,
  disabled = false
}: AzureDeploymentButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'authenticating' | 'planning' | 'deploying' | 'success' | 'failed'>('idle');
  const { toast } = useToast();
  const [location] = useLocation();

  // Query Azure connection status
  const { data: connectionStatus, isLoading } = useQuery({
    queryKey: ['azure-connection'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/azure/status");
      if (!response.ok) return { isConnected: false };
      return response.json();
    }
  });

  const isConnected = connectionStatus?.isConnected;

  const deployMutation = useMutation({
    mutationFn: async () => {
      setDeploymentStatus('authenticating');
      addLog("Starting Azure authentication process...");
      
      // Step 1: Azure Authentication
      try {
        const authResponse = await apiRequest("POST", "/api/azure/authenticate", {});
        const authData = await authResponse.json();
        
        // Add authentication logs even if it failed
        if (authData.logs && Array.isArray(authData.logs)) {
          authData.logs.forEach((log: string) => addLog(log));
        }
        
        if (!authResponse.ok) {
          // Check if authentication failed
          if (!authData.isLoggedIn) {
            addLog("⚠️ Authentication failed. You need Azure credentials to proceed.");
            addLog("To use this feature, you need valid Azure credentials such as:");
            addLog("- Azure service principal credentials (client ID, client secret, tenant ID)");
            addLog("- Azure Managed Identity");
            addLog("- Azure CLI credentials");
            setDeploymentStatus('failed');
            throw new Error("Azure authentication failed");
          }
          
          throw new Error(authData.message || "Authentication failed");
        }
        
        addLog("Successfully authenticated with Azure");
        setDeploymentStatus('planning');
        
        // Step 2: Terraform Init & Plan
        addLog("Initializing Terraform...");
        const planResponse = await apiRequest("POST", "/api/azure/terraform-plan", {
          analysisId
        });
        const planData = await planResponse.json();
        
        // Add plan logs even if it failed
        if (planData.logs && Array.isArray(planData.logs)) {
          planData.logs.forEach((log: string) => addLog(log));
        }
        
        if (!planResponse.ok) {
          // Check if planning failed for any reason
          if (!planData.success) {
            addLog("⚠️ Terraform planning failed.");
            addLog("The deployment can't proceed due to errors in planning.");
            setDeploymentStatus('failed');
            throw new Error(planData.message || "Terraform planning failed");
          }
          
          throw new Error(planData.message || "Terraform planning failed");
        }
        
        // Confirm deployment
        addLog("Terraform plan created successfully");
        addLog("Ready to apply infrastructure changes");
        setDeploymentStatus('deploying');
        
        // Step 3: Terraform Apply
        addLog("Applying Terraform configuration...");
        const deployResponse = await apiRequest("POST", "/api/azure/terraform-apply", {
          analysisId
        });
        const deployData = await deployResponse.json();
        
        // Add deployment logs even if it failed
        if (deployData.logs && Array.isArray(deployData.logs)) {
          deployData.logs.forEach((log: string) => addLog(log));
        }
        
        if (!deployResponse.ok) {
          throw new Error(deployData.message || "Deployment failed");
        }
        
        addLog("🎉 Deployment completed successfully!");
        
        // Add helpful resource information
        if (deployData.outputs) {
          addLog("");
          addLog("📊 Deployed Resources Information:");
          
          // Display each output from Terraform
          Object.entries(deployData.outputs).forEach(([key, value]) => {
            addLog(`- ${key}: ${value}`);
          });
          
          // If we have a URL, highlight it
          if (deployData.outputs.app_service_url || deployData.outputs.webapp_url) {
            const appUrl = deployData.outputs.app_service_url || deployData.outputs.webapp_url;
            addLog("");
            addLog("🔗 Your application is available at:");
            addLog(`${appUrl}`);
            addLog("");
            addLog("Note: It may take a few minutes for DNS to propagate and your application to become fully available.");
          }
        }
        
        setDeploymentStatus('success');
        
        // Show success toast with any app URL if available
        let successDescription = "Your infrastructure has been successfully deployed to Azure.";
        if (deployData.outputs && (deployData.outputs.app_service_url || deployData.outputs.webapp_url)) {
          const appUrl = deployData.outputs.app_service_url || deployData.outputs.webapp_url;
          successDescription = `Your infrastructure has been successfully deployed. Your application is available at: ${appUrl}`;
        }
        
        toast({
          title: "Deployment Successful",
          description: successDescription,
          variant: "default",
        });
        
        return deployData;
      } catch (error: any) {
        addLog(`❌ Error: ${error.message || "Unknown error occurred"}`);
        
        // Add more helpful error messages based on the type of error
        if (error.message?.includes("Authentication failed") || error.message?.includes("credentials")) {
          addLog("");
          addLog("⚠️ Authentication Error:");
          addLog("1. Ensure your Azure credentials are correctly set");
          addLog("2. Verify that your service principal has proper permissions");
          addLog("3. Check if your subscription is active");
        } else if (error.message?.includes("Terraform") || error.message?.includes("Plan") || error.message?.includes("Apply")) {
          addLog("");
          addLog("⚠️ Terraform Error:");
          addLog("1. There might be an issue with the generated Terraform code");
          addLog("2. Some resources might not be available in your region");
          addLog("3. Resource name conflicts may exist in your subscription");
        }
        
        setDeploymentStatus('failed');
        throw error;
      }
    },
    onError: (error: any) => {
      let errorTitle = "Deployment Failed";
      let errorDescription = error.message || "Failed to deploy to Azure";
      
      // Provide more specific error messages based on the error type
      if (error.message?.includes("Authentication failed") || error.message?.includes("credentials")) {
        errorTitle = "Authentication Failed";
        errorDescription = "Azure credentials are invalid or insufficient permissions. Check your Azure credentials in environment variables.";
      } else if (error.message?.includes("Terraform") || error.message?.includes("Plan")) {
        errorTitle = "Terraform Error";
        errorDescription = "There was an issue with the Terraform configuration. Check the deployment logs for details.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  });

  const addLog = (log: string) => {
    setDeploymentLogs(prevLogs => [...prevLogs, log]);
  };

  const handleReset = async () => {
    try {
      await apiRequest("POST", "/api/azure/disconnect");
      setDeploymentStatus('idle');
      setDeploymentLogs([]);
      window.location.reload(); // Refresh to update connection state
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const startDeployment = () => {
    setDeploymentLogs([]);
    deployMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Azure Deployment</CardTitle>
          <CardDescription>
            Checking connection status...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Azure Deployment</CardTitle>
        <CardDescription>
          Deploy your infrastructure to Azure using Terraform.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <AzureAccountInfo />
        
        {deploymentLogs.length > 0 && (
          <div className="relative">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {deploymentLogs.join('\n')}
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-4 bg-card z-50">
        {isConnected ? (
          <>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={deployMutation.isPending}
            >
              <CloudOff className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={startDeployment}
              disabled={disabled || !terraformCode || deployMutation.isPending}
            >
              <Cloud className="mr-2 h-4 w-4" />
              {deployMutation.isPending ? "Deploying..." : "Start Deployment"}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              window.location.href = '/api/auth/azure';
            }}
          >
            <Cloud className="mr-2 h-4 w-4" />
            Connect Azure Account
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}