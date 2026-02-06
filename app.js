// DOM elements
const fileInput = document.getElementById("file-input");
const form = document.getElementById("upload-form");
const previewImg = document.getElementById("preview-img");
const progressWrapper = document.getElementById("progress-wrapper");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const convertBtn = document.getElementById("convert-btn");
const downloadLink = document.getElementById("download-link");

// Sarvam AI API configuration
const SARVAM_API_KEY = "YOUR_SARVAM_API_KEY_HERE";
const SARVAM_API_ENDPOINT = "https://api.sarvam.ai/document-intelligence";

// Preview image on file selection
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!["image/png", "image/jpeg"].includes(file.type)) {
    alert("Please select a PNG or JPEG image.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    previewImg.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// Set progress bar
function setProgress(pct, text) {
  progressWrapper.hidden = false;
  progressBar.style.width = pct + "%";
  if (text) statusText.textContent = text;
}

// Convert markdown to DOCX using pizzip and docxtemplater
async function markdownToDocx(markdown) {
  try {
    // Simple markdown to HTML conversion (basic implementation)
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/\*(.*?)\*/gim, '<i>$1</i>')
      .replace(/\n/gim, '<br>');
    
    // Create a basic DOCX structure
    const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${markdown}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    // Create DOCX using PizZip
    const zip = new PizZip();
    zip.file("word/document.xml", content);
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    const blob = zip.generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    return blob;
  } catch (error) {
    console.error("Error creating DOCX:", error);
    throw error;
  }
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    alert("Please choose an image first.");
    return;
  }

  // Reset UI
  downloadLink.hidden = true;
  downloadLink.href = "#";
  statusText.textContent = "";
  setProgress(10, "Uploading image...");

  convertBtn.disabled = true;

  try {
    // Prepare form data for Sarvam API
    const formData = new FormData();
    formData.append("file", file);

    setProgress(30, "Calling Sarvam Document Intelligence API...");

    // Call Sarvam AI Document Intelligence API
    const response = await fetch(SARVAM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Sarvam API error: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    setProgress(60, "Processing document...");

    // Extract markdown from response
    const markdown = result.markdown || result.text || result.content || "";
    
    if (!markdown) {
      throw new Error("No text content returned from Sarvam API");
    }

    setProgress(80, "Converting to Word document...");

    // Convert markdown to DOCX
    const docxBlob = await markdownToDocx(markdown);

    // Create download link
    const url = URL.createObjectURL(docxBlob);
    downloadLink.href = url;
    downloadLink.download = "converted-document.docx";
    downloadLink.hidden = false;

    setProgress(100, "✓ Conversion complete! Click the button below to download.");
  } catch (error) {
    console.error("Error:", error);
    statusText.textContent = `Error: ${error.message}. Please check your API key and try again.`;
    setProgress(0, "");
  } finally {
    convertBtn.disabled = false;
  }
});
