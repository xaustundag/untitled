import { Octokit } from "@octokit/rest";

// Add a simple rate limiting mechanism
const COOLDOWN_PERIOD = 60000; // 1 minute in milliseconds
let lastDeployTime = 0;

export async function handler(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Ensure the request is a POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Implement cooldown period
  const now = Date.now();
  if (now - lastDeployTime < COOLDOWN_PERIOD) {
    console.log(`Deployment attempted too soon. Please wait ${(COOLDOWN_PERIOD - (now - lastDeployTime)) / 1000} seconds.`);
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too Many Requests. Please wait before trying again.' }) };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;
  const FILE_PATH = 'catalog.json';
  const BRANCH = 'main';

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    console.log('Missing required environment variables');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing required environment variables' }) };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    if (!event.body) {
      throw new Error('No request body');
    }
    const { data: newContent } = JSON.parse(event.body);
    if (!newContent) {
      throw new Error('No data found in request body');
    }
    console.log("Received data:", newContent.substring(0, 100) + "...");

    // Implement change detection
    const { data: existingFile } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH
    });

    const existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
    if (existingContent === newContent) {
      console.log('No changes detected. Skipping update.');
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No changes detected' }) };
    }

    // Existing GitHub API operations...
    // (Steps 1-6 remain the same)

    lastDeployTime = Date.now();
    console.log(`Deployment successful. Commit SHA: ${newCommitData.sha}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Changes committed and pushed successfully!',
        commitSha: newCommitData.sha
      }),
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error: ' + error.message }),
    };
  }
}


