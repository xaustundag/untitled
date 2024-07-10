import { Octokit } from "@octokit/rest";
import { Base64 } from "js-base64";

export async function handler(event, context) {
    try {
        if (!event.body) {
            throw new Error('No request body');
        }

        const { data } = JSON.parse(event.body);

        if (!data) {
            throw new Error('No data found in request body');
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = process.env.FILE_PATH;
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
                console.error('Error getting file SHA:', error);
                return null;
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
                    sha
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
                body: JSON.stringify({ message: 'Changes committed and pushed successfully!' }),
            };
        } catch (error) {
            console.error('Error committing changes:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error committing changes.' }),
            };
        }
    } catch (error) {
        console.error('Error in handler:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: error.message }),
        };
    }
}
