import { useState } from "react";

import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";

const DevicesPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter] = useState({});
  const [sel, setSel] = useState(null);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));
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
        <FilterBar filters={[
          { key: "tenant_id", label: "Tenant", type: "select", options: DATA.tenants.map(t=>t.tenant_id) },
          { key: "status",    label: "Status", type: "select", options: ["online","offline","error"] },
        ]} values={filter} onChange={handleF} />
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
