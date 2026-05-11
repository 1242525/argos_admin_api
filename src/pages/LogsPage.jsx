import { useState } from "react";

import { Card, FilterBar, Table, Pill } from "../components/UI.jsx";

const LogsPage = ({ data: DATA }) => {
  const [filter, setFilter] = useState({});
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  let rows = DATA.accessLogs;
  if (filter.actor_id)   rows = rows.filter(r => r.actor_id.includes(filter.actor_id));
  if (filter.source_ip)  rows = rows.filter(r => r.source_ip.includes(filter.source_ip));
  if (filter.tenant_id)  rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.result)     rows = rows.filter(r => r.authorization_result === filter.result);
  if (filter.mass_query) rows = rows.filter(r => r.resource_id === "*");

  const cols = [
    { key: "timestamp",   label: "Time" },
    { key: "request_id",  label: "Req ID" },
    { key: "actor_id",    label: "Actor" },
    { key: "actor_role",  label: "Role" },
    { key: "token_id",    label: "Token" },
    { key: "source_ip",   label: "Source IP" },
    {
      key: "endpoint", label: "Endpoint",
      render: v => <span style={{ color: "#64748b", fontSize: "0.68rem" }}>{v}</span>,
    },
    { key: "resource_type",     label: "Resource" },
    { key: "resource_owner_id", label: "Owner" },
    { key: "tenant_id",         label: "Tenant" },
    { key: "authorization_result", label: "Result", render: v => <Pill val={v} /> },
    {
      key: "response_status", label: "HTTP",
      render: v => <span style={{ color: v >= 400 ? "#ef4444" : "#22c55e" }}>{v}</span>,
    },
  ];

  return (
    <div>
      <FilterBar
        filters={[
          { key: "actor_id",   label: "Actor",     type: "text",   placeholder: "actor id" },
          { key: "source_ip",  label: "IP",         type: "text",   placeholder: "source ip" },
          { key: "tenant_id",  label: "Tenant",     type: "select", options: DATA.tenants.map(t => t.tenant_id) },
          { key: "result",     label: "Result",     type: "select", options: ["ALLOWED","DENIED"] },
          { key: "mass_query", label: "Mass Query", type: "select", options: ["true"] },
        ]}
        values={filter} onChange={handleF}
      />
      <Card style={{ padding: 0 }}>
        <Table cols={cols} rows={rows} />
      </Card>
    </div>
  );
};

export default LogsPage;
