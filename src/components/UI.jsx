import { STATUS_COLOR, SEV_COLOR } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";

export const Pill = ({ val, size = "sm" }) => {
  const col = STATUS_COLOR[val] || "#94a3b8";
  const fs = size === "sm" ? "0.65rem" : "0.7rem";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: fs, fontWeight: 600, letterSpacing: "0.04em",
      color: col, border: `1px solid ${col}40`, background: `${col}15`,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{val}</span>
  );
};

export const SevBadge = ({ sev }) => {
  const c = SEV_COLOR[sev] || SEV_COLOR.info;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
      color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      textTransform: "uppercase",
    }}>{sev}</span>
  );
};

export const Table = ({ cols, rows }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr style={{ background: t.bgRow }}>
            {cols.map(c => (
              <th key={c.key} style={{
                textAlign: "left", padding: "10px 16px",
                color: t.textDim, fontWeight: 600, letterSpacing: "0.06em",
                fontSize: "0.68rem", textTransform: "uppercase",
                borderBottom: `2px solid ${t.border}`, whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.borderSub}`, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = t.bgRow}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {cols.map(c => (
                <td key={c.key} style={{ padding: "11px 16px", color: t.text, whiteSpace: "nowrap" }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Card = ({ children, style = {}, gradient = false }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      background: gradient ? t.gradient : t.bgCard,
      border: gradient ? "none" : `1px solid ${t.border}`,
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: t.shadow,
      ...style,
    }}>{children}</div>
  );
};

export const SectionTitle = ({ children }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: t.textDim, marginBottom: 16,
      paddingBottom: 10, borderBottom: `1px solid ${t.border}`,
    }}>
      {children}
    </div>
  );
};

export const StatCard = ({ label, value, sub, accent, icon }) => {
  const { theme: t } = useTheme();
  const col = accent || t.accent;
  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
      padding: "20px 22px", boxShadow: t.shadow,
      position: "relative", overflow: "hidden",
    }}>
      {/* 배경 accent 원 */}
      <div style={{
        position: "absolute", right: -16, top: -16,
        width: 80, height: 80, borderRadius: "50%",
        background: `${col}18`,
      }} />
      <div style={{
        fontSize: "0.65rem", color: t.textDim, textTransform: "uppercase",
        letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontSize: "2rem", fontWeight: 800, color: t.textTitle,
        lineHeight: 1, letterSpacing: "-0.02em",
      }}>{value}</div>
      {sub && (
        <div style={{
          fontSize: "0.72rem", color: col, marginTop: 8,
          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{
            background: `${col}20`, borderRadius: 20,
            padding: "1px 8px", fontSize: "0.65rem",
          }}>{sub}</span>
        </div>
      )}
    </div>
  );
};

export const FilterBar = ({ filters, values, onChange }) => {
  const { theme: t } = useTheme();
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      {filters.map(f => (
        <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{
            fontSize: "0.65rem", color: t.textDim, textTransform: "uppercase",
            letterSpacing: "0.08em", fontWeight: 600,
          }}>{f.label}</label>
          {f.type === "select" ? (
            <select value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)} style={{
              background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8,
              color: t.text, fontSize: "0.78rem", padding: "5px 10px", outline: "none",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <option value="">전체</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder || ""} style={{
                background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8,
                color: t.text, fontSize: "0.78rem", padding: "5px 10px", width: 130, outline: "none",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
              }} />
          )}
        </div>
      ))}
    </div>
  );
};
