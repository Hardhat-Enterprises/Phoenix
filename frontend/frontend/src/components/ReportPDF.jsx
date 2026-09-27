import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: "Helvetica",
  },

  title: {
    fontSize: 18,
    marginBottom: 12,
  },

  section: {
    marginBottom: 10,
  },

  label: {
    fontWeight: "bold",
  },

  value: {
    marginTop: 3,
    lineHeight: 1.4,
  },
});

// A field the backend did not send is "Unavailable". A field it sent as an
// empty string is "(empty)". A real 0 stays "0".
const asText = (value) => {
  if (value === undefined || value === null) return "Unavailable";
  if (typeof value === "object") return "Unavailable";
  if (typeof value === "number" && !Number.isFinite(value)) {
    return "Unavailable";
  }

  const text = String(value);
  return text.trim() === "" ? "(empty)" : text;
};

// wrap={false}: a label and its value always stay on the same page.
function Field({ label, value }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{asText(value)}</Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return (
    <Text style={styles.title} minPresenceAhead={80}>
      {children}
    </Text>
  );
}

export default function ReportPDF({ report }) {
  const input = report?.input || {};
  const output = report?.output || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SectionTitle>Cybersecurity Verification Report</SectionTitle>

        <Field label="Evidence" value={report?.title} />
        <Field label="Description" value={report?.description} />
        <Field label="Input Type" value={report?.evidenceType} />
        <Field label="Risk Level" value={report?.risk} />
        <Field label="Status" value={report?.status} />
        <Field label="Processed" value={report?.date} />

        <SectionTitle>Core Model Output</SectionTitle>

        <Field label="Risk Score" value={output.risk_score} />
        <Field label="Confidence Score" value={output.confidence_score} />
        <Field label="Predicted Class" value={output.predicted_class} />

        <SectionTitle>Backend Payload</SectionTitle>

        <Field label="URL" value={input.url} />
        <Field label="Text" value={input.text} />
        <Field label="Hazard Type" value={input.hazard_type} />
        <Field label="Hazard Severity" value={input.hazard_severity} />
        <Field label="Hazard Location" value={input.hazard_location} />
        <Field label="Hazard Status" value={input.hazard_status} />
        <Field label="Alert Level" value={input.alert_level} />
        <Field label="Source" value={input.source} />
      </Page>
    </Document>
  );
}