// src/ReportsPage.jsx
// Reports page — loads real data from threats, hazards and risks APIs.
// Follows the team integration pattern: useEffect + useState, no raw fetch(),
// all requests via phoenixApi.js helpers through the Vite proxy.

import { useState, useEffect } from 'react';
import { getThreats, getHazards, getRisks } from './services/phoenixApi';
import ReportPDF from './components/ReportPDF';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function severityStyle(level) {
  const l = (level || '').toLowerCase();
  if (l === 'critical' || l === 'high')
    return { color: '#A32D2D', background: '#FCEBEB', border: '1px solid #F7C1C1' };
  if (l === 'medium')
    return { color: '#854F0B', background: '#FAEEDA', border: '1px solid #FAC775' };
  if (l === 'low')
    return { color: '#3B6D11', background: '#EAF3DE', border: '1px solid #C0DD97' };
  return { color: '#555E6B', background: '#F1EFE8', border: '1px solid #D3D1C7' };
}

// ── sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ level }) {
  if (!level) return <span style={{ ...styles.badge, ...severityStyle('') }}>—</span>;
  return (
    <span style={{ ...styles.badge, ...severityStyle(level) }}>
      {level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()}
    </span>
  );
}

function TypeTag({ type }) {
  const map = {
    threat: { label: 'Threat',  bg: '#FCEBEB', color: '#A32D2D' },
    hazard: { label: 'Hazard',  bg: '#E6F1FB', color: '#185FA5' },
    risk:   { label: 'Risk',    bg: '#FAEEDA', color: '#854F0B' },
  };
  const t = map[type] || { label: type, bg: '#F1EFE8', color: '#555E6B' };
  return (
    <span style={{ ...styles.typeTag, background: t.bg, color: t.color }}>
      {t.label}
    </span>
  );
}

function LoadingState() {
  return (
    <div style={styles.centreBox}>
      <div style={styles.spinner} />
      <div style={styles.centreText}>Loading reports…</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ ...styles.centreBox, ...styles.errorBox }}>
      <div style={styles.errorIcon}>⚠</div>
      <div style={styles.errorTitle}>Failed to load reports</div>
      <div style={styles.errorMsg}>{message}</div>
      <button style={styles.retryBtn} onClick={onRetry}>Try again</button>
    </div>
  );
}

function EmptyState({ activeTab }) {
  const labels = { all: 'reports', threat: 'threat reports', hazard: 'hazard reports', risk: 'risk reports' };
  return (
    <div style={styles.centreBox}>
      <div style={styles.emptyIcon}>📋</div>
      <div style={styles.emptyTitle}>No {labels[activeTab] || 'reports'} found</div>
      <div style={styles.centreText}>No data has been returned from the backend yet.</div>
    </div>
  );
}

function ReportRow({ report, onDownload }) {
  const subtitle = {
    threat: `${report.category || '—'} · Detected ${formatDate(report.detected_at)}`,
    hazard: `${report.event_status || '—'} · ${formatDate(report.start_time)}`,
    risk:   `Correlation ${report.correlation_score != null ? report.correlation_score + '%' : '—'} · ${report.linked_event_type || '—'}`,
  }[report.type] || '—';

  const severityLevel = report.risk_level || report.severity_level || report.integration_confidence;

  return (
    <div style={styles.row}>
      <div style={styles.rowLeft}>
        <TypeTag type={report.type} />
        <div style={styles.rowBody}>
          <div style={styles.rowTitle}>{report.title}</div>
          <div style={styles.rowSub}>{subtitle}</div>
        </div>
      </div>
      <div style={styles.rowRight}>
        <SeverityBadge level={severityLevel} />
        <span style={styles.statusChip}>{report.status || '—'}</span>
        <button
          style={styles.downloadBtn}
          onClick={() => onDownload(report)}
          title="Generate PDF report"
        >
          ↓ PDF
        </button>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',    label: 'All Reports' },
  { key: 'threat', label: 'Threats' },
  { key: 'hazard', label: 'Hazards' },
  { key: 'risk',   label: 'Risks' },
];

export default function ReportsPage() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [pdfReport, setPdfReport] = useState(null); // report selected for PDF

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [threatsResponse, hazardsResponse, risksResponse] = await Promise.all([
        getThreats(),
        getHazards(),
        getRisks(),
      ]);

      // Normalise threats
      const threatReports = (threatsResponse?.items || threatsResponse || []).map(t => ({
        id:               t.id || t.threat_id,
        type:             'threat',
        title:            t.title || `Threat #${t.id}`,
        risk_level:       t.risk_level,
        status:           t.status,
        category:         t.category,
        description:      t.description,
        confidence_score: t.confidence_score,
        detected_at:      t.detected_at,
      }));

      // Normalise hazards
      const hazardReports = (hazardsResponse?.items || hazardsResponse || []).map(h => ({
        id:             h.id || h.hazard_id,
        type:           'hazard',
        title:          h.hazard_type || `Hazard #${h.id}`,
        severity_level: h.severity_level,
        status:         h.event_status,
        event_status:   h.event_status,
        hazard_type:    h.hazard_type,
        description:    h.description,
        start_time:     h.start_time,
        end_time:       h.end_time,
      }));

      // Normalise risks
      const riskReports = (risksResponse?.items || risksResponse || []).map(r => ({
        id:                      r.id || r.risk_id,
        type:                    'risk',
        title:                   r.linkage_reason || `Risk #${r.id}`,
        integration_confidence:  r.integration_confidence,
        status:                  r.event_status,
        integration_event_id:    r.integration_event_id,
        related_threat_id:       r.related_threat_id,
        correlation_score:       r.correlation_score,
        linkage_reason:          r.linkage_reason,
        linked_event_type:       r.linked_event_type,
        event_status:            r.event_status,
        event_type:              r.event_type,
      }));

      setReports([...threatReports, ...hazardReports, ...riskReports]);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  // Tab filtering
  const visible = activeTab === 'all'
    ? reports
    : reports.filter(r => r.type === activeTab);

  // Counts per tab
  const counts = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={styles.page}>

      {/* ── page header ── */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.pageEyebrow}>PHOENIX · Reports</div>
          <div style={styles.pageTitle}>Intelligence Reports</div>
          <div style={styles.pageSub}>
            Live threat, hazard and risk data from the backend.
            Click ↓ PDF on any row to generate a downloadable report.
          </div>
        </div>
        <div style={styles.totalPill}>
          {loading ? '…' : reports.length} total records
        </div>
      </div>

      {/* ── tab bar ── */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={activeTab === tab.key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key !== 'all' && counts[tab.key] != null && (
              <span style={activeTab === tab.key ? { ...styles.tabCount, ...styles.tabCountActive } : styles.tabCount}>
                {counts[tab.key]}
              </span>
            )}
            {tab.key === 'all' && reports.length > 0 && (
              <span style={activeTab === tab.key ? { ...styles.tabCount, ...styles.tabCountActive } : styles.tabCount}>
                {reports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── content ── */}
      <div style={styles.card}>

        {/* column headings */}
        {!loading && !error && visible.length > 0 && (
          <div style={styles.colHeadings}>
            <span>Report</span>
            <span style={{ marginLeft: 'auto', paddingRight: '110px' }}>Severity / Status</span>
          </div>
        )}

        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={loadReports} />}
        {!loading && !error && visible.length === 0 && <EmptyState activeTab={activeTab} />}

        {!loading && !error && visible.map((report, i) => (
          <ReportRow
            key={`${report.type}-${report.id ?? i}`}
            report={report}
            onDownload={setPdfReport}
          />
        ))}
      </div>

      {/* ── PDF modal ── */}
      {pdfReport && (
        <ReportPDF
          report={pdfReport}
          onClose={() => setPdfReport(null)}
        />
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    padding: '24px',
    maxWidth: '960px',
    margin: '0 auto',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // header
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' },
  pageEyebrow: { fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#185FA5', marginBottom: '4px' },
  pageTitle: { fontSize: '22px', fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' },
  pageSub: { fontSize: '13px', color: '#555E6B' },
  totalPill: { fontSize: '12px', fontWeight: 600, background: '#E6F1FB', color: '#185FA5', border: '1px solid #B5D4F4', borderRadius: '20px', padding: '5px 14px', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: '6px' },

  // tabs
  tabBar: { display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' },
  tab: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '20px', border: '1px solid #E4E7EC', background: '#fff', fontSize: '13px', fontWeight: 500, color: '#555E6B', cursor: 'pointer', transition: 'all 0.12s' },
  tabActive: { background: '#185FA5', color: '#fff', border: '1px solid #185FA5' },
  tabCount: { fontSize: '11px', fontWeight: 700, background: '#E4E7EC', color: '#555E6B', borderRadius: '10px', padding: '1px 7px' },
  tabCountActive: { background: 'rgba(255,255,255,0.25)', color: '#fff' },

  // card / list
  card: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  colHeadings: { display: 'flex', padding: '10px 20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A94A6', borderBottom: '1px solid #E4E7EC', background: '#F8F9FA' },

  // rows
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #E4E7EC', transition: 'background 0.1s', cursor: 'default' },
  rowLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 },
  rowBody: { minWidth: 0 },
  rowTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSub: { fontSize: '11px', color: '#8A94A6' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },

  // badges / chips
  badge: { fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' },
  typeTag: { fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 },
  statusChip: { fontSize: '11px', color: '#555E6B', background: '#F4F5F7', border: '1px solid #E4E7EC', borderRadius: '6px', padding: '3px 9px' },

  // download button
  downloadBtn: { fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '6px', border: '1px solid #B5D4F4', background: '#E6F1FB', color: '#185FA5', cursor: 'pointer' },

  // loading
  centreBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px' },
  spinner: { width: '28px', height: '28px', border: '3px solid #E4E7EC', borderTop: '3px solid #185FA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  centreText: { fontSize: '13px', color: '#8A94A6' },

  // error
  errorBox: { background: '#FCEBEB' },
  errorIcon: { fontSize: '24px' },
  errorTitle: { fontSize: '14px', fontWeight: 600, color: '#A32D2D' },
  errorMsg: { fontSize: '12px', color: '#A32D2D', opacity: 0.8, textAlign: 'center', maxWidth: '340px' },
  retryBtn: { marginTop: '4px', padding: '7px 18px', borderRadius: '8px', border: 'none', background: '#A32D2D', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },

  // empty
  emptyIcon: { fontSize: '32px' },
  emptyTitle: { fontSize: '14px', fontWeight: 600, color: '#1A1A1A' },
};
