import { useState } from "react";

import { STATUS_COLOR } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";
import { StatCard, Card, SectionTitle, Table, Pill, SevBadge } from "../components/UI.jsx";

const IdentityPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [sel, setSel] = useState(null);
  const cols = [
    { key: "user_id",    label: "User ID" },
    { key: "username",   label: "Username", render: (v, row) => <span style={{ color: t.textAccent, cursor: "pointer" }} onClick={() => setSel(row)}>{v}</span> },
    { key: "role",       label: "Role" },
    { key: "department", label: "Dept" },
    { key: "employment_status", label: "Employment", render: v => <Pill val={v} /> },
    { key: "account_status",    label: "Account",    render: v => <Pill val={v} /> },
    { key: "credential_status", label: "Credential", render: v => <Pill val={v} /> },
    { key: "last_login_at",     label: "Last Login" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 360px" : "1fr", gap: 16 }}>
      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {["active","disabled","retired"].map(s => {
            const count = DATA.staffAccounts.filter(a => a.account_status === s || a.employment_status === s).length;
            return <StatCard key={s} label={s} value={count} accent={STATUS_COLOR[s] || "#64748b"} />;
          })}
        </div>
        <Card style={{ padding: 0 }}><Table cols={cols} rows={DATA.staffAccounts} /></Card>
      </div>
      {sel && (
        <Card>
          <SectionTitle>Staff Detail</SectionTitle>
          <button onClick={() => setSel(null)} style={{ float: "right", background: "none", border: "none", color: t.textDim, cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
          {Object.entries(sel).map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`, fontSize: "0.75rem" }}>
              <span style={{ color: t.textDim, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.06em" }}>{k.replace(/_/g," ")}</span>
              <span style={{ color: t.text }}>
                {["employment_status","account_status","credential_status"].includes(k) ? <Pill val={v} /> : String(v)}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Related Alerts</SectionTitle>
            {DATA.alerts.filter(a => a.actor_id === sel.username).map(a => (
              <div key={a.alert_id} style={{ fontSize: "0.7rem", padding: "6px 0", borderBottom: `1px solid ${t.borderSub}` }}>
                <SevBadge sev={a.severity} />{" "}
                <span style={{ color: t.textMuted }}>{a.event_type.replace(/_/g," ")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
export default IdentityPage;
