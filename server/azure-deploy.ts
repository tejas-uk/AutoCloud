import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { AnalysisResult } from '@/lib/types';

/**
 * Status updates for the deployment process
 */
export interface DeploymentUpdate {
  status: 'initializing' | 'authenticating' | 'preparing' | 'planning' | 'applying' | 'completed' | 'failed';
  message: string;
  details?: string;
  timestamp: string;
}

/**
 * Interface for tracking ongoing deployments
 */
export interface DeploymentStatus {
  analysisId: string;
  repoName: string;
  status: 'initializing' | 'authenticating' | 'preparing' | 'planning' | 'applying' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  updates: DeploymentUpdate[];
  logs: string;
}

// Map to track ongoing deployments
const activeDeployments = new Map<string, DeploymentStatus>();

/**
 * Get the status of a deployment
 */
export function getDeploymentStatus(deploymentId: string): DeploymentStatus | undefined {
  return activeDeployments.get(deploymentId);
}

/**
 * Get all active deployments
 */
export function getAllDeployments(): DeploymentStatus[] {
  return Array.from(activeDeployments.values());
}

/**
 * Add a status update to a deployment
 */
function addDeploymentUpdate(
  deploymentId: string, 
  status: 'initializing' | 'authenticating' | 'preparing' | 'planning' | 'applying' | 'completed' | 'failed',
  message: string,
  details?: string
): void {
  const deployment = activeDeployments.get(deploymentId);
  if (!deployment) return;

  const update: DeploymentUpdate = {
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };

  deployment.status = status;
  deployment.updates.push(update);
  deployment.logs += `\n[${update.timestamp}] ${update.status}: ${update.message}`;
  if (details) {
    deployment.logs += `\n${details}`;
  }

  if (status === 'completed' || status === 'failed') {
    deployment.endTime = update.timestamp;
  }
}

/**
 * Execute a command and stream the output
 */
async function executeCommand(
  command: string,
  args: string[],
  cwd: string,
  deploymentId: string,
  onOutput?: (data: string) => void
): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve, reject) => {
    let output = '';
    
    console.log(`Executing: ${command} ${args.join(' ')}`);
    const process = spawn(command, args, { cwd });
    
    process.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      if (onOutput) onOutput(dataStr);
    });
    
    process.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      if (onOutput) onOutput(dataStr);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ exitCode: code ?? 0, output });
      } else {
        addDeploymentUpdate(
          deploymentId, 
          'failed', 
          `Command failed: ${command} ${args.join(' ')}`, 
          output
        );
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
      }
    });
    
    process.on('error', (error) => {
      addDeploymentUpdate(
        deploymentId, 
        'failed', 
        `Command error: ${error.message}`, 
        output
      );
      reject(error);
    });
  });
}

/**
 * Check if the Azure CLI is installed
 */
async function checkAzCliInstalled(deploymentId: string): Promise<boolean> {
  try {
    const { output } = await executeCommand('az', ['--version'], '.', deploymentId);
    return output.includes('azure-cli');
  } catch (error) {
    return false;
  }
}

/**
 * Check if Terraform is installed
 */
async function checkTerraformInstalled(deploymentId: string): Promise<boolean> {
  try {
    const { output } = await executeCommand('terraform', ['--version'], '.', deploymentId);
    return output.includes('Terraform');
  } catch (error) {
    return false;
  }
}

/**
 * Check if the user is authenticated with Azure CLI
 */
async function checkAzureAuthentication(deploymentId: string): Promise<boolean> {
  try {
    const { output } = await executeCommand('az', ['account', 'show'], '.', deploymentId);
    const account = JSON.parse(output);
    return !!account.id;
  } catch (error) {
    return false;
  }
}

/**
 * Login to Azure using Azure CLI
 */
async function loginToAzure(deploymentId: string): Promise<void> {
  const isAuthenticated = await checkAzureAuthentication(deploymentId);
  
  if (isAuthenticated) {
    addDeploymentUpdate(
      deploymentId, 
      'authenticating', 
      'Already authenticated with Azure'
    );
    return;
  }
  
  addDeploymentUpdate(
    deploymentId, 
    'authenticating', 
    'Starting Azure authentication process...'
  );

  // Using device code flow for authentication
  await executeCommand(
    'az', 
    ['login', '--use-device-code'], 
    '.',
    deploymentId,
    (data) => {
      addDeploymentUpdate(
        deploymentId, 
        'authenticating', 
        'Azure authentication in progress', 
        data
      );
    }
  );
  
  addDeploymentUpdate(
    deploymentId, 
    'authenticating', 
    'Successfully authenticated with Azure'
  );
}

/**
 * Deploy Terraform code to Azure
 */
export async function deployToAzure(analysis: AnalysisResult): Promise<string> {
  if (!analysis.terraformCode || !analysis.terraformCode.files || analysis.terraformCode.files.length === 0) {
    throw new Error('No Terraform code available for deployment');
  }
  
  // Type assertion since we've checked for existence above
  const terraformCode = analysis.terraformCode!
  
  const deploymentId = `deploy-${analysis.id}-${Date.now()}`;
  
  // Create deployment status
  const deploymentStatus: DeploymentStatus = {
    analysisId: analysis.id,
    repoName: analysis.repoName,
    status: 'initializing',
    startTime: new Date().toISOString(),
    updates: [],
    logs: ''
  };
  
  activeDeployments.set(deploymentId, deploymentStatus);
  
  // Start deployment in background
  // Cast analysis to the required type since we've checked terraformCode exists
  deployTerraform(deploymentId, analysis as AnalysisResult & { terraformCode: NonNullable<AnalysisResult['terraformCode']> })
    .catch(error => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Deployment error: ${errorMessage}`);
      addDeploymentUpdate(
        deploymentId,
        'failed',
        `Deployment failed: ${errorMessage}`
      );
    });
  
  return deploymentId;
}

/**
 * Deploy Terraform code to Azure
 */
async function deployTerraform(deploymentId: string, analysis: AnalysisResult & { terraformCode: NonNullable<AnalysisResult['terraformCode']> }): Promise<void> {
  try {
    addDeploymentUpdate(
      deploymentId,
      'initializing',
      `Initializing deployment for ${analysis.repoName}`
    );
    
    // Check for Azure CLI
    const hasAzCli = await checkAzCliInstalled(deploymentId);
    if (!hasAzCli) {
      throw new Error('Azure CLI is not installed');
    }
    
    // Check for Terraform
    const hasTerraform = await checkTerraformInstalled(deploymentId);
    if (!hasTerraform) {
      throw new Error('Terraform is not installed');
    }
    
    // Login to Azure
    await loginToAzure(deploymentId);
    
    // Prepare deployment directory
    const deployDir = path.join('./tmp', `${analysis.repoName.replace('/', '_')}_terraform_deploy`);
    
    addDeploymentUpdate(
      deploymentId,
      'preparing',
      `Preparing deployment directory: ${deployDir}`
    );
    
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }
    
    // Write Terraform files
    // We've already checked this exists in the deployToAzure function
    const terraformFiles = analysis.terraformCode!.files;
    for (const file of terraformFiles) {
      const filePath = path.join(deployDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }
    
    // Initialize Terraform
    addDeploymentUpdate(
      deploymentId,
      'preparing',
      'Initializing Terraform'
    );
    
    await executeCommand(
      'terraform',
      ['init'],
      deployDir,
      deploymentId,
      (data) => {
        addDeploymentUpdate(
          deploymentId,
          'preparing',
          'Terraform initialization in progress',
          data
        );
      }
    );
    
    // Plan Terraform changes
    addDeploymentUpdate(
      deploymentId,
      'planning',
      'Planning Terraform deployment'
    );
    
    await executeCommand(
      'terraform',
      ['plan', '-out=tfplan'],
      deployDir,
      deploymentId,
      (data) => {
        addDeploymentUpdate(
          deploymentId,
          'planning',
          'Terraform plan in progress',
          data
        );
      }
    );
    
    // Apply Terraform changes
    addDeploymentUpdate(
      deploymentId,
      'applying',
      'Applying Terraform deployment'
    );
    
    await executeCommand(
      'terraform',
      ['apply', '-auto-approve', 'tfplan'],
      deployDir,
      deploymentId,
      (data) => {
        addDeploymentUpdate(
          deploymentId,
          'applying',
          'Terraform apply in progress',
          data
        );
      }
    );
    
    // Deployment successful
    addDeploymentUpdate(
      deploymentId,
      'completed',
      `Deployment completed successfully for ${analysis.repoName}`
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Deployment error: ${errorMessage}`);
    addDeploymentUpdate(
      deploymentId,
      'failed',
      `Deployment failed: ${errorMessage}`
    );
    throw error;
  }
}