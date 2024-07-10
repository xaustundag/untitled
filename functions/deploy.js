const fetch = require('node-fetch');
const { Octokit } = require("@octokit/core");

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const FILE_PATH = 'catalog.json';
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    let newContent;
    try {
        const body = JSON.parse(event.body);
        newContent = body.data;
        JSON.parse(newContent); // Validate JSON format
    } catch (error) {
        return {
            statusCode: 400,
            body: 'Invalid JSON format',
        };
    }

    try {
        // Get the SHA of the file to update it
        const { data: fileData } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const updatedContent = Buffer.from(newContent).toString('base64');

        // Update the file
        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: 'Update catalog.json via Netlify function',
            content: updatedContent,
            sha: fileData.sha,
        });

        return {
            statusCode: 200,
            body: 'Changes committed and pushed successfully!',
        };
    } catch (error) {
        console.error('GitHub API error:', error);
        return {
            statusCode: 500,
            body: `Failed to push changes: ${error.message}`,
        };
    }
};


