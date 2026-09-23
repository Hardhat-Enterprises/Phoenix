const isBlank = (value) => String(value ?? "").trim() === "";

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(String(value).trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

// Returns an object of field errors. An empty object means the form is valid.
export function validateReportForm(form = {}) {
  const errors = {};

  const hasUrl = !isBlank(form.url);
  const hasText = !isBlank(form.text);

  if (!hasUrl && !hasText) {
    errors.evidence = "Enter a URL, text, or both before running the model.";
  }

  if (hasUrl && !isHttpUrl(form.url)) {
    errors.url = "Enter a web address starting with http:// or https://.";
  }

  if (isBlank(form.hazardSeverity)) {
    errors.hazardSeverity = "Enter a severity between 0 and 1.";
  } else {
    const severity = Number(form.hazardSeverity);

    if (!Number.isFinite(severity) || severity < 0 || severity > 1) {
      errors.hazardSeverity = "Severity must be a number between 0 and 1.";
    }
  }

  if (isBlank(form.hazardLocation)) {
    errors.hazardLocation = "Hazard location is required.";
  }

  return errors;
}