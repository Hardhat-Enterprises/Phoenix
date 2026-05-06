import { useState } from "react";

function Report() {
  const [urls, setUrls] = useState([""]);
  const [sourceContext, setSourceContext] = useState("SMS / Text Message");
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);

  const updateUrl = (index, value) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = value;
    setUrls(updatedUrls);
  };

  const addUrlField = () => {
    setUrls([...urls, ""]);
  };

  const removeUrlField = (indexToRemove) => {
    if (urls.length === 1) {
      setUrls([""]);
      return;
    }

    setUrls(urls.filter((_, index) => index !== indexToRemove));
  };

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((previousFiles) => [...previousFiles, ...selectedFiles]);
    event.target.value = "";
  };

  const handleImageUpload = (event) => {
    const selectedImages = Array.from(event.target.files || []);
    setImages((previousImages) => [...previousImages, ...selectedImages]);
    event.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const runVerification = () => {
    const validUrls = urls.filter((url) => url.trim() !== "");

    if (validUrls.length === 0 && files.length === 0 && images.length === 0) {
      setVerificationResult({
        risk: "Missing Evidence",
        reason:
          "No URL, file, or image has been added. Please add evidence before running verification.",
        action: "Add at least one suspicious URL, document, or image.",
      });
      return;
    }

    setVerificationResult({
      risk: "Likely Phishy",
      reason:
        "The submitted report evidence has been collected for review. This section now supports URLs, files, and images for future backend threat-report integration.",
      action:
        "Flag this report for review and include the submitted evidence in the stakeholder report.",
    });
  };

  const saveForReview = () => {
    setVerificationResult({
      risk: "Saved for Review",
      reason:
        "The entered URLs, uploaded files, and uploaded images have been saved in the frontend review state.",
      action:
        "Keep this report item ready for later backend and reporting-team integration.",
    });
  };

  const generateReport = () => {
    setVerificationResult({
      risk: "Report Draft Ready",
      reason:
        "A frontend report draft has been prepared using the submitted URLs, files, and images.",
      action:
        "Generate the final report after backend verification and threat scoring are connected.",
    });
  };

  return (
    <div className="report-page">
      <div className="report-title-section">
        <h1>Reports</h1>
        <p>
          Add suspicious links, documents, and images so they can later be used
          to generate threat reports.
        </p>
      </div>

      <section className="report-evidence-card">
        <div className="report-evidence-header">
          <h2>Verify Suspicious Link</h2>
          <p>
            Submit suspicious URLs, files, and images so they can later be used
            by the reporting and threat-analysis teams.
          </p>
        </div>

        <div className="report-form-group">
          <label>Suspicious URLs</label>

          {urls.map((url, index) => (
            <div className="url-input-row" key={index}>
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => updateUrl(index, event.target.value)}
              />

              <button type="button" onClick={() => removeUrlField(index)}>
                Remove
              </button>
            </div>
          ))}

          <button type="button" className="add-url-btn" onClick={addUrlField}>
            + Add Another URL
          </button>
        </div>

        <div className="report-form-group">
          <label>Source Context</label>
          <select
            value={sourceContext}
            onChange={(event) => setSourceContext(event.target.value)}
          >
            <option>SMS / Text Message</option>
            <option>Email</option>
            <option>Social Media</option>
            <option>Website</option>
            <option>QR Code</option>
            <option>Other</option>
          </select>
        </div>

        <div className="report-upload-grid">
          <div className="report-upload-box">
            <label>Upload Files</label>
            <p>Attach PDF, Word, text, CSV, or report evidence files.</p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={handleFileUpload}
            />
          </div>

          <div className="report-upload-box">
            <label>Upload Images</label>
            <p>Attach screenshots, warning messages, or image evidence.</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {(files.length > 0 || images.length > 0) && (
          <div className="report-evidence-list">
            {files.length > 0 && (
              <div>
                <h4>Uploaded Files</h4>

                {files.map((file, index) => (
                  <div className="evidence-item" key={`${file.name}-${index}`}>
                    <span>{file.name}</span>

                    <button type="button" onClick={() => removeFile(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div>
                <h4>Uploaded Images</h4>

                {images.map((image, index) => (
                  <div className="evidence-item" key={`${image.name}-${index}`}>
                    <span>{image.name}</span>

                    <button type="button" onClick={() => removeImage(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="report-action-buttons">
          <button
            type="button"
            className="primary-btn"
            onClick={runVerification}
          >
            Run Verification
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={saveForReview}
          >
            Save for Review
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={generateReport}
          >
            Generate Report
          </button>
        </div>

        <div className="report-verification-result">
          <h3>Verification Result</h3>

          {verificationResult ? (
            <>
              <div className="result-row">
                <strong>Risk Assessment</strong>
                <span>{verificationResult.risk}</span>
              </div>

              <div className="result-row">
                <strong>Reason</strong>
                <span>{verificationResult.reason}</span>
              </div>

              <div className="result-row">
                <strong>Suggested Action</strong>
                <span>{verificationResult.action}</span>
              </div>
            </>
          ) : (
            <p className="empty-result">
              Add a URL, file, or image and run verification to display the
              result.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Report;