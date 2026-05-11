import { useState } from "react";

import { Card, FilterBar, Table, Pill } from "../components/UI.jsx";

const MediaPage = ({ data: DATA }) => {
  const [filter, setFilter] = useState({});
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  let rows = DATA.mediaEvents;
  if (filter.device_id) rows = rows.filter(r => r.device_id === filter.device_id);
  if (filter.tenant_id) rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.owner_id)  rows = rows.filter(r => r.owner_id === filter.owner_id);

  const cols = [
    { key: "event_id",   label: "Event ID" },
    { key: "tenant_id",  label: "Tenant" },
    { key: "owner_id",   label: "Owner" },
    { key: "device_id",  label: "Device" },
    { key: "event_type", label: "Type" },
    { key: "event_time", label: "Time" },
    {
      key: "minio_object_key", label: "Object Key",
      render: v => <span style={{ color: "#64748b", fontSize: "0.68rem" }}>{v}</span>,
    },
    { key: "thumbnail_status", label: "Thumbnail", render: v => <Pill val={v} /> },
    { key: "video_url_status", label: "Video URL",  render: v => <Pill val={v} /> },
  ];

  return (
    <div>
      <FilterBar
        filters={[
          { key: "tenant_id", label: "Tenant", type: "select", options: DATA.tenants.map(t => t.tenant_id) },
          { key: "device_id", label: "Device", type: "select", options: DATA.devices.map(d => d.device_id) },
          { key: "owner_id",  label: "Owner",  type: "select", options: DATA.customers.map(c => c.username) },
        ]}
        values={filter} onChange={handleF}
      />
      <Card style={{ padding: 0 }}>
        <Table cols={cols} rows={rows} />
      </Card>
    </div>
  );
};

export default MediaPage;
