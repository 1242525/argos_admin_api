import { useState } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";
import { exportPaymentInfo } from "../api.js";

const BASE_URL = "http://10.10.3.2:8001";

const BRAND_COLOR = {
  visa:          "#1a3a6b",
  mastercard:    "#6b1a1a",
  samsung_card:  "#1a2a6b",
  hyundai_card:  "#1a4a2a",
  kb_card:       "#4a3a00",
  shinhan_card:  "#002244",
  woori_card:    "#2a0044",
  hana_card:     "#004433",
};

const BrandBadge = ({ brand }) => {
  const bg = BRAND_COLOR[brand] || "#1a1a2a";
  return (
    <span style={{
      background: bg, border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "2px 8px",
      fontSize: "0.65rem", fontWeight: 700,
      color: "#fff", letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>{brand?.replace(/_/g, " ")}</span>
  );
};

const PaymentInfoPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [filter, setFilter]         = useState({});
  const [sel, setSel]               = useState(null);
  const [exporting, setExporting]   = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  const handleExport = async (fmt = "csv") => {
    setExporting(true);
    setExportResult(null);
    try {
      const result = await exportPaymentInfo(filter.tenant_id || null, fmt);
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

  let rows = DATA.paymentInfo || [];
  if (filter.tenant_id) rows = rows.filter(r => r.tenant_id === filter.tenant_id);
  if (filter.brand)     rows = rows.filter(r => r.card_brand === filter.brand);
  if (filter.search)    rows = rows.filter(r =>
    r.card_holder?.includes(filter.search) ||
    r.customer_id?.includes(filter.search)
  );

  const brands = [...new Set((DATA.paymentInfo || []).map(r => r.card_brand))].filter(Boolean);

  const cols = [
    { key: "payment_id",  label: "Payment ID" },
    { key: "customer_id", label: "Customer ID", render: (v, row) =>
        <span style={{ color: t.textAccent, cursor: "pointer" }} onClick={() => setSel(row)}>{v}</span> },
    { key: "card_brand",  label: "Brand",   render: v => <BrandBadge brand={v} /> },
    { key: "card_last4",  label: "Card No", render: v => <span style={{ color: t.textMuted }}>**** **** **** {v}</span> },
    { key: "card_expiry", label: "Expiry" },
    { key: "card_holder", label: "Holder" },
    { key: "pg_token",    label: "PG Token", render: v =>
        <span style={{ color: t.textFaint, fontSize: "0.7rem" }}>{v}</span> },
    { key: "created_at",  label: "등록일" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr 360px" : "1fr", gap: 16 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <FilterBar filters={[
            { key: "search",    label: "Search",  type: "text",   placeholder: "holder/customer_id" },
            { key: "tenant_id", label: "Tenant",  type: "select", options: (DATA.tenants || []).map(t => t.tenant_id) },
            { key: "brand",     label: "Brand",   type: "select", options: brands },
          ]} values={filter} onChange={handleF} />
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

        <div style={{ marginBottom: 10, fontSize: "0.75rem", color: t.textMuted }}>
          총 <b style={{ color: t.text }}>{rows.length}</b>건
        </div>
        <Card style={{ padding: 0 }}>
          <Table cols={cols} rows={rows} />
        </Card>
      </div>

      {sel && (
        <Card>
          <SectionTitle>Card Detail</SectionTitle>
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
              <span style={{ color: t.text, maxWidth: 200, textAlign: "right", wordBreak: "break-all" }}>
                {k === "card_brand" ? <BrandBadge brand={v} /> : String(v ?? "-")}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <SectionTitle>결제 내역</SectionTitle>
            {(DATA.transactions || [])
              .filter(tx => tx.payment_id === sel.payment_id)
              .slice(0, 5)
              .map(tx => (
                <div key={tx.transaction_id} style={{
                  fontSize: "0.7rem", padding: "6px 0",
                  borderBottom: `1px solid ${t.borderSub}`, color: t.textMuted,
                }}>
                  <span style={{ color: t.textAccent }}>{tx.product_type}</span>
                  {" · "}
                  <span style={{ color: "#22c55e" }}>{Number(tx.amount).toLocaleString()}원</span>
                  {" · "}
                  <Pill val={tx.status} />
                  <div style={{ color: t.textFaint, marginTop: 2 }}>{tx.transaction_at}</div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PaymentInfoPage;
