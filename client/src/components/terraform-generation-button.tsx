import React from "react";
import { Button } from "@/components/ui/button";
import { Code2, ServerCog, Box, CircleOff } from "lucide-react";

interface TerraformGenerationButtonProps {
  onGenerateTerraform: () => void;
  isLoading: boolean;
  isDisabled?: boolean;
}

export function TerraformGenerationButton({
  onGenerateTerraform,
  isLoading,
  isDisabled = false
}: TerraformGenerationButtonProps) {
  return (
    <div className="w-full bg-card border rounded-lg p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Generate Terraform Code
          </h3>
          <p className="text-sm text-muted-foreground">
            Create infrastructure as code for automated deployment to Azure based on the analysis and recommendations.
          </p>
        </div>
        
        <Button
          onClick={onGenerateTerraform}
          disabled={isDisabled || isLoading}
          className="w-full md:w-auto"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              Generating...
            </>
          ) : (
            <>
              <ServerCog className="mr-2 h-5 w-5" />
              Generate Terraform
            </>
          )}
        </Button>
      </div>
      
      {isDisabled && (
        <div className="mt-4 bg-muted p-3 rounded-md flex items-center gap-2 text-sm">
          <CircleOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Azure hosting recommendations are required before generating Terraform code.
          </span>
        </div>
      )}
    </div>
  );
}