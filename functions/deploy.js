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

const COOLDOWN_PERIOD = 6000; // 1 minute in milliseconds
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
    if (!event.body) {
      throw new Error('No request body');
    }
    const { data: newContent } = JSON.parse(event.body);
    if (!newContent) {
      throw new Error('No data found in request body');
    }
    logger.info("Received data:", { preview: newContent.substring(0, 100) });

    const { data: existingFile } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH
    });

    const existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
    if (existingContent === newContent) {
      logger.info('No changes detected. Skipping update.');
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No changes detected' }) };
    }

    const { data: newCommitData } = await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Update ${FILE_PATH}`,
      content: Buffer.from(newContent).toString('base64'),
      sha: existingFile.sha,
      branch: BRANCH,
    });

    lastDeployTime = Date.now();
    logger.info(`Deployment successful. Commit SHA: ${newCommitData.sha}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Changes committed and pushed successfully!',
        commitSha: newCommitData.sha
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


