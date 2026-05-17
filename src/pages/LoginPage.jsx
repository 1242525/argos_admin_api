import { useState } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { login } from "../api.js";

const LoginPage = ({ onLogin }) => {
  const { theme: t } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      // 서버가 { access_token: "..." } 또는 { token: "..." } 형태로 응답
      const token = data.access_token || data.token;
      if (!token) throw new Error("토큰을 받지 못했습니다");
      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_username", data.username || username);
      localStorage.setItem("admin_role", data.role || "");
      onLogin();
    } catch (err) {
      setError(err.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: t.bgRow,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.text,
    fontSize: "0.85rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: t.textDim,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: t.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    }}>
      <div style={{
        width: 380,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: "36px 32px",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: "2rem", fontWeight: 900,
            color: t.textTitle, letterSpacing: "-0.04em",
          }}>
            ⬡ ARGOS
          </div>
          <div style={{ fontSize: "0.72rem", color: t.textMuted, marginTop: 4, letterSpacing: "0.1em" }}>
            ADMIN CONSOLE
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#2d0a0a",
              border: "1px solid #6b1a1a",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#ff4d4d",
              fontSize: "0.8rem",
              marginBottom: 16,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 0",
              background: loading ? t.bgRow : t.textAccent,
              color: loading ? t.textDim : "#0a0a0a",
              border: "none",
              borderRadius: 8,
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              transition: "background 0.15s",
            }}
          >
            {loading ? "인증 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
