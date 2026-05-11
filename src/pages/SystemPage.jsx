import { useState } from "react";

import { useTheme } from "../ThemeContext.jsx";
import { Card, FilterBar, Table, Pill } from "../components/UI.jsx";

const SystemPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter] = useState({});
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));
  let rows = DATA.services;
  if (filter.zone)     rows = rows.filter(r => r.zone === filter.zone);
  if (filter.exposure) rows = rows.filter(r => r.exposure === filter.exposure);
  const zones = [...new Set(DATA.services.map(s=>s.zone))];
  const cols = [
    { key: "service_id",   label: "ID" },
    { key: "service_name", label: "Service" },
    { key: "vm_name",      label: "VM" },
    { key: "zone",         label: "Zone" },
    { key: "ip",   label: "IP",   render: v => <span style={{ fontFamily: "monospace", color: t.textAccent }}>{v}</span> },
    { key: "port", label: "Port", render: v => <span style={{ fontFamily: "monospace", color: t.text }}>{v}</span> },
    { key: "exposure",          label: "Exposure" },
    { key: "health_status",     label: "Health", render: v => <Pill val={v} /> },
    { key: "dependency_status", label: "Deps",   render: v => <Pill val={v} /> },
  ];
  return (
    <div>
      <FilterBar filters={[
        { key: "zone",     label: "Zone",     type: "select", options: zones },
        { key: "exposure", label: "Exposure", type: "select", options: ["external","internal"] },
      ]} values={filter} onChange={handleF} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 8, marginBottom: 16 }}>
        {zones.map(z => (
          <div key={z} style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6,
            padding: "8px 10px", fontSize: "0.68rem", textAlign: "center",
            color: t.textDim, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <div style={{ color: t.textAccent, fontWeight: 700, fontSize: "1.1rem", marginBottom: 2 }}>
              {DATA.services.filter(s=>s.zone===z).length}
            </div>
            {z}
          </div>
        ))}
      </div>
      <Card style={{ padding: 0 }}><Table cols={cols} rows={rows} /></Card>
    </div>
  );
};
export default SystemPage;
