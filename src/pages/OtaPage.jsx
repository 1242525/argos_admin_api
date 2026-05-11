import { useState, useRef } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { StatCard, Card, Table, Pill } from "../components/UI.jsx";

const OtaPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    firmware_version: "",
    deployment_group: "",
    target_device_count: "",
    signed_by: "",
    approved_by: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("admin_token");

      const formData = new FormData();
      formData.append("firmware_version", form.firmware_version);
      formData.append("deployment_group", form.deployment_group);
      formData.append("target_device_count", parseInt(form.target_device_count) || 0);
      formData.append("signed_by", form.signed_by);
      formData.append("approved_by", form.approved_by);
      if (file) formData.append("firmware_file", file);

      const res = await fetch("http://localhost:8001/admin/ota", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("배포 실패");
      const data = await res.json();
      setResult({ status: "success", file: data.file });
      setForm({ firmware_version: "", deployment_group: "", target_device_count: "", signed_by: "", approved_by: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setShowModal(false), 2000);
    } catch (e) {
      setResult({ status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    background: t.bgInput, border: `1px solid ${t.border}`,
    borderRadius: 8, color: t.text, fontSize: "0.82rem",
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  const cols = [
    { key: "firmware_version",    label: "Version" },
    { key: "deployment_group",    label: "Group" },
    { key: "target_device_count", label: "Targets" },
    { key: "update_status",       label: "Status",  render: v => <Pill val={v} /> },
    { key: "signed_status",       label: "Signed",  render: v => <Pill val={v} /> },
    { key: "signed_by",           label: "Signed By" },
    { key: "approved_by",         label: "Approved By" },
    { key: "created_at",          label: "Created",
      render: v => v ? new Date(v).toLocaleDateString("ko-KR") : "—" },
  ];

  return (
    <div>
      <button onClick={() => setShowModal(true)} style={{
        display: "block", marginBottom: 16,
        padding: "10px 20px", background: t.gradient,
        border: "none", borderRadius: 10, color: "#fff",
        fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit",
      }}>
        + 새 배포
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="전체 배포" value={DATA.ota?.length || 0} accent="#3b82f6" icon="📦" />
        <StatCard label="진행중" value={DATA.ota?.filter(o => o.update_status === "in_progress").length || 0} accent="#f97316" icon="⬆️" />
        <StatCard label="완료" value={DATA.ota?.filter(o => o.update_status === "completed").length || 0} accent="#22c55e" icon="✅" />
      </div>

      <Card style={{ padding: 0 }}>
        <Table cols={cols} rows={DATA.ota || []} />
      </Card>

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: 20, padding: "32px 28px", width: 460,
            boxShadow: t.shadow,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: t.textTitle }}>새 펌웨어 배포</div>
              <button onClick={() => setShowModal(false)} style={{
                background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontSize: "1.2rem",
              }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "firmware_version",    label: "펌웨어 버전",     placeholder: "v2.3.3" },
                { key: "deployment_group",    label: "배포 그룹",       placeholder: "canary-01" },
                { key: "target_device_count", label: "대상 디바이스 수", placeholder: "0" },
                { key: "signed_by",           label: "서명자",          placeholder: "ops01" },
                { key: "approved_by",         label: "승인자",          placeholder: "dev01" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{
                    display: "block", marginBottom: 5,
                    fontSize: "0.68rem", textTransform: "uppercase",
                    letterSpacing: "0.08em", color: t.textMuted, fontWeight: 600,
                  }}>{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = t.accent}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                </div>
              ))}

              <div>
                <label style={{
                  display: "block", marginBottom: 5,
                  fontSize: "0.68rem", textTransform: "uppercase",
                  letterSpacing: "0.08em", color: t.textMuted, fontWeight: 600,
                }}>펌웨어 파일</label>
                <input
                  type="file"
                  ref={fileRef}
                  onChange={e => setFile(e.target.files[0])}
                  style={{
                    width: "100%", padding: "9px 12px",
                    background: t.bgInput, border: `1px solid ${t.border}`,
                    borderRadius: 8, color: t.text, fontSize: "0.82rem",
                    fontFamily: "inherit", boxSizing: "border-box", cursor: "pointer",
                  }}
                />
                {file && (
                  <div style={{ marginTop: 6, fontSize: "0.72rem", color: t.textAccent }}>
                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>

            {result?.status === "success" && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: `${t.positive}18`, color: t.positive, fontSize: "0.8rem" }}>
                ✅ 배포가 시작됐어요!
                {result.file && (
                  <div style={{ marginTop: 6, color: t.textAccent, fontSize: "0.75rem" }}>
                    📎 업로드된 파일: {result.file}
                  </div>
                )}
              </div>
            )}
            {result?.status === "error" && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#ff6b6b18", color: "#ff6b6b", fontSize: "0.8rem" }}>
                ⚠ 배포 실패. API 확인해주세요.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: "11px 0", background: t.bgInput,
                border: `1px solid ${t.border}`, borderRadius: 10,
                color: t.textMuted, cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit",
              }}>취소</button>
              <button onClick={handleSubmit} disabled={loading} style={{
                flex: 1, padding: "11px 0", background: t.gradient,
                border: "none", borderRadius: 10, color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.85rem", fontWeight: 700, fontFamily: "inherit",
              }}>
                {loading ? "처리 중..." : "배포 시작"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtaPage;
