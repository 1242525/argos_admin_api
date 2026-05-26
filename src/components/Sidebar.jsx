import { NAV_ITEMS } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";
import { getAdminSession } from "../authSession.js";

const Sidebar = ({ page, setPage, navOpen, setNavOpen, alertCount = 0 }) => {
  const { theme: t } = useTheme();
  const { role } = getAdminSession();
  const visibleItems = NAV_ITEMS.filter(n => (!n.adminOnly || role === "admin") && (!n.complianceOnly || role === "compliance"));

  return (
    <aside style={{
      width: navOpen ? 230 : 60, minHeight: "100vh",
      background: t.bgSide,
      borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden", flexShrink: 0,
      boxShadow: "2px 0 12px rgba(124,58,237,0.06)",
    }}>
      <div style={{
        padding: navOpen ? "24px 20px 20px" : "24px 16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: t.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.9rem", fontWeight: 900, color: "#fff",
          boxShadow: "0 4px 12px rgba(124,58,237,0.4)",
        }}>A</div>
        {navOpen && (
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: t.textTitle, letterSpacing: "-0.01em" }}>Argos</div>
            <div style={{ fontSize: "0.6rem", color: t.textFaint, letterSpacing: "0.12em", textTransform: "uppercase" }}>Admin Console</div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {visibleItems.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: 10, padding: "10px 14px",
              background: active ? t.navActive : "none",
              border: "none", borderRadius: 10,
              color: active ? t.accent : t.textDim,
              cursor: "pointer", fontSize: "0.82rem", fontWeight: active ? 700 : 500,
              textAlign: "left", whiteSpace: "nowrap",
              transition: "all 0.15s", marginBottom: 2,
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.borderSub; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
            >
              <span style={{
                fontSize: "1rem", flexShrink: 0, width: 20, textAlign: "center",
                filter: active ? "none" : "opacity(0.6)",
              }}>{n.icon}</span>
              {navOpen && <span style={{ flex: 1 }}>{n.label}</span>}
              {navOpen && n.id === "alerts" && alertCount > 0 && (
                <span style={{
                  background: "#ef4444", color: "#fff",
                  borderRadius: 20, padding: "1px 7px",
                  fontSize: "0.6rem", fontWeight: 700,
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <button onClick={() => setNavOpen(v => !v)} style={{
        margin: "0 10px 16px", padding: "8px", background: t.borderSub,
        border: `1px solid ${t.border}`, borderRadius: 10,
        color: t.textDim, cursor: "pointer", fontSize: "0.75rem",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "all 0.15s",
      }}>
        {navOpen ? "← 접기" : "→"}
      </button>
    </aside>
  );
};

export default Sidebar;
