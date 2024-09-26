const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const fs = require('fs');
const { html } = require('js-beautify');
const { exec } = require('child_process'); // Import child_process module

const app = express();

// Set body parser limit to handle large payloads
app.use(bodyParser.text({ type: 'text/html', limit: '50mb' }));

// Define the uploads directory
const downloadDir = path.join(__dirname, 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

// Set static folder for serving CSS and JS
app.use(express.static(path.join(__dirname, 'static')));

// Route to serve the index.html from the templates directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Function to convert base64 to image
function base64ToImage(dataString, fileName) {
    const matches = dataString.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return null;
    }

    const extension = matches[1];
    const base64Data = matches[2];
    const imagePath = path.join(downloadDir, `${fileName}.${extension}`);

    fs.writeFileSync(imagePath, base64Data, { encoding: 'base64' });
    return `${fileName}.${extension}`;
}

// POST route to clean HTML
app.post('/clean', async (req, res) => {
    const htmlContent = req.body;
    const $ = cheerio.load(htmlContent);

    // Convert base64 images to files
    let imageCounter = 1;
    const imagePaths = [];
    $('img[src^="data:image/"]').each((i, elem) => {
        const dataSrc = $(elem).attr('src');
        const imageName = `img${imageCounter}`;
        const imageFileName = base64ToImage(dataSrc, imageName);

        if (imageFileName) {
            $(elem).attr('src', imageFileName); // Replace src with the new file path
            imagePaths.push(imageFileName);
            imageCounter++;
        }
    });

    // Change font size and font family for all text elements
    $('*').each((i, elem) => {
        const element = $(elem);
        if (element.contents().filter((_, content) => content.type === 'text' && $(content).text().trim().length > 0).length > 0) {
            element.css({
                'font-size': '12px',
                'font-family': 'Tahoma'
            });
        }
    });

    // Beautify the cleaned HTML
    let cleanedHtml = $.html({ decodeEntities: false });
    cleanedHtml = html(cleanedHtml, { indent_size: 2, preserve_newlines: true });

    // Save the cleaned HTML file
    const cleanedHtmlFilePath = path.join(downloadDir, 'cleaned.html');
    fs.writeFileSync(cleanedHtmlFilePath, cleanedHtml, 'utf8');

    // Call the Python script after cleaning is done
    exec('python3 process_html.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error}`);
            return res.status(500).json({ error: 'Failed to process HTML.' });
        }
        
        // Log output from the Python script (optional)
        console.log(`Python script output: ${stdout}`);
        
        // Send response with the cleaned HTML file path and images
        res.json({
            htmlFile: 'cleaned.html',
            images: imagePaths,
            pythonOutput: stdout.trim() // Include Python output in the response
        });
    });
});

// Start server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
