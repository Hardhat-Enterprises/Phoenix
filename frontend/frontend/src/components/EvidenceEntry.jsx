import { useEffect, useRef, useState } from "react";
import "./EvidenceEntry.css";

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 *
 * Change this value if the project requires a different
 * maximum size for an individual evidence file.
 */
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/*
 * Supported file extensions and MIME types.
 *
 * The extension and MIME type are both checked.
 */
const ALLOWED_FILE_TYPES = {
  ".pdf": ["application/pdf"],

  ".doc": ["application/msword"],

  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  ".txt": ["text/plain"],

  ".csv": [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
  ],

  ".xls": ["application/vnd.ms-excel"],

  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  ".ppt": ["application/vnd.ms-powerpoint"],

  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],

  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

/*
 * Explicitly reject potentially executable or dangerous files.
 *
 * This is intentionally separate from ALLOWED_FILE_TYPES so
 * the application can give a security-specific error.
 */
const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".ps1",
  ".psm1",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".jar",
  ".apk",
  ".app",
  ".dmg",
  ".pkg",
  ".sh",
  ".bash",
]);

const INITIAL_FORM = {
  incidentTitle: "",
  incidentDescription: "",
  sourceContext: "",
  observedDateTime: "",
  reporterNotes: "",
  suspiciousUrl: "",
};

function getExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot).toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];

  const unitIndex = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(
    unitIndex === 0 ? 0 : 2
  )} ${units[unitIndex]}`;
}

function isImageFile(file) {
  return file.type.startsWith("image/");
}

function validateUrl(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Enter a suspicious URL.";
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    /*
     * Only web URLs are supported.
     *
     * This rejects:
     * javascript:
     * file:
     * data:
     * ftp:
     * and other unsupported protocols.
     */
    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return "Only HTTP and HTTPS URLs are supported.";
    }

    if (!parsedUrl.hostname) {
      return "Enter a valid URL.";
    }
  } catch {
    return "Enter a valid URL.";
  }

  return "";
}

function validateFile(file) {
  const extension = getExtension(file.name);

  if (!extension) {
    return "File must have a supported extension.";
  }

  /*
   * Dangerous extensions are rejected first.
   */
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return `${extension} files are not allowed for security reasons.`;
  }

  /*
   * Check whether the extension is supported.
   */
  if (
    !Object.prototype.hasOwnProperty.call(
      ALLOWED_FILE_TYPES,
      extension
    )
  ) {
    return `${extension} files are not supported.`;
  }

  /*
   * Check the configured size limit.
   */
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds the ${MAX_FILE_SIZE_MB} MB size limit.`;
  }

  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];

  /*
   * Browser File objects normally provide a MIME type.
   *
   * Reject an empty MIME type because the task explicitly
   * requires MIME validation.
   */
  if (!file.type) {
    return "The file MIME type could not be determined.";
  }

  /*
   * Ensure MIME type matches the extension.
   */
  if (!allowedMimeTypes.includes(file.type)) {
    return `The MIME type does not match the ${extension} extension.`;
  }

  return "";
}

function filesAreDuplicates(existingFile, newFile) {
  return (
    existingFile.name === newFile.name &&
    existingFile.size === newFile.size &&
    existingFile.lastModified === newFile.lastModified &&
    existingFile.type === newFile.type
  );
}

export default function EvidenceEntry({
  onPrepareReport,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  /*
   * Each evidence item has one of these shapes:
   *
   * URL:
   * {
   *   id,
   *   kind: "url",
   *   value
   * }
   *
   * File:
   * {
   *   id,
   *   kind: "file",
   *   file,
   *   name,
   *   type,
   *   size,
   *   previewUrl
   * }
   */
  const [evidenceItems, setEvidenceItems] = useState([]);

  const [errors, setErrors] = useState({});

  const [generalError, setGeneralError] = useState("");

  const [dragActive, setDragActive] = useState(false);

  const [prepared, setPrepared] = useState(false);

  const fileInputRef = useRef(null);

  /*
   * Keep track of every object URL created for image previews.
   *
   * This lets us safely revoke URLs when files are removed
   * and when the component is unmounted.
   */
  const previewUrlsRef = useRef(new Set());

  /*
   * Release all remaining object URLs when the component
   * is removed from the page.
   */
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrlsRef.current.clear();
    };
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));

    setPrepared(false);
  }

  /*
   * ------------------------------------------------------------
   * URL EVIDENCE
   * ------------------------------------------------------------
   */

  function addUrl() {
    const urlError = validateUrl(form.suspiciousUrl);

    if (urlError) {
      setErrors((previous) => ({
        ...previous,
        suspiciousUrl: urlError,
      }));

      return;
    }

    const normalizedUrl = form.suspiciousUrl.trim();

    const duplicate = evidenceItems.some(
      (item) =>
        item.kind === "url" &&
        item.value === normalizedUrl
    );

    if (duplicate) {
      setErrors((previous) => ({
        ...previous,
        suspiciousUrl:
          "This URL has already been added.",
      }));

      return;
    }

    setEvidenceItems((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        kind: "url",
        value: normalizedUrl,
      },
    ]);

    setForm((previous) => ({
      ...previous,
      suspiciousUrl: "",
    }));

    setErrors((previous) => ({
      ...previous,
      suspiciousUrl: "",
      evidence: "",
    }));

    setPrepared(false);
  }

  /*
   * ------------------------------------------------------------
   * FILE EVIDENCE
   * ------------------------------------------------------------
   */

  function addFiles(fileList) {
    try {
      setGeneralError("");

      const selectedFiles = Array.from(fileList || []);

      if (selectedFiles.length === 0) {
        return;
      }

      const newErrors = {};
      const validFiles = [];

      selectedFiles.forEach((file) => {
        const validationError = validateFile(file);

        if (validationError) {
          newErrors[file.name] = validationError;
          return;
        }

        /*
         * Check against files that are already in the evidence list.
         */
        const duplicateInExisting = evidenceItems.some(
          (item) =>
            item.kind === "file" &&
            filesAreDuplicates(item.file, file)
        );

        /*
         * Also check against other files selected in the
         * same upload operation.
         */
        const duplicateInNewFiles = validFiles.some(
          (existingFile) =>
            filesAreDuplicates(existingFile, file)
        );

        if (
          duplicateInExisting ||
          duplicateInNewFiles
        ) {
          newErrors[file.name] =
            "This file has already been added.";

          return;
        }

        validFiles.push(file);
      });

      /*
       * Create evidence objects for valid files.
       */
      const newItems = validFiles.map((file) => {
        let previewUrl = null;

        if (isImageFile(file)) {
          previewUrl = URL.createObjectURL(file);

          previewUrlsRef.current.add(previewUrl);
        }

        return {
          id: crypto.randomUUID(),
          kind: "file",
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl,
        };
      });

      setEvidenceItems((previous) => [
        ...previous,
        ...newItems,
      ]);

      if (Object.keys(newErrors).length > 0) {
        setErrors((previous) => ({
          ...previous,
          files: Object.entries(newErrors)
            .map(
              ([fileName, message]) =>
                `${fileName}: ${message}`
            )
            .join(" "),
        }));
      } else {
        setErrors((previous) => ({
          ...previous,
          files: "",
          evidence: "",
        }));
      }

      if (newItems.length > 0) {
        setPrepared(false);
      }

      /*
       * Reset the file input.
       *
       * This allows a user to select the same file again after
       * removing it.
       */
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setGeneralError(
        "The selected files could not be processed. Please try again."
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * REMOVE EVIDENCE
   * ------------------------------------------------------------
   */

  function removeEvidence(id) {
    setEvidenceItems((previous) => {
      const itemToRemove = previous.find(
        (item) => item.id === id
      );

      /*
       * Release image preview memory immediately.
       */
      if (itemToRemove?.previewUrl) {
        URL.revokeObjectURL(
          itemToRemove.previewUrl
        );

        previewUrlsRef.current.delete(
          itemToRemove.previewUrl
        );
      }

      return previous.filter(
        (item) => item.id !== id
      );
    });

    setPrepared(false);
  }

  /*
   * ------------------------------------------------------------
   * REORDER EVIDENCE
   * ------------------------------------------------------------
   */

  function moveEvidence(draggedId, targetId) {
    if (draggedId === targetId) {
      return;
    }

    setEvidenceItems((previous) => {
      const draggedIndex = previous.findIndex(
        (item) => item.id === draggedId
      );

      const targetIndex = previous.findIndex(
        (item) => item.id === targetId
      );

      if (
        draggedIndex === -1 ||
        targetIndex === -1
      ) {
        return previous;
      }

      const reordered = [...previous];

      const [draggedItem] =
        reordered.splice(draggedIndex, 1);

      reordered.splice(
        targetIndex,
        0,
        draggedItem
      );

      return reordered;
    });

    setPrepared(false);
  }

  /*
   * Keyboard-accessible alternative to drag-and-drop.
   *
   * offset = -1 moves the item up.
   * offset = 1 moves the item down.
   */
  function moveEvidenceByOffset(id, offset) {
    setEvidenceItems((previous) => {
      const currentIndex = previous.findIndex(
        (item) => item.id === id
      );

      const targetIndex =
        currentIndex + offset;

      if (
        currentIndex === -1 ||
        targetIndex < 0 ||
        targetIndex >= previous.length
      ) {
        return previous;
      }

      const reordered = [...previous];

      [
        reordered[currentIndex],
        reordered[targetIndex],
      ] = [
        reordered[targetIndex],
        reordered[currentIndex],
      ];

      return reordered;
    });

    setPrepared(false);
  }

  /*
   * ------------------------------------------------------------
   * FORM VALIDATION
   * ------------------------------------------------------------
   */

  function validateForm() {
    const validationErrors = {};

    if (!form.incidentTitle.trim()) {
      validationErrors.incidentTitle =
        "Incident title is required.";
    }

    if (!form.incidentDescription.trim()) {
      validationErrors.incidentDescription =
        "Incident description is required.";
    }

    if (!form.sourceContext.trim()) {
      validationErrors.sourceContext =
        "Source context is required.";
    }

    if (!form.observedDateTime) {
      validationErrors.observedDateTime =
        "Observed date and time is required.";
    }

    if (evidenceItems.length === 0) {
      validationErrors.evidence =
        "Add at least one URL or file as evidence.";
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  /*
   * ------------------------------------------------------------
   * PREPARE REPORT
   * ------------------------------------------------------------
   *
   * This does NOT upload anything.
   *
   * It only creates a browser-side report object.
   */
  function handlePrepareReport() {
    setGeneralError("");

    const isValid = validateForm();

    if (!isValid) {
      setPrepared(false);
      return;
    }

    const reportData = {
      incidentTitle: form.incidentTitle.trim(),

      incidentDescription:
        form.incidentDescription.trim(),

      sourceContext:
        form.sourceContext.trim(),

      observedDateTime:
        form.observedDateTime,

      reporterNotes:
        form.reporterNotes.trim(),

      evidence: evidenceItems.map((item) => {
        if (item.kind === "url") {
          return {
            id: item.id,
            kind: "url",
            value: item.value,
          };
        }

        return {
          id: item.id,
          kind: "file",
          file: item.file,
          name: item.name,
          type: item.type,
          size: item.size,
        };
      }),
    };

    /*
     * The callback is optional.
     *
     * If ReportsPage provides it, the prepared browser-side
     * data is passed upward.
     *
     * No API request is made here.
     */
    if (onPrepareReport) {
      onPrepareReport(reportData);
    }

    setPrepared(true);
  }

  /*
   * ------------------------------------------------------------
   * CLEAR FORM
   * ------------------------------------------------------------
   */

  function clearForm() {
    const confirmed = window.confirm(
      "Clear the entire evidence form? All entered information and selected evidence will be removed."
    );

    if (!confirmed) {
      return;
    }

    /*
     * Release every image preview URL.
     */
    previewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    previewUrlsRef.current.clear();

    setForm(INITIAL_FORM);

    setEvidenceItems([]);

    setErrors({});

    setGeneralError("");

    setPrepared(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section
      className="evidence-entry-card"
      aria-labelledby="evidence-entry-title"
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="evidence-entry-header">
        <div>
          <span className="evidence-entry-kicker">
            Evidence collection
          </span>

          <h2 id="evidence-entry-title">
            Incident Evidence
          </h2>

          <p>
            Add suspicious URLs, documents, images and
            supporting incident context.
          </p>
        </div>
      </div>

      {/* ======================================================
          UNCONNECTED SERVICE NOTICE
          ====================================================== */}

      <div
        className="evidence-status-notice"
        role="status"
      >
        <strong>
          Submission service not connected
        </strong>

        <p>
          Evidence is currently kept in this browser
          only. Nothing is uploaded or verified.
        </p>
      </div>

      {/* ======================================================
          GENERAL ERROR
          ====================================================== */}

      {generalError && (
        <div
          className="form-error-banner"
          role="alert"
        >
          {generalError}
        </div>
      )}

      {/* ======================================================
          INCIDENT DETAILS
          ====================================================== */}

      <div className="evidence-form-section">
        <h3>Incident details</h3>

        <div className="evidence-form-grid">
          {/* Incident title */}

          <div className="form-field">
            <label htmlFor="incident-title">
              Incident title <span aria-hidden="true">*</span>
            </label>

            <input
              id="incident-title"
              type="text"
              value={form.incidentTitle}
              onChange={(event) =>
                updateField(
                  "incidentTitle",
                  event.target.value
                )
              }
              aria-invalid={
                Boolean(errors.incidentTitle)
              }
              aria-describedby={
                errors.incidentTitle
                  ? "incident-title-error"
                  : undefined
              }
              placeholder="e.g. Suspicious login page"
            />

            {errors.incidentTitle && (
              <p
                id="incident-title-error"
                className="field-error"
                role="alert"
              >
                {errors.incidentTitle}
              </p>
            )}
          </div>

          {/* Observed date/time */}

          <div className="form-field">
            <label htmlFor="observed-date-time">
              Observed date and time{" "}
              <span aria-hidden="true">*</span>
            </label>

            <input
              id="observed-date-time"
              type="datetime-local"
              value={form.observedDateTime}
              onChange={(event) =>
                updateField(
                  "observedDateTime",
                  event.target.value
                )
              }
              aria-invalid={
                Boolean(errors.observedDateTime)
              }
              aria-describedby={
                errors.observedDateTime
                  ? "observed-date-time-error"
                  : undefined
              }
            />

            {errors.observedDateTime && (
              <p
                id="observed-date-time-error"
                className="field-error"
                role="alert"
              >
                {errors.observedDateTime}
              </p>
            )}
          </div>
        </div>

        {/* Incident description */}

        <div className="form-field">
          <label htmlFor="incident-description">
            Incident description{" "}
            <span aria-hidden="true">*</span>
          </label>

          <textarea
            id="incident-description"
            rows="5"
            value={form.incidentDescription}
            onChange={(event) =>
              updateField(
                "incidentDescription",
                event.target.value
              )
            }
            aria-invalid={
              Boolean(errors.incidentDescription)
            }
            aria-describedby={
              errors.incidentDescription
                ? "incident-description-error"
                : undefined
            }
            placeholder="Describe what was observed and why it is suspicious."
          />

          {errors.incidentDescription && (
            <p
              id="incident-description-error"
              className="field-error"
              role="alert"
            >
              {errors.incidentDescription}
            </p>
          )}
        </div>

        {/* Source context */}

        <div className="form-field">
          <label htmlFor="source-context">
            Source context{" "}
            <span aria-hidden="true">*</span>
          </label>

          <textarea
            id="source-context"
            rows="3"
            value={form.sourceContext}
            onChange={(event) =>
              updateField(
                "sourceContext",
                event.target.value
              )
            }
            aria-invalid={
              Boolean(errors.sourceContext)
            }
            aria-describedby={
              errors.sourceContext
                ? "source-context-error"
                : undefined
            }
            placeholder="Where did this evidence come from?"
          />

          {errors.sourceContext && (
            <p
              id="source-context-error"
              className="field-error"
              role="alert"
            >
              {errors.sourceContext}
            </p>
          )}
        </div>

        {/* Reporter notes */}

        <div className="form-field">
          <label htmlFor="reporter-notes">
            Reporter notes
          </label>

          <textarea
            id="reporter-notes"
            rows="3"
            value={form.reporterNotes}
            onChange={(event) =>
              updateField(
                "reporterNotes",
                event.target.value
              )
            }
            placeholder="Optional additional observations."
          />
        </div>
      </div>

      {/* ======================================================
          SUSPICIOUS URL
          ====================================================== */}

      <div className="evidence-form-section">
        <h3>Suspicious URL</h3>

        <div className="url-entry-row">
          <div className="form-field">
            <label htmlFor="suspicious-url">
              URL
            </label>

            <input
              id="suspicious-url"
              type="url"
              value={form.suspiciousUrl}
              onChange={(event) =>
                updateField(
                  "suspiciousUrl",
                  event.target.value
                )
              }
              aria-invalid={
                Boolean(errors.suspiciousUrl)
              }
              aria-describedby={
                errors.suspiciousUrl
                  ? "suspicious-url-error"
                  : "suspicious-url-help"
              }
              placeholder="https://example.com/suspicious-page"
            />

            {errors.suspiciousUrl && (
              <p
                id="suspicious-url-error"
                className="field-error"
                role="alert"
              >
                {errors.suspiciousUrl}
              </p>
            )}

            {!errors.suspiciousUrl && (
              <p
                id="suspicious-url-help"
                className="field-help"
              >
                Only HTTP and HTTPS URLs are accepted.
              </p>
            )}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={addUrl}
          >
            Add URL
          </button>
        </div>
      </div>

      {/* ======================================================
          FILE UPLOAD
          ====================================================== */}

      <div className="evidence-form-section">
        <h3>Files</h3>

        <div
          className={`file-drop-zone ${
            dragActive ? "drag-active" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();

            setDragActive(false);

            addFiles(event.dataTransfer.files);
          }}
        >
          <p className="drop-zone-title">
            Drag and drop evidence files here
          </p>

          <p className="drop-zone-subtitle">
            or choose files using the standard file selector
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
            onChange={(event) =>
              addFiles(event.target.files)
            }
          />

          <p className="field-help">
            Supported documents and images only.
            Maximum size: {MAX_FILE_SIZE_MB} MB per file.
          </p>
        </div>

        {errors.files && (
          <p
            className="field-error file-error"
            role="alert"
          >
            {errors.files}
          </p>
        )}
      </div>

      {/* ======================================================
          EVIDENCE COUNT
          ====================================================== */}

      <div
        className="evidence-summary"
        aria-live="polite"
      >
        <strong>{evidenceItems.length}</strong>

        <span>
          {evidenceItems.length === 1
            ? " evidence item"
            : " evidence items"}
        </span>
      </div>

      {/* ======================================================
          FORM-LEVEL EVIDENCE ERROR
          ====================================================== */}

      {errors.evidence && (
        <p
          className="field-error evidence-count-error"
          role="alert"
        >
          {errors.evidence}
        </p>
      )}

      {/* ======================================================
          EMPTY STATE
          ====================================================== */}

      {evidenceItems.length === 0 && (
        <div className="evidence-empty-state">
          <strong>No evidence added yet</strong>

          <p>
            Add a suspicious URL or upload a supported
            document or image.
          </p>
        </div>
      )}

      {/* ======================================================
          EVIDENCE LIST
          ====================================================== */}

      {evidenceItems.length > 0 && (
        <div className="evidence-list">
          <h3>Added evidence</h3>

          <p className="field-help">
            Drag an item to reorder it, or use the move
            buttons for keyboard-accessible reordering.
          </p>

          {evidenceItems.map((item, index) => {
            const displayName =
              item.kind === "url"
                ? item.value
                : item.name;

            return (
              <div
                key={item.id}
                className="evidence-item"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "text/plain",
                    item.id
                  );
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  const draggedId =
                    event.dataTransfer.getData(
                      "text/plain"
                    );

                  moveEvidence(
                    draggedId,
                    item.id
                  );
                }}
              >
                {/* Drag handle */}

                <div
                  className="evidence-item-drag"
                  aria-hidden="true"
                >
                  ⋮⋮
                </div>

                {/* Thumbnail/type icon */}

                {item.kind === "file" &&
                item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={`Preview of ${item.name}`}
                    className="evidence-thumbnail"
                  />
                ) : (
                  <div
                    className="evidence-type-icon"
                    aria-hidden="true"
                  >
                    {item.kind === "url"
                      ? "URL"
                      : "FILE"}
                  </div>
                )}

                {/* Information */}

                <div className="evidence-item-details">
                  <strong title={displayName}>
                    {displayName}
                  </strong>

                  <span>
                    {item.kind === "url"
                      ? "Suspicious URL"
                      : `${item.type} • ${formatFileSize(
                          item.size
                        )}`}
                  </span>
                </div>

                {/* Position */}

                <span
                  className="evidence-position"
                  aria-label={`Evidence position ${
                    index + 1
                  }`}
                >
                  #{index + 1}
                </span>

                {/* Keyboard reordering */}

                <div className="evidence-reorder-actions">
                  <button
                    type="button"
                    className="reorder-button"
                    onClick={() =>
                      moveEvidenceByOffset(
                        item.id,
                        -1
                      )
                    }
                    disabled={index === 0}
                    aria-label={`Move ${displayName} up`}
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    className="reorder-button"
                    onClick={() =>
                      moveEvidenceByOffset(
                        item.id,
                        1
                      )
                    }
                    disabled={
                      index ===
                      evidenceItems.length - 1
                    }
                    aria-label={`Move ${displayName} down`}
                  >
                    ↓
                  </button>
                </div>

                {/* Remove */}

                <button
                  type="button"
                  className="remove-button"
                  onClick={() =>
                    removeEvidence(item.id)
                  }
                  aria-label={`Remove ${displayName}`}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================
          PREPARED STATE
          ====================================================== */}

      {prepared && (
        <div
          className="prepared-notice"
          role="status"
        >
          <strong>Report ready for submission</strong>

          <p>
            The required fields are complete. Nothing
            has been uploaded or verified because the
            submission service is not connected.
          </p>
        </div>
      )}

      {/* ======================================================
          ACTIONS
          ====================================================== */}

      <div className="evidence-form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={clearForm}
        >
          Clear Form
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={handlePrepareReport}
        >
          Prepare Report
        </button>
      </div>

      {/* ======================================================
          SECURITY NOTICE
          ====================================================== */}

      <p className="evidence-security-note">
        <strong>Browser-only evidence handling:</strong>{" "}
        selected files remain in browser memory. This page
        does not upload files to an external service and does
        not claim that evidence has been verified.
      </p>
    </section>
  );
}