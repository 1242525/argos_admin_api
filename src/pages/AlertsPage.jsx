import { useState } from "react";

import { SEV_COLOR } from "../constants.js";
import { StatCard, Card, FilterBar, Table, Pill, SevBadge } from "../components/UI.jsx";

const AlertsPage = ({ data: DATA }) => {
  const [filter, setFilter] = useState({});
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  let rows = DATA.alerts;
  if (filter.severity)   rows = rows.filter(r => r.severity === filter.severity);
  if (filter.status)     rows = rows.filter(r => r.status === filter.status);
  if (filter.event_type) rows = rows.filter(r => r.event_type.includes(filter.event_type));

  const sevCounts = ["critical","high","warning","info"].reduce((acc, s) => {
    acc[s] = DATA.alerts.filter(a => a.severity === s).length;
    return acc;
  }, {});

  const cols = [
    { key: "alert_id",        label: "ID" },
    { key: "severity",        label: "Severity",  render: v => <SevBadge sev={v} /> },
    { key: "event_type",      label: "Event Type",render: v => v.replace(/_/g, " ") },
    { key: "actor_id",        label: "Actor" },
    { key: "source_ip",       label: "Source IP" },
    { key: "target_service",  label: "Service" },
    { key: "target_resource", label: "Resource" },
    { key: "status",          label: "Status",    render: v => <Pill val={v} /> },
    { key: "created_at",      label: "Created" },
    { key: "linked_request_id", label: "Req ID" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {["critical","high","warning","info"].map(s => (
          <StatCard key={s} label={s} value={sevCounts[s] || 0} accent={SEV_COLOR[s]?.text} />
        ))}
      </div>
      <FilterBar
        filters={[
          { key: "severity",   label: "Severity", type: "select", options: ["critical","high","warning","info"] },
          { key: "status",     label: "Status",   type: "select", options: ["open","investigating","resolved"] },
          { key: "event_type", label: "Type",     type: "text",   placeholder: "event type" },
        ]}
        values={filter} onChange={handleF}
      />
      <Card style={{ padding: 0 }}>
        <Table cols={cols} rows={rows} />
      </Card>
    </div>
  );
};

export default AlertsPage;
