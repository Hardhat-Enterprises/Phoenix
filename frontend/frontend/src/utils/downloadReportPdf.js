import { createElement } from "react";

// The PDF libraries are big, so they are only loaded when a download is
// requested, never when the Reports page opens.
export async function downloadReportPdf(report, { onProgress, signal } = {}) {
  const stopIfCancelled = () => {
    if (signal?.aborted) {
      throw new DOMException("PDF generation was cancelled.", "AbortError");
    }
  };

  onProgress?.("Loading PDF tools…");
  const [{ pdf }, { default: ReportPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("../components/ReportPDF"),
  ]);
  stopIfCancelled();

  onProgress?.("Building the PDF…");
  const blob = await pdf(createElement(ReportPDF, { report })).toBlob();
  stopIfCancelled();

  onProgress?.("Starting the download…");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}