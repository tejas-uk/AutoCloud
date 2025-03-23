// This is a test script to help verify our GitHub repository analysis functionality

import { exec as execCallback } from 'child_process';
import readline from 'readline';
import { promisify } from 'util';

const exec = promisify(execCallback);

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('GitHub Repository Analysis Testing Helper');
console.log('----------------------------------------');
console.log('');

// Function to execute curl commands
async function execCommand(command) {
  try {
    const { stdout, stderr } = await exec(command);
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    try {
      return JSON.parse(stdout);
    } catch (e) {
      console.log('Raw output:', stdout);
      return stdout;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function runAnalysis() {
  rl.question('Enter GitHub repository URL to analyze: ', async (repoUrl) => {
    if (!repoUrl) {
      console.log('Using default repository: https://github.com/vercel/next.js');
      repoUrl = 'https://github.com/vercel/next.js';
    }

    console.log(`Analyzing repository: ${repoUrl}`);
    console.log('This may take a few minutes...');

    try {
      // Step 1: Analyze repository
      rl.question('Select model (1=gpt-4o-mini, 2=gpt-4o, 3=o3-mini, 4=claude-3-7-sonnet) [default: 1]: ', async (modelChoice) => {
        let model = 'gpt-4o-mini';
        switch (modelChoice) {
          case '2':
            model = 'gpt-4o';
            break;
          case '3':
            model = 'o3-mini';
            break;
          case '4':
            model = 'claude-3-7-sonnet';
            break;
        }

        console.log(`Using model: ${model}`);
        
        try {
          console.log('Step 1: Running initial repository analysis...');
          const analysisResult = await execCommand(`curl -X POST -H "Content-Type: application/json" -d '{"repoUrl": "${repoUrl}", "model": "${model}"}' http://localhost:5000/api/analyze`);
          console.log('Analysis completed!');
          console.log(`Analysis ID: ${analysisResult.id}`);
          console.log(`Languages detected: ${analysisResult.languages.map(l => l.name).join(', ')}`);
          console.log(`Frameworks detected: ${analysisResult.frameworks.map(f => f.name).join(', ')}`);
          
          // Step 2: Generate Azure recommendations
          rl.question('Generate Azure hosting recommendations? (y/n) [default: y]: ', async (answer) => {
            if (answer.toLowerCase() !== 'n') {
              console.log('Step 2: Generating Azure hosting recommendations...');
              const azureResult = await execCommand(`curl -X POST -H "Content-Type: application/json" -d '{"analysisId": "${analysisResult.id}", "model": "${model}"}' http://localhost:5000/api/azure-recommendation`);
              
              console.log('Azure hosting recommendations generated!');
              if (azureResult.hostingRecommendation) {
                console.log('Summary:', azureResult.hostingRecommendation.summary);
                console.log('Architecture:', azureResult.hostingRecommendation.architectureSummary);
                console.log('Services:');
                azureResult.hostingRecommendation.azureServices.forEach((service, i) => {
                  console.log(`  ${i+1}. ${service.name} (${service.necessity})`);
                });
              }
            }
            
            rl.close();
          });
        } catch (error) {
          console.error('Analysis failed:', error);
          rl.close();
        }
      });
    } catch (error) {
      console.error('Error:', error);
      rl.close();
    }
  });
}

runAnalysis();