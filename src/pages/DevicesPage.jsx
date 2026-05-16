import { useState } from "react";

import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";
import { exportDevices } from "../api.js";

const DevicesPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter] = useState({});
  const [sel, setSel] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  const handleExport = async (fmt = "csv") => {
    setExporting(true);
    setExportResult(null);
    try {
      const result = await exportDevices(filter.tenant_id || null, fmt);
      setExportResult(result);
    } catch (e) {
      setExportResult({ error: e.message });
    } finally {
      setExporting(false);
    }
  };
  let rows = DATA.devices;
  if (filter.tenant_id) rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.status)    rows = rows.filter(r => r.device_status === filter.status);
  const cols = [
    { key: "device_id",    label: "Device ID", render: (v, row) => <span style={{ color: t.textAccent, cursor: "pointer" }} onClick={() => setSel(row)}>{v}</span> },
    { key: "serial_number",label: "Serial No." },
    { key: "tenant_id",    label: "Tenant" },
    { key: "owner_id",     label: "Owner" },
    { key: "firmware_version", label: "Firmware" },
    { key: "device_status",label: "Status", render: v => <Pill val={v} /> },
    { key: "last_seen_at", label: "Last Seen" },
    { key: "installation_location_status", label: "Location" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 360px" : "1fr", gap: 16 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <FilterBar filters={[
            { key: "tenant_id", label: "Tenant", type: "select", options: DATA.tenants.map(t=>t.tenant_id) },
            { key: "status",    label: "Status", type: "select", options: ["online","offline","error"] },
          ]} values={filter} onChange={handleF} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => handleExport("csv")} disabled={exporting} style={{
              background: exporting ? t.borderSub : "#1a2e1a", border: "1px solid #22c55e",
              color: "#22c55e", borderRadius: 8, padding: "6px 14px",
              fontSize: "0.75rem", fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
            }}>
              {exporting ? "..." : "↓ CSV"}
            </button>
            <button onClick={() => handleExport("json")} disabled={exporting} style={{
              background: exporting ? t.borderSub : "#1a1a2e", border: "1px solid #3b82f6",
              color: "#3b82f6", borderRadius: 8, padding: "6px 14px",
              fontSize: "0.75rem", fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
            }}>
              {exporting ? "..." : "↓ JSON"}
            </button>
          </div>
        </div>
        {exportResult && (
          <div style={{
            background: exportResult.error ? "#2d0a0a" : "#0a1a0a",
            border: `1px solid ${exportResult.error ? "#6b1a1a" : "#22c55e"}`,
            borderRadius: 10, padding: "12px 16px", marginBottom: 12,
            fontSize: "0.75rem",
          }}>
            {exportResult.error ? (
              <span style={{ color: "#ff4d4d" }}>Export 실패: {exportResult.error}</span>
            ) : (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: t.text }}>
                <span style={{ color: "#22c55e" }}>Export 완료</span>
                <span style={{ color: t.textDim }}>레코드: <b style={{ color: t.text }}>{exportResult.record_count}</b></span>
                <span style={{ color: t.textDim }}>파일: <b style={{ color: t.textAccent }}>{exportResult.filename}</b></span>
                {exportResult.minio_url && (
                  <a href={exportResult.minio_url} target="_blank" rel="noreferrer"
                    style={{ color: "#3b82f6" }}>MinIO 링크</a>
                )}
                {exportResult.download_url && (
                  <a href={`http://localhost:8001${exportResult.download_url}`}
                    style={{ color: "#f59e0b" }}>다운로드</a>
                )}
              </div>
            )}
          </div>
        )}
        <Card style={{ padding: 0 }}><Table cols={cols} rows={rows} /></Card>
      </div>
      {sel && (
        <Card>
          <SectionTitle>Device Detail</SectionTitle>
          <button onClick={() => setSel(null)} style={{ float: "right", background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
          {Object.entries(sel).map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`, fontSize: "0.75rem" }}>
              <span style={{ color: t.textDim, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.06em" }}>{k.replace(/_/g," ")}</span>
              <span style={{ color: t.text }}>{k === "device_status" ? <Pill val={v} /> : String(v)}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Related Events</SectionTitle>
            {DATA.mediaEvents.filter(e => e.device_id === sel.device_id).map(e => (
              <div key={e.event_id} style={{ fontSize: "0.7rem", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`, color: t.textMuted }}>
                <span style={{ color: "#f59e0b" }}>{e.event_type.replace(/_/g," ")}</span>{" · "}{e.event_time}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
export default DevicesPage;
