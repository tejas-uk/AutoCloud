// Simple script to test repository analysis APIs

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

// Configuration for testing
const TEST_REPO_URL = 'https://github.com/vercel/next.js';
const TEST_MODEL = 'gpt-4o-mini'; // Fastest model for testing

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

async function testAnalysisEndpoints() {
  console.log('Testing GitHub Repository Analysis API');
  console.log('----------------------------------');
  console.log(`Repository: ${TEST_REPO_URL}`);
  console.log(`Model: ${TEST_MODEL}`);
  console.log('');

  try {
    // Step 1: Test repository analysis
    console.log('Step 1: Testing repository analysis...');
    const analysisResult = await execCommand(
      `curl -X POST -H "Content-Type: application/json" -d '{"repoUrl": "${TEST_REPO_URL}", "model": "${TEST_MODEL}"}' http://localhost:5000/api/analyze`
    );
    
    if (!analysisResult.id) {
      throw new Error('Analysis failed: No analysis ID returned');
    }
    
    console.log('✅ Analysis completed successfully!');
    console.log(`Analysis ID: ${analysisResult.id}`);
    console.log(`Repository: ${analysisResult.repoName} (${analysisResult.repoUrl})`);
    console.log(`Model used: ${analysisResult.model}`);
    console.log(`Languages detected: ${analysisResult.languages.map(l => `${l.name} (${l.percentage}%)`).join(', ')}`);
    console.log(`Frameworks detected: ${analysisResult.frameworks.map(f => `${f.name} (${f.category})`).join(', ')}`);
    console.log(`Dimensions analyzed: ${Object.keys(analysisResult.dimensions).join(', ')}`);
    console.log('');
    
    // Step 2: Test Azure recommendations
    console.log('Step 2: Testing Azure hosting recommendations...');
    const azureResult = await execCommand(
      `curl -X POST -H "Content-Type: application/json" -d '{"analysisId": "${analysisResult.id}", "model": "${TEST_MODEL}"}' http://localhost:5000/api/azure-recommendation`
    );
    
    if (!azureResult.hostingRecommendation) {
      throw new Error('Azure recommendations failed: No hosting recommendation returned');
    }
    
    console.log('✅ Azure hosting recommendations generated successfully!');
    console.log('Summary:', azureResult.hostingRecommendation.summary);
    console.log('Architecture:', azureResult.hostingRecommendation.architectureSummary);
    console.log('Services:');
    azureResult.hostingRecommendation.azureServices.forEach((service, i) => {
      console.log(`  ${i+1}. ${service.name} (${service.category}) - ${service.necessity}`);
    });
    
    console.log('');
    console.log('All tests passed successfully! ✅');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testAnalysisEndpoints();