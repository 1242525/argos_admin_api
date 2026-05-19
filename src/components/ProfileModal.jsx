import { useState } from "react";
import { useTheme } from "../ThemeContext.jsx";

const BASE_URL = "http://10.10.3.2:8001";

const ProfileModal = ({ onClose, onUpdated }) => {
  const { theme: t } = useTheme();
  const username = localStorage.getItem("admin_username") || "";
  const role     = localStorage.getItem("admin_role") || "";

  const [newUsername, setNewUsername] = useState(username);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/staff/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });
      if (!res.ok) throw new Error(`오류: ${res.status}`);
      localStorage.setItem("admin_username", newUsername);
      setSuccess("저장되었습니다");
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    background: t.bgRow, border: `1px solid ${t.border}`,
    borderRadius: 8, color: t.text,
    fontSize: "0.82rem", fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", marginBottom: 5,
    fontSize: "0.68rem", textTransform: "uppercase",
    letterSpacing: "0.08em", color: t.textDim,
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 16, padding: "28px 28px 24px",
        width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: t.textTitle }}>프로필 설정</div>
            <div style={{ fontSize: "0.7rem", color: t.textFaint, marginTop: 2 }}>{role}</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: t.textDim,
            cursor: "pointer", fontSize: "1.2rem",
          }}>✕</button>
        </div>

        {/* 아바타 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: t.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", fontWeight: 700, color: "#fff",
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Username</label>
            <input
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              style={inputStyle}
              placeholder="username"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#2d0a0a", border: "1px solid #6b1a1a",
              borderRadius: 8, padding: "8px 12px",
              color: "#ff4d4d", fontSize: "0.75rem", marginBottom: 12,
            }}>⚠ {error}</div>
          )}
          {success && (
            <div style={{
              background: "#0a1a0a", border: "1px solid #22c55e",
              borderRadius: 8, padding: "8px 12px",
              color: "#22c55e", fontSize: "0.75rem", marginBottom: 12,
            }}>✓ {success}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px 0",
            background: loading ? t.bgRow : t.textAccent,
            color: loading ? t.textDim : "#0a0a0a",
            border: "none", borderRadius: 8,
            fontSize: "0.82rem", fontWeight: 700,
            fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
          }}>
            {loading ? "저장 중..." : "저장"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
