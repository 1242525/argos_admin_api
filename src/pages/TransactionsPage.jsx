import { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle, FilterBar, Table, Pill } from "../components/UI.jsx";
import { exportTransactions, requestTransactionsExport, getMyTransactionsRequests } from "../api.js";

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
  const [showModal, setShowModal]         = useState(false);
  const [purpose, setPurpose]             = useState("");
  const [requesting, setRequesting]       = useState(false);
  const [requestResult, setRequestResult] = useState(null);
  const [myRequests, setMyRequests]       = useState([]);
  const handleF = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        const data = await getMyTransactionsRequests();
        setMyRequests(data);
      } catch (e) {}
    };
    fetchMyRequests();
    const interval = setInterval(fetchMyRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRequest = async () => {
    if (!purpose.trim()) return;
    setRequesting(true);
    setRequestResult(null);
    try {
      const result = await requestTransactionsExport(purpose, filter.tenant_id || null);
      setRequestResult(result);
      setPurpose("");
    } catch (e) {
      setRequestResult({ error: e.message });
    } finally {
      setRequesting(false);
    }
  };

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
              <button onClick={() => { setShowModal(true); setRequestResult(null); }} style={{
                background: "#1a2e1a", border: "1px solid #22c55e",
                color: "#22c55e", borderRadius: 8, padding: "6px 14px",
                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}>↓ CSV 요청</button>
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


      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: 14, padding: "24px 28px", width: 480, maxWidth: "90vw",
          }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: t.textTitle, marginBottom: 6 }}>
              거래 데이터 Export 요청
            </div>
            <div style={{ fontSize: "0.75rem", color: t.textMuted, marginBottom: 16 }}>
              Export 목적을 입력하면 담당자 승인 후 다운로드가 가능합니다.
            </div>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="예: 2026년 5월 거래 데이터 월간 감사 목적으로 요청합니다."
              rows={4}
              style={{
                width: "100%", background: t.borderSub,
                border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.text, padding: "10px 12px",
                fontSize: "0.82rem", fontFamily: "inherit",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            {requestResult && (
              <div style={{
                marginTop: 10,
                background: requestResult.error ? "#2d0a0a" : "#0a1a0a",
                border: `1px solid ${requestResult.error ? "#6b1a1a" : "#22c55e"}`,
                borderRadius: 8, padding: "10px 12px", fontSize: "0.75rem",
              }}>
                {requestResult.error ? (
                  <span style={{ color: "#ff4d4d" }}>오류: {requestResult.error}</span>
                ) : (
                  <span style={{ color: "#22c55e" }}>✓ 승인 요청이 전송됐습니다. (요청 번호: #{requestResult.request_id})</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setPurpose(""); setRequestResult(null); }} style={{
                background: t.borderSub, border: `1px solid ${t.border}`,
                color: t.textDim, borderRadius: 8, padding: "7px 16px",
                fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
              }}>취소</button>
              <button onClick={handleRequest} disabled={requesting || !purpose.trim()} style={{
                background: requesting || !purpose.trim() ? t.borderSub : "#0a2e0a",
                border: "1px solid #22c55e", color: "#22c55e",
                borderRadius: 8, padding: "7px 16px",
                fontSize: "0.78rem", fontWeight: 600,
                cursor: requesting || !purpose.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}>{requesting ? "전송 중..." : "요청 전송"}</button>
            </div>
          </div>
        </div>
      )}

      {myRequests.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {myRequests.filter(r => r.status === "approved" && r.filename).map(req => (
            <div key={req.request_id} style={{
              background: "#0a1a0a", border: "1px solid #22c55e",
              borderRadius: 10, padding: "10px 16px", marginBottom: 8,
              fontSize: "0.75rem", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
            }}>
              <span style={{ color: "#22c55e" }}>✓ 승인 완료</span>
              <span style={{ color: t.textDim }}>요청 #{req.request_id}</span>
              <span style={{ color: t.textDim }}>{req.purpose?.slice(0, 30)}{req.purpose?.length > 30 ? "..." : ""}</span>
              <span style={{ color: t.textFaint }}>{req.approver_id}이 승인</span>
              <span
                onClick={() => handleDownload(`/admin/export/download/${req.filename}`, req.filename)}
                style={{ color: "#f59e0b", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}
              >↓ 다운로드</span>
            </div>
          ))}
          {myRequests.filter(r => r.status === "pending").map(req => (
            <div key={req.request_id} style={{
              background: "#1a1500", border: "1px solid #f59e0b",
              borderRadius: 10, padding: "10px 16px", marginBottom: 8,
              fontSize: "0.75rem", display: "flex", gap: 16, alignItems: "center",
            }}>
              <span style={{ color: "#f59e0b" }}>⏳ 승인 대기 중</span>
              <span style={{ color: t.textDim }}>요청 #{req.request_id}</span>
              <span style={{ color: t.textDim }}>{req.purpose?.slice(0, 30)}{req.purpose?.length > 30 ? "..." : ""}</span>
            </div>
          ))}
        </div>
      )}

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
