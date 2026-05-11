
import { Card, Table } from "../components/UI.jsx";

const AuditPage = ({ data: DATA }) => {
  const cols = [
    { key: "change_id",    label: "ID" },
    { key: "timestamp",    label: "Time" },
    { key: "actor_id",     label: "Actor" },
    { key: "action_type",  label: "Action",  render: v => v.replace(/_/g, " ") },
    { key: "target_type",  label: "Target Type" },
    { key: "target_id",    label: "Target" },
    { key: "before_value", label: "Before",  render: v => <span style={{ color: "#ef4444" }}>{v}</span> },
    { key: "after_value",  label: "After",   render: v => <span style={{ color: "#22c55e" }}>{v}</span> },
    { key: "reason",       label: "Reason",  render: v => <span style={{ color: "#94a3b8" }}>{v}</span> },
    { key: "approval_id",  label: "Approval" },
  ];

  return (
    <div>
      <Card style={{ padding: 0 }}>
        <Table cols={cols} rows={DATA.auditLog} />
      </Card>
    </div>
  );
};

export default AuditPage;
