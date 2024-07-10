import { Octokit } from "@octokit/rest";

export async function handler(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Ensure the request is a POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;
  const FILE_PATH = 'catalog.json';
  const BRANCH = 'main';

  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing required environment variables' })
    };
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

    console.log("Received data:", newContent.substring(0, 100) + "..."); // Log first 100 chars

    // Step 1: Get the current commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
    });
    const currentCommitSha = refData.object.sha;

    // Step 2: Get the current tree
    const { data: commitData } = await octokit.git.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      commit_sha: currentCommitSha,
    });
    const currentTreeSha = commitData.tree.sha;

    // Step 3: Create a new blob with the new content
    const { data: blobData } = await octokit.git.createBlob({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      content: newContent,
      encoding: 'utf-8',
    });

    // Step 4: Create a new tree
    const { data: newTreeData } = await octokit.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      base_tree: currentTreeSha,
      tree: [{
        path: FILE_PATH,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      }],
    });

    // Step 5: Create a new commit
    const { data: newCommitData } = await octokit.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: 'Update catalog.json',
      tree: newTreeData.sha,
      parents: [currentCommitSha],
    });

    // Step 6: Update the reference
    await octokit.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
      sha: newCommitData.sha,
    });

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


