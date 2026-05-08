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
});

export default function ReportPDF({ report }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <Text style={styles.title}>
          Cybersecurity Verification Report
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Title:</Text>
          <Text>{report.title}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description:</Text>
          <Text>{report.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Link Type:</Text>
          <Text>{report.linkType}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Risk Level:</Text>
          <Text>{report.risk}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Status:</Text>
          <Text>{report.status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date:</Text>
          <Text>{report.date}</Text>
        </View>

      </Page>
    </Document>
  );
}