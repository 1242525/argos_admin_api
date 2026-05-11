import { useState } from "react";

import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";

const TenantsPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter] = useState({});
  const [sel, setSel] = useState(null);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));
  let rows = DATA.customers;
  if (filter.tenant_id) rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.status)    rows = rows.filter(r => r.account_status === filter.status);
  if (filter.search)    rows = rows.filter(r =>
    r.username.includes(filter.search) || r.email.includes(filter.search));
  const cols = [
    { key: "tenant_id",        label: "Tenant" },
    { key: "customer_id",      label: "Customer ID" },
    { key: "username",         label: "Username", render: (v, row) => <span style={{ color: t.textAccent, cursor: "pointer" }} onClick={() => setSel(row)}>{v}</span> },
    { key: "email",            label: "Email" },
    { key: "account_status",   label: "Status", render: v => <Pill val={v} /> },
    { key: "owned_device_count", label: "Owned Devices" },
    { key: "last_login_at",    label: "Last Login" },
    { key: "last_access_ip",   label: "Last IP" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 360px" : "1fr", gap: 16 }}>
      <div>
        <FilterBar filters={[
          { key: "search",    label: "Search", type: "text",   placeholder: "username/email" },
          { key: "tenant_id", label: "Tenant", type: "select", options: DATA.tenants.map(t=>t.tenant_id) },
          { key: "status",    label: "Status", type: "select", options: ["active","locked","disabled","retired-linked"] },
        ]} values={filter} onChange={handleF} />
        <Card style={{ padding: 0 }}><Table cols={cols} rows={rows} /></Card>
      </div>
      {sel && (
        <Card>
          <SectionTitle>Customer Detail</SectionTitle>
          <button onClick={() => setSel(null)} style={{ float: "right", background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
          {Object.entries(sel).map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`, fontSize: "0.75rem" }}>
              <span style={{ color: t.textDim, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.06em" }}>{k.replace(/_/g," ")}</span>
              <span style={{ color: t.text }}>{k === "account_status" ? <Pill val={v} /> : String(v)}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Access Logs</SectionTitle>
            {DATA.accessLogs.filter(l => l.actor_id === sel.username).slice(0,3).map(l => (
              <div key={l.request_id} style={{ fontSize: "0.7rem", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`, color: t.textMuted }}>
                <span style={{ color: l.authorization_result === "ALLOWED" ? "#22c55e" : "#ef4444" }}>{l.authorization_result}</span>
                {" "}{l.endpoint}
                <div style={{ color: t.textFaint }}>{l.timestamp}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
export default TenantsPage;
