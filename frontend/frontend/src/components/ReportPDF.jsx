// src/components/ReportPDF.jsx
// Receives a single report object and renders a print-ready layout.
// PDF download is triggered via window.print() with a dedicated print stylesheet.
// Swap this for jsPDF or @react-pdf/renderer if the team adds those libraries later.

import { useEffect } from 'react';

const TYPE_LABELS = {
  threat:  'Cyber Threat Report',
  hazard:  'Hazard Report',
  risk:    'Risk Correlation Report',
};

const SEVERITY_COLORS = {
  critical: '#A32D2D',
  high:     '#A32D2D',
  medium:   '#854F0B',
  low:      '#3B6D11',
  unknown:  '#555E6B',
};

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

function SeverityBadge({ level }) {
  const l = (level || 'unknown').toLowerCase();
  const color = SEVERITY_COLORS[l] || SEVERITY_COLORS.unknown;
  const bg = color + '18';
  return (
    <span style={{ ...styles.badge, color, background: bg, border: `1px solid ${color}44` }}>
      {(level || 'Unknown').toUpperCase()}
    </span>
  );
}

export default function ReportPDF({ report, onClose }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!report) return null;

  const handlePrint = () => window.print();

  const severityLevel =
    report.risk_level || report.severity_level || report.integration_confidence || 'Unknown';

  return (
    <>
      {/* ── Print stylesheet injected inline ── */}
      <style>{`
        @media print {
          body > *:not(#phoenix-pdf-modal) { display: none !important; }
          #phoenix-pdf-modal { position: static !important; background: white !important; }
          #pdf-modal-overlay { display: none !important; }
          #pdf-no-print { display: none !important; }
          #pdf-content {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 32px !important;
          }
        }
      `}</style>

      <div id="phoenix-pdf-modal" style={styles.overlay} onClick={onClose}>
        <div
          id="pdf-content"
          style={styles.modal}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={styles.header}>
            <div>
              <div style={styles.eyebrow}>PHOENIX · Disaster Cyber Intelligence</div>
              <div style={styles.reportTitle}>
                {TYPE_LABELS[report.type] || 'Intelligence Report'}
              </div>
              <div style={styles.reportMeta}>
                Report ID: {report.id} &nbsp;·&nbsp; Generated:{' '}
                {new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })} AEDT
              </div>
            </div>
            <SeverityBadge level={severityLevel} />
          </div>

          <div style={styles.divider} />

          {/* Fields — threat */}
          {report.type === 'threat' && (
            <div style={styles.fieldGrid}>
              <Field label="Title"            value={report.title} />
              <Field label="Category"         value={report.category} />
              <Field label="Risk Level"       value={report.risk_level} />
              <Field label="Status"           value={report.status} />
              <Field label="Confidence Score" value={report.confidence_score != null ? `${report.confidence_score}%` : null} />
              <Field label="Detected At"      value={report.detected_at ? new Date(report.detected_at).toLocaleString('en-AU') : null} />
              {report.description && (
                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                  <div style={styles.fieldLabel}>Description</div>
                  <div style={styles.fieldValue}>{report.description}</div>
                </div>
              )}
            </div>
          )}

          {/* Fields — hazard */}
          {report.type === 'hazard' && (
            <div style={styles.fieldGrid}>
              <Field label="Hazard Type"    value={report.hazard_type} />
              <Field label="Severity Level" value={report.severity_level} />
              <Field label="Event Status"   value={report.event_status} />
              <Field label="Start Time"     value={report.start_time ? new Date(report.start_time).toLocaleString('en-AU') : null} />
              <Field label="End Time"       value={report.end_time   ? new Date(report.end_time).toLocaleString('en-AU')   : null} />
              {report.description && (
                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                  <div style={styles.fieldLabel}>Description</div>
                  <div style={styles.fieldValue}>{report.description}</div>
                </div>
              )}
            </div>
          )}

          {/* Fields — risk */}
          {report.type === 'risk' && (
            <div style={styles.fieldGrid}>
              <Field label="Integration Event ID"  value={report.integration_event_id} />
              <Field label="Related Threat ID"     value={report.related_threat_id} />
              <Field label="Correlation Score"     value={report.correlation_score != null ? `${report.correlation_score}%` : null} />
              <Field label="Integration Confidence" value={report.integration_confidence} />
              <Field label="Linked Event Type"     value={report.linked_event_type} />
              <Field label="Event Status"          value={report.event_status} />
              {report.linkage_reason && (
                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                  <div style={styles.fieldLabel}>Linkage Reason</div>
                  <div style={styles.fieldValue}>{report.linkage_reason}</div>
                </div>
              )}
            </div>
          )}

          <div style={styles.divider} />
          <div style={styles.footer}>
            PHOENIX Disaster Cyber Intelligence Platform · Victoria, AU ·{' '}
            {new Date().getFullYear()}
          </div>

          {/* Action buttons — hidden during print */}
          <div id="pdf-no-print" style={styles.actions}>
            <button style={styles.btnPrimary} onClick={handlePrint}>
              Download PDF
            </button>
            <button style={styles.btnGhost} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '24px',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    padding: '32px',
    maxWidth: '640px', width: '100%',
    maxHeight: '85vh', overflowY: 'auto',
  },
  eyebrow: {
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#185FA5', marginBottom: '6px',
  },
  reportTitle: {
    fontSize: '20px', fontWeight: 700, color: '#1A1A1A', marginBottom: '4px',
  },
  reportMeta: { fontSize: '12px', color: '#8A94A6' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  badge: {
    fontSize: '11px', fontWeight: 700, padding: '4px 12px',
    borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em',
    flexShrink: 0,
  },
  divider: { height: '1px', background: '#E4E7EC', margin: '20px 0' },
  fieldGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
  },
  field: {},
  fieldLabel: {
    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#8A94A6', marginBottom: '4px',
  },
  fieldValue: { fontSize: '13px', fontWeight: 500, color: '#1A1A1A' },
  footer: { fontSize: '11px', color: '#8A94A6', textAlign: 'center' },
  actions: { display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' },
  btnPrimary: {
    padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', border: 'none', background: '#185FA5', color: 'white',
  },
  btnGhost: {
    padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', border: '1px solid #C8CDD6', background: '#fff', color: '#555E6B',
  },
};
