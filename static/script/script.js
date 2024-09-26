document.getElementById('loadFileButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file && file.type === 'text/html') {
        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('inputHtml').value = reader.result;
        };
        reader.readAsText(file);
    } else {
        alert('Please select a valid HTML file.');
    }
});

document.getElementById('cleanButton').addEventListener('click', async () => {
    const inputHtml = document.getElementById('inputHtml').value;

    try {
        const response = await fetch('/clean', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/html'
            },
            body: inputHtml
        });

        const data = await response.json();
        const cleanedHtmlUrl = `/uploads/${data.htmlFile}`;
        
        // Prepare download for HTML file
        const htmlResponse = await fetch(cleanedHtmlUrl);
        const htmlBlob = await htmlResponse.blob();
        const htmlBlobUrl = URL.createObjectURL(htmlBlob);
        document.getElementById('downloadHtmlButton').href = htmlBlobUrl;
        document.getElementById('downloadHtmlButton').download = 'cleaned.html';
        document.getElementById('downloadHtmlButton').style.display = 'inline';

        // No CSS file is being created in this flow, so this part should be removed or updated
        // document.getElementById('downloadCssButton').style.display = 'none';

    } catch (error) {
        console.error('Error cleaning HTML:', error);
    }
});
