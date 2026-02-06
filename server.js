const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const upload = multer();
const PORT = 3000;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Sarvam API base URL
const SARVAM_API_BASE = 'https://api.sarvam.ai';

// Proxy endpoint for Sarvam API
app.post('/api/sarvam/*', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Get the path after /api/sarvam/
    const sarvamPath = req.originalUrl.replace('/api/sarvam/', '');
    const targetUrl = `${SARVAM_API_BASE}/${sarvamPath}`;

    // Forward the request to Sarvam API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Special handler for file upload (PUT requests to Azure)
app.put('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const uploadUrl = req.query.url;
    if (!uploadUrl) {
      return res.status(400).json({ error: 'Upload URL required' });
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/zip',
      },
      body: req.file.buffer,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upload failed' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download proxy for results
app.get('/api/download', async (req, res) => {
  try {
    const downloadUrl = req.query.url;
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Download URL required' });
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Download failed' });
    }

    const buffer = await response.buffer();
    res.set('Content-Type', 'application/zip');
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Frontend should use this server to bypass CORS restrictions');
});
