document.getElementById('fetch-btn').addEventListener('click', fetchJSON);
document.getElementById('edit-btn').addEventListener('click', editJSON);
document.getElementById('save-btn').addEventListener('click', saveJSON);

function fetchJSON() {
    fetch('https://wonderful-maamoul-33d63c.netlify.app/catalog.json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('json-display').value = JSON.stringify(data, null, 4);
        })
        .catch(error => console.error('Error fetching JSON:', error));
}

function editJSON() {
    document.getElementById('json-display').style.display = 'none';
    const jsonEditor = document.getElementById('json-editor');
    jsonEditor.value = document.getElementById('json-display').value;
    jsonEditor.style.display = 'block';
    document.getElementById('save-btn').style.display = 'block';
}

function saveJSON() {
    const editedJSON = document.getElementById('json-editor').value;
    try {
        JSON.parse(editedJSON);
        document.getElementById('json-display').value = editedJSON;
        document.getElementById('json-display').style.display = 'block';
        document.getElementById('json-editor').style.display = 'none';
        document.getElementById('save-btn').style.display = 'none';

        fetch('https://illustrious-valkyrie-caef79.netlify.app/.netlify/functions/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: editedJSON }),
        }).then(response => {
            if (response.ok) {
                alert('Changes committed and pushed successfully!');
            } else {
                alert('Failed to push changes.');
            }
        });
    } catch (error) {
        alert('Invalid JSON format.');
    }
}
