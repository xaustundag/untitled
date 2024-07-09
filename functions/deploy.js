const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const { data } = JSON.parse(event.body);
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const FILE_PATH = process.env.FILE_PATH;
    const COMMIT_MESSAGE = 'Update catalog.json';

    const getFileSha = async () => {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });
        const fileData = await response.json();
        return fileData.sha;
    };

    const updateFile = async (sha) => {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: COMMIT_MESSAGE,
                content: Buffer.from(data).toString('base64'),
                sha: sha,
            }),
        });
        return response.json();
    };

    try {
        const sha = await getFileSha();
        await updateFile(sha);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Changes committed and pushed successfully!' }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error committing changes.' }),
        };
    }
};
