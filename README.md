# Image to Word Converter

A web application that converts images (PNG/JPEG) to Word documents using Sarvam AI Document Intelligence API.

## Features

- ✨ Simple and intuitive UI
- 📤 Upload PNG or JPEG images
- 🤖 Powered by Sarvam AI Document Intelligence
- 📄 Converts extracted text to Word (DOCX) format
- 📊 Real-time progress bar
- 💾 Direct download of converted documents

## Live Demo

Visit: https://rajat--paliwal.github.io/doc-intel-converter/

## Setup Instructions

### 1. Get Sarvam AI API Key

1. Visit [Sarvam AI](https://www.sarvam.ai/)
2. Sign up for an account
3. Navigate to the API section
4. Generate your API key for Document Intelligence

### 2. Configure the Application

1. Clone this repository:
   ```bash
   git clone https://github.com/RAJAT--PALIWAL/doc-intel-converter.git
   cd doc-intel-converter
   ```

2. Open `app.js` in your favorite text editor

3. Replace the placeholder with your actual Sarvam API key:
   ```javascript
   const SARVAM_API_KEY = "YOUR_SARVAM_API_KEY_HERE";
   ```

4. Verify the API endpoint matches Sarvam's documentation:
   ```javascript
   const SARVAM_API_ENDPOINT = "https://api.sarvam.ai/document-intelligence";
   ```

### 3. Deploy to GitHub Pages

The site is already configured for GitHub Pages and will be automatically deployed from the `main` branch.

**Note:** For security reasons, you should **NOT** commit your API key to a public repository. Consider:

- Using a backend proxy to hide your API key
- Implementing OAuth or API key restrictions
- Using environment variables with a build process

### 4. Local Development

For local testing, simply open `index.html` in a modern web browser. However, due to CORS restrictions, you may need to:

1. Use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```

2. Visit `http://localhost:8000`

## File Structure

```
doc-intel-converter/
├── index.html        # Main HTML with upload UI
├── style.css         # Beautiful gradient styling
├── app.js           # JavaScript with Sarvam AI integration
└── README.md        # This file
```

## How It Works

1. **Image Upload**: User selects a PNG or JPEG image
2. **Preview**: Image is previewed in the browser
3. **API Call**: Image is sent to Sarvam AI Document Intelligence API
4. **Text Extraction**: API extracts text/markdown from the image
5. **DOCX Generation**: Extracted content is converted to Word format using PizZip
6. **Download**: User downloads the generated Word file

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling with gradients and glassmorphism
- **JavaScript (ES6+)** - Logic and API integration
- **Sarvam AI** - Document Intelligence API
- **PizZip** - DOCX file generation
- **FileSaver.js** - File download handling

## API Configuration

The application expects the Sarvam API response in the following format:

```json
{
  "markdown": "Extracted text in markdown format",
  "text": "Plain text alternative",
  "content": "Fallback content field"
}
```

If your API returns a different structure, modify the extraction logic in `app.js`:

```javascript
const markdown = result.markdown || result.text || result.content || "";
```

## Security Considerations

⚠️ **Important**: The current implementation exposes your API key in the client-side code. For production use:

1. **Create a backend proxy** that:
   - Stores the API key securely
   - Forwards requests to Sarvam AI
   - Returns results to the frontend

2. **Example backend (Node.js/Express)**:
   ```javascript
   app.post('/api/convert', async (req, res) => {
     const formData = new FormData();
     formData.append('file', req.file.buffer);
     
     const response = await fetch(SARVAM_API_ENDPOINT, {
       method: 'POST',
       headers: {
         'api-subscription-key': process.env.SARVAM_API_KEY
       },
       body: formData
     });
     
     const result = await response.json();
     res.json(result);
   });
   ```

## Troubleshooting

### API Errors

- **401 Unauthorized**: Check your API key
- **403 Forbidden**: Verify API endpoint URL
- **500 Server Error**: Check image format and size

### CORS Issues

- Use a local server for development
- Configure proper CORS headers on your backend

### File Download Not Working

- Ensure your browser allows downloads
- Check browser console for errors
- Verify DOCX blob generation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [Sarvam AI](https://www.sarvam.ai/) for the Document Intelligence API
- [PizZip](https://stuk.github.io/jszip/) for DOCX generation
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for file downloads
