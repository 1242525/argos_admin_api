// ────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { id: "overview",  icon: "⬡", label: "Overview" },
  { id: "tenants",   icon: "⊞", label: "Tenants / Customers" },
  { id: "devices",   icon: "◈", label: "Devices" },
  { id: "media",     icon: "▷", label: "Media / Sensor" },
  { id: "ota",       icon: "↑", label: "OTA / Firmware" },
  { id: "identity",  icon: "◉", label: "Identity / Staff" },
  { id: "logs",      icon: "≡", label: "Access Logs" },
  { id: "alerts",    icon: "⚠", label: "Alerts" },
  { id: "system",    icon: "◫", label: "System Inventory" },
  { id: "audit",     icon: "⌘", label: "Audit / Change" },
  { id: "payments",     icon: "₩", label: "Payment Info",  adminOnly: true },
  { id: "transactions", icon: "↔", label: "Transactions",  adminOnly: true },
  { id: "inquiries", icon: "✉", label: "1:1 문의" },
  { id: "approvals",    icon: "✓", label: "Export 승인",   complianceOnly: true },
];

export const SEV_COLOR = {
  critical: { bg: "#2d0a0a", text: "#ff4d4d", border: "#6b1a1a" },
  high:     { bg: "#2a1500", text: "#ff8c2a", border: "#6b3a00" },
  warning:  { bg: "#1e1a00", text: "#e6c300", border: "#5c4f00" },
  info:     { bg: "#001a2a", text: "#4db8ff", border: "#004466" },
};

export const STATUS_COLOR = {
  active:       "#22c55e",
  online:       "#22c55e",
  healthy:      "#22c55e",
  ok:           "#22c55e",
  disabled:     "#6b7280",
  retired:      "#6b7280",
  offline:      "#6b7280",
  blocked:      "#ef4444",
  revoked:      "#ef4444",
  DENIED:       "#ef4444",
  ALLOWED:      "#22c55e",
  open:         "#f97316",
  investigating:"#eab308",
  resolved:     "#22c55e",
  signed:       "#22c55e",
  in_progress:  "#3b82f6",
  completed:    "#22c55e",
  pending:      "#eab308",
  available:    "#22c55e",
  valid:        "#22c55e",
};
