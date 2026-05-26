import { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { Card, SectionTitle } from "../components/UI.jsx";
import { getPaymentExportRequests, approvePaymentExport } from "../api.js";

const BASE_URL = "http://10.10.3.2:8001";

const ApprovalsPage = () => {
  const { theme: t } = useTheme();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [approving, setApproving] = useState(null);
  const [results, setResults]     = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getPaymentExportRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (requestId) => {
    setApproving(requestId);
    try {
      const result = await approvePaymentExport(requestId);
      setResults(r => ({ ...r, [requestId]: result }));
      fetchRequests();
    } catch (e) {
      setResults(r => ({ ...r, [requestId]: { error: e.message } }));
    } finally {
      setApproving(null);
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

  const pending  = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: t.textTitle }}>Export 승인 관리</div>
          <div style={{ fontSize: "0.75rem", color: t.textMuted, marginTop: 4 }}>
            결제 데이터 export 요청을 검토하고 승인합니다.
          </div>
        </div>
        <button onClick={fetchRequests} style={{
          background: t.borderSub, border: `1px solid ${t.border}`,
          color: t.textDim, borderRadius: 8, padding: "6px 14px",
          fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
        }}>↻ 새로고침</button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>
          승인 대기
          {pending.length > 0 && (
            <span style={{
              marginLeft: 8, background: "#ef4444", color: "#fff",
              borderRadius: 20, padding: "1px 8px",
              fontSize: "0.65rem", fontWeight: 700,
            }}>{pending.length}</span>
          )}
        </SectionTitle>
        {loading ? (
          <div style={{ color: t.textMuted, fontSize: "0.8rem", padding: "12px 0" }}>로딩 중...</div>
        ) : pending.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: "0.8rem", padding: "12px 0" }}>대기 중인 요청이 없습니다.</div>
        ) : pending.map(req => (
          <div key={req.request_id} style={{
            border: `1px solid ${t.border}`, borderRadius: 10,
            padding: "14px 16px", marginBottom: 10, background: t.bgCard,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.7rem", color: t.textFaint }}>#{req.request_id}</span>
                  <span style={{
                    background: "#2a1500", border: "1px solid #f59e0b",
                    color: "#f59e0b", borderRadius: 6, padding: "1px 8px",
                    fontSize: "0.65rem", fontWeight: 700,
                  }}>대기중</span>
                  <span style={{ fontSize: "0.7rem", color: t.textMuted }}>
                    요청자: <b style={{ color: t.textAccent }}>{req.requester_id}</b>
                  </span>
                  <span style={{ fontSize: "0.7rem", color: t.textFaint }}>
                    {new Date(req.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <div style={{
                  fontSize: "0.82rem", color: t.text,
                  background: t.borderSub, borderRadius: 6,
                  padding: "8px 12px", lineHeight: 1.5,
                }}>
                  {req.purpose}
                </div>
                <div style={{ marginTop: 6, fontSize: "0.7rem", color: t.textFaint }}>
                  형식: {req.fmt?.toUpperCase()} {req.tenant_id && `· 테넌트: ${req.tenant_id}`}
                </div>
              </div>
              <button
                onClick={() => handleApprove(req.request_id)}
                disabled={approving === req.request_id}
                style={{
                  background: approving === req.request_id ? t.borderSub : "#0a2e0a",
                  border: "1px solid #22c55e", color: "#22c55e",
                  borderRadius: 8, padding: "8px 18px",
                  fontSize: "0.78rem", fontWeight: 700,
                  cursor: approving === req.request_id ? "not-allowed" : "pointer",
                  fontFamily: "inherit", flexShrink: 0,
                }}
              >
                {approving === req.request_id ? "처리 중..." : "✓ 승인"}
              </button>
            </div>
            {results[req.request_id] && (
              <div style={{
                marginTop: 10,
                background: results[req.request_id].error ? "#2d0a0a" : "#0a1a0a",
                border: `1px solid ${results[req.request_id].error ? "#6b1a1a" : "#22c55e"}`,
                borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem",
              }}>
                {results[req.request_id].error ? (
                  <span style={{ color: "#ff4d4d" }}>오류: {results[req.request_id].error}</span>
                ) : (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#22c55e" }}>✓ 승인 완료</span>
                    <span style={{ color: t.textDim }}>레코드: <b style={{ color: t.text }}>{results[req.request_id].record_count}</b></span>
                    <span style={{ color: t.textDim }}>파일: <b style={{ color: t.textAccent }}>{results[req.request_id].filename}</b></span>
                    <span
                      onClick={() => handleDownload(results[req.request_id].download_url, results[req.request_id].filename)}
                      style={{ color: "#f59e0b", cursor: "pointer", fontWeight: 600 }}
                    >↓ 다운로드</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>처리 완료</SectionTitle>
        {approved.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: "0.8rem", padding: "12px 0" }}>처리된 요청이 없습니다.</div>
        ) : approved.map(req => (
          <div key={req.request_id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: `1px solid ${t.borderSub}`,
            fontSize: "0.75rem",
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: t.textFaint, marginRight: 8 }}>#{req.request_id}</span>
              <span style={{ color: t.textAccent, marginRight: 8 }}>{req.requester_id}</span>
              <span style={{ color: t.textDim }}>{req.purpose?.slice(0, 40)}{req.purpose?.length > 40 ? "..." : ""}</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
              <span style={{ color: t.textFaint }}>{req.approver_id}</span>
              <span style={{
                background: "#0a2e0a", border: "1px solid #22c55e",
                color: "#22c55e", borderRadius: 6, padding: "1px 8px",
                fontSize: "0.65rem", fontWeight: 700,
              }}>승인됨</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default ApprovalsPage;
