document.getElementById('fetch-btn').addEventListener('click', fetchJSON);
document.getElementById('edit-btn').addEventListener('click', editJSON);
document.getElementById('save-btn').addEventListener('click', saveJSON);

function fetchJSON() {
    fetch('https://nimble-lebkuchen-13adad.netlify.app/catalog.json')
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
    JSON.parse(editedJSON); // Validate JSON
    fetch('https://nimble-lebkuchen-13adad.netlify.app/.netlify/functions/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: editedJSON }),
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.');
      }
      throw new Error('Network response was not ok');
    })
    .then(data => {
      if (data.message === 'No changes detected') {
        alert('No changes detected. Update skipped.');
      } else {
        alert(`Changes committed and pushed successfully! Commit SHA: ${data.commitSha}`);
      }
    })
    .catch(error => {
      console.error('Fetch error:', error);
      alert('Failed to push changes: ' + error.message);
    });
  } catch (error) {
    alert('Invalid JSON format.');
  }
}
