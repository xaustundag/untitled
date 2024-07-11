import { Octokit } from "@octokit/rest";
import winston from "winston";

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const COOLDOWN_PERIOD = 60000; // 1 minute in milliseconds
let lastDeployTime = 0;

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    logger.info('Received OPTIONS request for CORS preflight');
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    logger.warn('Received non-POST request');
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const now = Date.now();
  if (now - lastDeployTime < COOLDOWN_PERIOD) {
    const waitTime = (COOLDOWN_PERIOD - (now - lastDeployTime)) / 1000;
    logger.warn(`Deployment attempted too soon. Please wait ${waitTime} seconds.`);
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too Many Requests. Please wait before trying again.' }) };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;
  const FILE_PATH = 'catalog.json';
  const BRANCH = 'main';

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    logger.error('Missing required environment variables');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing required environment variables' }) };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const { data: newContent } = JSON.parse(event.body);
    if (!newContent) {
      throw new Error('No data found in request body');
    }

    logger.info("Received data:", { preview: newContent.substring(0, 100) });

    // Step 1: Get SHA of base branch
    const baseBranch = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
    });
    const baseTreeSha = baseBranch.data.object.sha;

    // Step 2: Create Git file blob
    const blob = await octokit.git.createBlob({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      content: Buffer.from(newContent).toString('base64'),
      encoding: 'base64',
    });

    // Step 3: Create Git tree
    const tree = await octokit.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      base_tree: baseTreeSha,
      tree: [{
        path: FILE_PATH,
        mode: '100644', // file mode
        type: 'blob',
        sha: blob.data.sha,
      }],
    });

    // Step 4: Get parent SHA
    const parentCommit = await octokit.repos.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: BRANCH,
    });
    const parentSha = parentCommit.data.sha;

    // Step 5: Create Git commit
    const commit = await octokit.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Update ${FILE_PATH}`,
      tree: tree.data.sha,
      parents: [parentSha],
    });

    // Step 6: Update Git branch ref
    await octokit.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
      sha: commit.data.sha,
    });

    lastDeployTime = Date.now();
    logger.info(`Deployment successful. Commit SHA: ${commit.data.sha}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Changes committed and pushed successfully!',
        commitSha: commit.data.sha
      }),
    };
  } catch (error) {
    logger.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error: ' + error.message }),
    };
  }
}

