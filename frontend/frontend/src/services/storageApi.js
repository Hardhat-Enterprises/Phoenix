// storageApi.js
//
// Sprint 2 Week 3 (Varun) — "Evidence upload and backend integrity".
// Connects evidence file uploads to the real backend: POST /api/storage/upload.
//
// Uses XMLHttpRequest rather than fetch specifically because fetch has no
// built-in way to report upload progress (only download/response progress).
// XHR's upload.onprogress is the standard way to drive a progress bar for
// an outgoing file upload.

import { STORAGE_API_URL, buildApiUrl } from "../config/environment";
import { getAccessToken } from "./authApi";

/**
 * Upload a single evidence file to the backend storage service.
 *
 * @param {File} file - the browser File object to upload.
 * @param {Object} [options]
 * @param {(percent: number) => void} [options.onProgress] - called with 0-100
 *   as the upload progresses.
 * @param {AbortSignal} [options.signal] - pass an AbortController's signal to
 *   allow cancelling the upload mid-flight.
 * @returns {Promise<{fileId: string, originalName: string, mimeType: string, size: number}>}
 *   Resolves with the metadata the backend actually stored — this is what
 *   should be persisted in the form/report, not just the local File object.
 */
export function uploadEvidenceFile(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      reject(new Error("Please sign in before uploading evidence files."));
      return;
    }

    const formData = new FormData();
    // Field name MUST be "file" — the backend route uses
    // upload.single("file") (see backend/api-gateway/src/routes/storage.routes.ts).
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const url = buildApiUrl(STORAGE_API_URL, "/api/storage/upload");

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    // Do NOT set Content-Type manually — the browser sets the correct
    // multipart/form-data boundary automatically for FormData bodies.

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload;

      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        const data = payload.data || {};

        if (!data.file_id) {
          // The backend responded 2xx but didn't actually return a file_id —
          // treat this as a failure rather than silently pretending the
          // upload produced usable metadata when it didn't.
          reject(
            new Error(
              "Upload succeeded but the backend did not return file metadata.",
            ),
          );
          return;
        }

        resolve({
          fileId: data.file_id,
          originalName: data.original_name || file.name,
          mimeType: data.mime_type || file.type,
          size: data.size ?? file.size,
        });
        return;
      }

      if (xhr.status === 401) {
        reject(new Error("Your session has expired. Please sign in again."));
        return;
      }

      reject(
        new Error(
          payload.message || `Upload failed (status ${xhr.status}).`,
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Could not reach the storage service. Check the configured API gateway and try again.",
        ),
      );
    };

    xhr.onabort = () => {
      const cancelled = new Error("Upload cancelled.");
      cancelled.code = "UPLOAD_CANCELLED";
      reject(cancelled);
    };

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }

      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(formData);
  });
}
