import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, Terminal, CheckCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AzureDeploymentButtonProps {
  analysisId: string;
  terraformCode: any;
  disabled?: boolean;
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

  const handleDeploy = () => {
    setDeploymentLogs([]);
    
    // Add initial confirmation warning logs
    setDeploymentLogs([
      "⚠️ Important: You are about to deploy actual infrastructure to your Azure subscription.",
      "This will create resources that may incur costs based on Azure pricing.",
      "",
      "Prerequisites:",
      "1. Valid Azure credentials (service principal or managed identity)",
      "2. Sufficient permissions to create resources in your subscription",
      "3. Available resource quotas in your subscription",
      "",
      "Click 'Start Deployment' to begin the process."
    ]);
    
    setIsDialogOpen(true);
  };

  const startDeployment = () => {
    // Clear the warning messages when actually starting
    setDeploymentLogs([]);
    deployMutation.mutate();
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Deploy to Azure
          </h3>
          <p className="text-sm opacity-90">
            Deploy your infrastructure to Azure using the generated Terraform code and your Azure credentials. This will create actual resources in your Azure subscription according to the analysis recommendations.
          </p>
          <div className="bg-blue-700 bg-opacity-30 rounded-md p-2 text-xs">
            <p className="font-medium">AZURE INFRASTRUCTURE DEPLOYMENT</p>
            <p>This will deploy real infrastructure to your Azure account using your provided credentials. Resources will be created according to the generated Terraform code and analysis recommendations.</p>
          </div>
        </div>
        
        <Button
          onClick={handleDeploy}
          disabled={disabled || !terraformCode}
          className="w-full md:w-auto bg-white text-blue-600 hover:bg-opacity-90 hover:text-blue-700"
          size="lg"
        >
          <Cloud className="mr-2 h-5 w-5" />
          Deploy to Azure
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Deploy to Azure</DialogTitle>
            <DialogDescription>
              Deploy your infrastructure using Terraform and Azure SDK
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start space-x-3 mb-4 text-sm">
            <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-400">Azure Deployment</h4>
              <p className="text-blue-700 dark:text-blue-500 text-xs">
                This will deploy all recommended infrastructure to your Azure account using your provided Azure credentials.
                Click "Start Deployment" to begin the deployment process.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <DeploymentStep 
                status={
                  deploymentStatus === 'idle' 
                    ? 'pending' 
                    : deploymentStatus === 'authenticating' 
                      ? 'active' 
                      : (deploymentStatus === 'failed' && deploymentLogs.some(log => log.includes('Authentication failed'))) 
                        ? 'error' 
                        : deploymentStatus === 'planning' || deploymentStatus === 'deploying' || deploymentStatus === 'success' 
                          ? 'complete' 
                          : 'pending'
                } 
                title="Authenticate" 
                description="Log in to Azure" 
              />
              <DeploymentStep 
                status={
                  deploymentStatus === 'planning' 
                    ? 'active' 
                    : deploymentStatus === 'deploying' || deploymentStatus === 'success' 
                      ? 'complete' 
                      : (deploymentStatus === 'failed' && !deploymentLogs.some(log => log.includes('Authentication failed'))) 
                        ? 'error' 
                        : 'pending'
                } 
                title="Plan" 
                description="Preview changes" 
              />
              <DeploymentStep 
                status={
                  deploymentStatus === 'deploying' 
                    ? 'active' 
                    : deploymentStatus === 'success' 
                      ? 'complete' 
                      : deploymentStatus === 'failed' && deploymentLogs.some(log => log.includes('Apply')) 
                        ? 'error' 
                        : 'pending'
                } 
                title="Deploy" 
                description="Apply changes" 
              />
            </div>
            
            <Separator />
            
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <Terminal className="h-4 w-4 mr-2" />
                <h4 className="text-sm font-medium">Deployment Logs</h4>
              </div>
              
              <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-black text-white font-mono text-sm">
                {deploymentLogs.length === 0 ? (
                  <div className="text-muted-foreground italic">Logs will appear here during deployment</div>
                ) : (
                  deploymentLogs.map((log, index) => (
                    <div key={index} className="pb-1">
                      {log}
                    </div>
                  ))
                )}
                {deployMutation.isPending && (
                  <div className="flex items-center text-blue-400 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Processing...
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          
          <div className="sticky bottom-0 pt-4 pb-2 bg-background z-10 border-t">
            <div className="flex flex-row gap-2 justify-end">
              {deploymentStatus === 'idle' && (
                <Button className="w-full sm:w-auto" onClick={startDeployment} variant="default">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Start Deployment
                </Button>
              )}
              
              {deploymentStatus === 'idle' && (
                <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
              )}
              
              {(deploymentStatus === 'failed' || deploymentStatus === 'success') && (
                <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              )}
              
              {deploymentStatus !== 'idle' && deploymentStatus !== 'failed' && deploymentStatus !== 'success' && (
                <Button className="w-full sm:w-auto" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </Button>
              )}
              
              {/* Always show a reset button if deployment is in progress or failed */}
              {(deploymentStatus === 'authenticating' || deploymentStatus === 'planning' || 
                deploymentStatus === 'deploying' || deploymentStatus === 'failed') && (
                <Button 
                  className="w-full sm:w-auto" 
                  variant="outline" 
                  onClick={() => {
                    setDeploymentStatus('idle');
                    setDeploymentLogs([]);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
      status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' :
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