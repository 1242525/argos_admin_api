import { NAV_ITEMS } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";

const Topbar = ({ page, onLogout }) => {
  const { theme: t, mode, toggle } = useTheme();
  const navItem = NAV_ITEMS.find(n => n.id === page);
  const username = localStorage.getItem("admin_username") || "admin";
  const initial = username.charAt(0).toUpperCase();

  return (
    <header style={{
      padding: "0 28px", height: 60,
      borderBottom: `1px solid ${t.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: t.bgSide, flexShrink: 0,
      boxShadow: "0 1px 0 " + t.border,
    }}>
      {/* 브레드크럼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.75rem", color: t.textFaint }}>대시보드</span>
        <span style={{ color: t.border }}>/</span>
        <span style={{ fontSize: "0.85rem", color: t.textTitle, fontWeight: 700 }}>
          {navItem?.label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* 상태 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: t.bgTag, borderRadius: 20, padding: "5px 12px",
          fontSize: "0.72rem", color: t.textMuted, border: `1px solid ${t.border}`,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
          전체 시스템 정상
        </div>

        {/* 테마 토글 */}
        <button onClick={toggle} style={{
          background: t.bgTag, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: "6px 12px", fontSize: "0.85rem", cursor: "pointer",
          color: t.textAccent, boxShadow: t.shadow, transition: "all 0.15s",
        }}>
          {mode === "dark" ? "☀️" : "🌙"}
        </button>

        {/* 사용자 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: t.bgTag, border: `1px solid ${t.border}`, borderRadius: 20,
          padding: "5px 14px 5px 5px",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: t.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.7rem", fontWeight: 700, color: "#fff",
          }}>{initial}</div>
          <span style={{ fontSize: "0.78rem", color: t.text, fontWeight: 600 }}>{username}</span>
        </div>

        {/* 로그아웃 */}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
              padding: "6px 12px", fontSize: "0.72rem", cursor: "pointer",
              color: t.textDim, fontFamily: "inherit", letterSpacing: "0.05em",
            }}
          >
            로그아웃
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
