import { useState } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";
import { exportTransactions } from "../api.js";

const BASE_URL = "http://10.10.3.2:8001";

const TYPE_COLOR = {
  device_purchase: { bg: "#001a3a", text: "#4db8ff", border: "#004466" },
  installation:    { bg: "#1a1a00", text: "#e6c300", border: "#5c4f00" },
  subscription:    { bg: "#001a0a", text: "#22c55e", border: "#004422" },
  storage:         { bg: "#1a001a", text: "#c084fc", border: "#4a0066" },
};

const TypeBadge = ({ type }) => {
  const c = TYPE_COLOR[type] || { bg: "#1a1a2a", text: "#aaa", border: "#333" };
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "2px 8px",
      fontSize: "0.65rem", fontWeight: 700, color: c.text,
      letterSpacing: "0.04em",
    }}>{type?.replace(/_/g, " ")}</span>
  );
};

const TransactionsPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter]             = useState({});
  const [sel, setSel]                   = useState(null);
  const [exporting, setExporting]       = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  const handleExport = async (fmt = "csv") => {
    setExporting(true);
    setExportResult(null);
    try {
      const result = await exportTransactions(filter.tenant_id || null, fmt);
      setExportResult(result);
    } catch (e) {
      setExportResult({ error: e.message });
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (downloadUrl, filename) => {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${BASE_URL}${downloadUrl}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  let rows = DATA.transactions || [];
  if (filter.tenant_id)    rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.status)       rows = rows.filter(r => r.status === filter.status);
  if (filter.product_type) rows = rows.filter(r => r.product_type === filter.product_type);
  if (filter.search)       rows = rows.filter(r =>
    r.customer_id?.includes(filter.search) ||
    r.transaction_id?.includes(filter.search)
  );

  const totalAmount = rows
    .filter(r => r.status === "success")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const cols = [
    { key: "transaction_id", label: "TXN ID" },
    { key: "customer_id",    label: "Customer", render: (v, row) =>
        <span style={{ color: t.textAccent, cursor: "pointer" }} onClick={() => setSel(row)}>{v}</span> },
    { key: "product_type",   label: "Type",   render: v => <TypeBadge type={v} /> },
    { key: "amount",         label: "금액",   render: v =>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>{Number(v).toLocaleString()}원</span> },
    { key: "tax_amount",     label: "부가세", render: v =>
        <span style={{ color: t.textMuted }}>{Number(v).toLocaleString()}원</span> },
    { key: "pg_name",        label: "PG사" },
    { key: "card_brand",     label: "카드" },
    { key: "card_last4",     label: "카드 번호", render: v =>
        <span style={{ color: t.textFaint }}>*{v}</span> },
    { key: "status",         label: "Status", render: v => <Pill val={v} /> },
    { key: "transaction_at", label: "결제일시" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 380px" : "1fr", gap: 16 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <FilterBar filters={[
            { key: "search",       label: "Search",  type: "text",   placeholder: "TXN ID / Customer" },
            { key: "tenant_id",    label: "Tenant",  type: "select", options: (DATA.tenants || []).map(t => t.tenant_id) },
            { key: "product_type", label: "Type",    type: "select", options: ["device_purchase","installation","subscription","storage"] },
            { key: "status",       label: "Status",  type: "select", options: ["success","refunded"] },
          ]} values={filter} onChange={handleF} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleExport("csv")} disabled={exporting} style={{
                background: exporting ? t.borderSub : "#1a2e1a", border: "1px solid #22c55e",
                color: "#22c55e", borderRadius: 8, padding: "6px 14px",
                fontSize: "0.75rem", fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>{exporting ? "..." : "↓ CSV"}</button>
              <button onClick={() => handleExport("json")} disabled={exporting} style={{
                background: exporting ? t.borderSub : "#1a1a2e", border: "1px solid #3b82f6",
                color: "#3b82f6", borderRadius: 8, padding: "6px 14px",
                fontSize: "0.75rem", fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>{exporting ? "..." : "↓ JSON"}</button>
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: "0.75rem" }}>
              <span style={{ color: t.textDim }}>건수: <b style={{ color: t.text }}>{rows.length}</b></span>
              <span style={{ color: t.textDim }}>합계: <b style={{ color: "#22c55e" }}>{totalAmount.toLocaleString()}원</b></span>
            </div>
          </div>
        </div>

        {exportResult && (
          <div style={{
            background: exportResult.error ? "#2d0a0a" : "#0a1a0a",
            border: `1px solid ${exportResult.error ? "#6b1a1a" : "#22c55e"}`,
            borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: "0.75rem",
          }}>
            {exportResult.error ? (
              <span style={{ color: "#ff4d4d" }}>Export 실패: {exportResult.error}</span>
            ) : (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: t.text }}>
                <span style={{ color: "#22c55e" }}>Export 완료</span>
                <span style={{ color: t.textDim }}>레코드: <b style={{ color: t.text }}>{exportResult.record_count}</b></span>
                <span style={{ color: t.textDim }}>파일: <b style={{ color: t.textAccent }}>{exportResult.filename}</b></span>
                {exportResult.minio_url && (
                  <a href={exportResult.minio_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>MinIO 링크</a>
                )}
                {exportResult.download_url && (
                  <span onClick={() => handleDownload(exportResult.download_url, exportResult.filename)}
                    style={{ color: "#f59e0b", cursor: "pointer" }}>다운로드</span>
                )}
              </div>
            )}
          </div>
        )}
        <Card style={{ padding: 0 }}>
          <Table cols={cols} rows={rows} />
        </Card>
      </div>

      {sel && (
        <Card>
          <SectionTitle>Transaction Detail</SectionTitle>
          <button onClick={() => setSel(null)} style={{
            float: "right", background: "none", border: "none",
            color: t.textDim, cursor: "pointer", fontSize: "1.1rem",
          }}>✕</button>
          {Object.entries(sel).map(([k, v]) => (
            <div key={k} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: `1px solid ${t.borderSub}`,
              fontSize: "0.75rem",
            }}>
              <span style={{ color: t.textDim, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                {k.replace(/_/g, " ")}
              </span>
              <span style={{ color: t.text, maxWidth: 220, textAlign: "right", wordBreak: "break-all" }}>
                {k === "product_type" ? <TypeBadge type={v} />
                 : k === "status"     ? <Pill val={v} />
                 : k === "amount" || k === "tax_amount" ? `${Number(v).toLocaleString()}원`
                 : String(v ?? "-")}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default TransactionsPage;
