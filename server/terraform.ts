import { OpenAI } from "openai";
import { HostingRecommendation, TerraformCode, AzureService } from "@/lib/types";
import { fetchRepositoryInfo } from "./github";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate Terraform Infrastructure as Code based on analyzed repository and Azure recommendations
 */
export async function generateTerraformCode(
  analysisId: string,
  repoUrl: string,
  hostingRecommendation: HostingRecommendation
): Promise<TerraformCode> {
  try {
    const repoInfo = await fetchRepositoryInfo(repoUrl);
    
    // Create a directory for the Terraform files
    const terraformDir = path.join("./tmp", `${repoInfo.owner}_${repoInfo.repo}_terraform`);
    
    // Create the terraform directory if it doesn't exist
    if (!fs.existsSync(terraformDir)) {
      fs.mkdirSync(terraformDir, { recursive: true });
    }
    
    // Generate terraform code using OpenAI
    const terraformFiles = await generateTerraformFilesWithAI(repoInfo.fullName, hostingRecommendation);
    
    // Write the generated files to disk
    for (const file of terraformFiles) {
      const filePath = path.join(terraformDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }
    
    return {
      files: terraformFiles,
      summary: `Complete Terraform code for deploying ${repoInfo.fullName} to Azure with required infrastructure`,
      instructions: "To use this Terraform code:\n1. Install Terraform CLI\n2. Initialize with 'terraform init'\n3. Review and modify variables in terraform.tfvars\n4. Run 'terraform plan' to preview changes\n5. Apply with 'terraform apply'"
    };
  } catch (error) {
    console.error("Error generating Terraform code:", error);
    throw error;
  }
}

/**
 * Generate Terraform files using OpenAI
 */
async function generateTerraformFilesWithAI(
  repoFullName: string,
  hostingRecommendation: HostingRecommendation
): Promise<Array<{ name: string; content: string; description: string }>> {
  // Create a prompt for the AI to generate Terraform files
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert Terraform developer specializing in Azure infrastructure as code. 
        Your task is to generate production-ready Terraform files for deploying a GitHub repository 
        to Azure based on an analysis of the repository's infrastructure needs.
        
        Use the Terraform best practices:
        - Organize code into main.tf, variables.tf, outputs.tf, providers.tf
        - Include a sample terraform.tfvars file
        - Use modules where appropriate
        - Include proper comments and documentation
        - Implement secure configurations with proper access controls
        - Use Azure resource naming conventions and tags
        
        Your output should be multiple complete Terraform files, organized as JSON objects with name, content, and description attributes.
        `
      },
      {
        role: "user",
        content: `Generate a complete set of Terraform files for the GitHub repository ${repoFullName}.
        
        The application requires the following Azure services:
        ${formatAzureServicesForPrompt(hostingRecommendation.azureServices)}
        
        Architecture Summary: ${hostingRecommendation.architectureSummary}
        
        Please provide the following files at minimum:
        - main.tf: The main Terraform configuration file
        - variables.tf: Terraform variables definition
        - outputs.tf: Outputs from the deployment
        - providers.tf: Provider configuration
        - terraform.tfvars: Sample values for variables
        
        Format your output as a JSON array of objects, each with 'name', 'content', and 'description' properties.
        `
      }
    ],
    response_format: { type: "json_object" }
  });

  // Parse the response JSON
  const result = JSON.parse(response.choices[0].message.content);
  
  // Ensure the response has a files array
  if (!result.files || !Array.isArray(result.files)) {
    throw new Error("Invalid response from AI. Expected files array.");
  }
  
  return result.files;
}

/**
 * Format Azure services for the AI prompt
 */
function formatAzureServicesForPrompt(services: AzureService[]): string {
  return services.map(service => {
    return `- ${service.name} (${service.category}): ${service.description}
      Necessity: ${service.necessity}
      ${service.alternativeServices ? `Alternatives: ${service.alternativeServices.join(", ")}` : ''}
      ${service.estimatedCost ? `Estimated Cost: ${service.estimatedCost}` : ''}`;
  }).join("\n\n");
}