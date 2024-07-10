import { Octokit } from "@octokit/rest";
import { Base64 } from "js-base64";

export async function handler(event, context) {
    try {
        console.log("Environment Variables:");
        console.log("GITHUB_TOKEN:", process.env.GITHUB_TOKEN);
        console.log("REPO_OWNER:", process.env.REPO_OWNER);
        console.log("REPO_NAME:", process.env.REPO_NAME);
        console.log("FILE_PATH:", process.env.FILE_PATH);

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = process.env.FILE_PATH;

        if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME || !FILE_PATH) {
            throw new Error('Missing required environment variables');
        }

        if (!event.body) {
            throw new Error('No request body');
        }

        const { data } = JSON.parse(event.body);

        if (!data) {
            throw new Error('No data found in request body');
        }

        const COMMIT_MESSAGE = 'Update catalog.json';

        const octokit = new Octokit({
            auth: GITHUB_TOKEN
        });

        const getFileSha = async (path) => {
            try {
                const { data } = await octokit.repos.getContent({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path
                });
                return data.sha;
            } catch (error) {
                if (error.status === 404) {
                    console.warn('File not found, creating new file');
                    return null;
                }
                console.error('Error getting file SHA:', error);
                throw error;
            }
        };

        const updateFile = async (sha) => {
            try {
                const response = await octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: FILE_PATH,
                    message: COMMIT_MESSAGE,
                    content: Base64.encode(data),
                });
                return response;
            } catch (error) {
                console.error('Error updating file:', error);
                throw error;
            }
        };

        try {
            const sha = await getFileSha(FILE_PATH);
            await updateFile(sha);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow any origin
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({ message: 'Changes committed and pushed successfully!' }),
            };
        } catch (error) {
            console.error('Error committing changes:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow any origin
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({ message: 'Error committing changes.' }),
            };
        }
    } catch (error) {
        console.error('Error in handler:', error);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow any origin
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
}


