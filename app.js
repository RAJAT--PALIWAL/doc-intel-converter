// DOM elements
const fileInput = document.getElementById("file-input");
const form = document.getElementById("upload-form");
const previewImg = document.getElementById("preview-img");
const progressWrapper = document.getElementById("progress-wrapper");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status-text");
const convertBtn = document.getElementById("convert-btn");
const downloadLink = document.getElementById("download-link");
const apiKeyInput = document.getElementById("api-key-input");

// Sarvam AI API configuration
const SARVAM_API_BASE = "https://api.sarvam.ai";

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

// Create ZIP file from image
async function createZipWithImage(imageFile) {
  const zip = new PizZip();
  const imageData = await imageFile.arrayBuffer();
  zip.file(imageFile.name, imageData);
  return zip.generate({ type: "blob" });
}

// Sarvam API: Step 1 - Create job
async function createJob(apiKey, language = "hi-IN", outputFormat = "md") {
  const response = await fetch(`${SARVAM_API_BASE}/doc-digitization/job/v1`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      job_parameters: {
        language: language,
        output_format: outputFormat
      }
    })
  });

  if (!response.ok) throw new Error(`Create job failed: ${response.status}`);
  return await response.json();
}

// Sarvam API: Step 2 - Get upload URLs
async function getUploadUrls(apiKey, jobId, filename) {
  const response = await fetch(`${SARVAM_API_BASE}/doc-digitization/job/v1/upload-files`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      job_id: jobId,
      files: [filename]
    })
  });

  if (!response.ok) throw new Error(`Get upload URLs failed: ${response.status}`);
  return await response.json();
}

// Sarvam API: Step 3 - Upload file to cloud storage
async function uploadFile(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": "application/zip"
    },
    body: file
  });

  if (!response.ok) throw new Error(`File upload failed: ${response.status}`);
}

// Sarvam API: Step 4 - Start job
async function startJob(apiKey, jobId) {
  const response = await fetch(`${SARVAM_API_BASE}/doc-digitization/job/v1/${jobId}/start`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey
    }
  });

  if (!response.ok) throw new Error(`Start job failed: ${response.status}`);
  return await response.json();
}

// Sarvam API: Step 5 - Poll job status
async function pollJobStatus(apiKey, jobId) {
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${SARVAM_API_BASE}/doc-digitization/job/v1/${jobId}`, {
      headers: {
        "api-subscription-key": apiKey
      }
    });

    if (!response.ok) throw new Error(`Get status failed: ${response.status}`);
    const status = await response.json();

    if (status.job_state === "Completed") {
      return status;
    } else if (status.job_state === "Failed") {
      throw new Error("Job processing failed");
    }

    setProgress(50 + (i / maxAttempts) * 30, `Processing... (${i * 5}s)`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error("Job timeout");
}

// Sarvam API: Step 6 - Get download URLs
async function getDownloadUrls(apiKey, jobId) {
  const response = await fetch(`${SARVAM_API_BASE}/doc-digitization/job/v1/download-files`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ job_id: jobId })
  });

  if (!response.ok) throw new Error(`Get download URLs failed: ${response.status}`);
  return await response.json();
}

// Download and extract markdown from ZIP
async function downloadAndExtractMarkdown(downloadUrl) {
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Download failed");
  
  const zipBlob = await response.blob();
  const zip = await PizZip.loadAsync(zipBlob);
  
  // Find markdown file
  const mdFile = Object.keys(zip.files).find(name => name.endsWith(".md"));
  if (!mdFile) throw new Error("No markdown file found");
  
  return await zip.files[mdFile].async("string");
}

// Convert markdown to DOCX
async function markdownToDocx(markdown) {
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

  const zip = new PizZip();
  zip.file("word/document.xml", content);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  return zip.generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// Main form submission handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    alert("Please choose an image first.");
    return;
  }

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Please enter your Sarvam API key.");
    return;
  }

  downloadLink.hidden = true;
  statusText.textContent = "";
  convertBtn.disabled = true;

  try {
    // Step 1: Create ZIP
    setProgress(5, "Creating ZIP file...");
    const zipFile = await createZipWithImage(file);
    const zipFilename = "image.zip";

    // Step 2: Create job
    setProgress(10, "Creating Sarvam job...");
    const jobData = await createJob(apiKey);
    const jobId = jobData.job_id;

    // Step 3: Get upload URLs
    setProgress(20, "Getting upload URL...");
    const uploadData = await getUploadUrls(apiKey, jobId, zipFilename);
    const uploadUrl = uploadData.upload_urls[zipFilename].url;

    // Step 4: Upload file
    setProgress(30, "Uploading file...");
    await uploadFile(uploadUrl, zipFile);

    // Step 5: Start job
    setProgress(40, "Starting processing...");
    await startJob(apiKey, jobId);

    // Step 6: Poll status
    setProgress(50, "Processing document...");
    await pollJobStatus(apiKey, jobId);

    // Step 7: Get download URLs
    setProgress(80, "Getting results...");
    const downloadData = await getDownloadUrls(apiKey, jobId);
    const downloadUrl = Object.values(downloadData.download_urls)[0].url;

    // Step 8: Download and extract markdown
    setProgress(85, "Downloading results...");
    const markdown = await downloadAndExtractMarkdown(downloadUrl);

    // Step 9: Convert to DOCX
    setProgress(95, "Creating Word document...");
    const docxBlob = await markdownToDocx(markdown);

    // Step 10: Provide download
    const url = URL.createObjectURL(docxBlob);
    downloadLink.href = url;
    downloadLink.download = "converted-document.docx";
    downloadLink.hidden = false;

    setProgress(100, "✓ Conversion complete! Click below to download.");
  } catch (error) {
    console.error("Error:", error);
    statusText.textContent = `Error: ${error.message}`;
    setProgress(0, "");
  } finally {
    convertBtn.disabled = false;
  }
});
