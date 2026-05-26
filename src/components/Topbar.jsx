import { useState, useRef, useEffect } from "react";
import { NAV_ITEMS } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";
import ProfileModal from "./ProfileModal.jsx";
import { getAdminSession } from "../authSession.js";

const Topbar = ({ page, onLogout, onRefresh }) => {
  const { theme: t, mode, toggle } = useTheme();
  const navItem  = NAV_ITEMS.find(n => n.id === page);
  const { username, role } = getAdminSession();
  const initial  = username.charAt(0).toUpperCase();

  const [dropOpen, setDropOpen]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
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

          {/* 사용자 + 드롭다운 */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <div
              onClick={() => setDropOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: t.bgTag, border: `1px solid ${dropOpen ? t.textAccent : t.border}`,
                borderRadius: 20, padding: "5px 14px 5px 5px",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: t.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", fontWeight: 700, color: "#fff",
              }}>{initial}</div>
              <span style={{ fontSize: "0.78rem", color: t.text, fontWeight: 600 }}>{username}</span>
              <span style={{ fontSize: "0.6rem", color: t.textFaint, marginLeft: 2 }}>▾</span>
            </div>

            {/* 드롭다운 메뉴 */}
            {dropOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: 12, padding: "6px",
                minWidth: 160, zIndex: 100,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}>
                <div style={{
                  padding: "8px 12px 10px",
                  borderBottom: `1px solid ${t.border}`,
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: t.text }}>{username}</div>
                  <div style={{ fontSize: "0.65rem", color: t.textFaint, marginTop: 2 }}>
                    {role}
                  </div>
                </div>

                <button onClick={() => { setShowProfile(true); setDropOpen(false); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: "none", border: "none",
                  borderRadius: 8, color: t.textDim, fontSize: "0.78rem",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = t.borderSub}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  ⚙ Settings
                </button>

                <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />

                {onLogout && (
                  <button onClick={() => { onLogout(); setDropOpen(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", background: "none", border: "none",
                    borderRadius: 8, color: "#ef4444", fontSize: "0.78rem",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#2d0a0a"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    ⏻ 로그아웃
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onUpdated={() => { setShowProfile(false); if (onRefresh) onRefresh(); }}
        />
      )}
    </>
  );
};

export default Topbar;
