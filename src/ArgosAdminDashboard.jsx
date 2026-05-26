import { useState, useEffect, useCallback } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext.jsx";

import Sidebar   from "./components/Sidebar.jsx";
import Topbar    from "./components/Topbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";

import OverviewPage  from "./pages/OverviewPage.jsx";
import TenantsPage   from "./pages/TenantsPage.jsx";
import DevicesPage   from "./pages/DevicesPage.jsx";
import MediaPage     from "./pages/MediaPage.jsx";
import OtaPage       from "./pages/OtaPage.jsx";
import IdentityPage  from "./pages/IdentityPage.jsx";
import LogsPage      from "./pages/LogsPage.jsx";
import AlertsPage    from "./pages/AlertsPage.jsx";
import SystemPage    from "./pages/SystemPage.jsx";
import AuditPage         from "./pages/AuditPage.jsx";
import PaymentInfoPage   from "./pages/PaymentInfoPage.jsx";
import TransactionsPage  from "./pages/TransactionsPage.jsx";
import { getAdminSession } from "./authSession.js";

import {
  getCustomers, getDevices, getMediaEvents, getOta,
  getStaff, getAccessLogs, getAlerts, getServices,
  getAuditLog, getTenants, getPaymentInfo, getTransactions,
} from "./api.js";

const Spinner = ({ t }) => (
  <div style={{
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    height: "60vh", gap: 16,
  }}>
    <div style={{
      width: 36, height: 36,
      border: `3px solid ${t.border}`,
      borderTop: `3px solid ${t.textAccent}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <div style={{ color: t.textMuted, fontSize: "0.8rem", letterSpacing: "0.1em" }}>
      데이터 로딩 중...
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorBanner = ({ message, onRetry, t }) => (
  <div style={{
    background: "#2d0a0a", border: "1px solid #6b1a1a",
    borderRadius: 10, padding: "14px 18px",
    color: "#ff4d4d", fontSize: "0.82rem",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  }}>
    <span>⚠ {message}</span>
    <button onClick={onRetry} style={{
      background: "#6b1a1a", border: "none", borderRadius: 6,
      color: "#ff4d4d", padding: "5px 12px", cursor: "pointer",
      fontSize: "0.75rem", fontFamily: "inherit",
    }}>재시도</button>
  </div>
);

const PAGE_MAP = {
  overview: OverviewPage,
  tenants:  TenantsPage,
  devices:  DevicesPage,
  media:    MediaPage,
  ota:      OtaPage,
  identity: IdentityPage,
  logs:     LogsPage,
  alerts:   AlertsPage,
  system:   SystemPage,
  audit:        AuditPage,
  payments:     PaymentInfoPage,
  transactions: TransactionsPage,
};

const AppInner = ({ onLogout }) => {
  const { theme: t } = useTheme();
  const [page, setPage]       = useState("overview");
  const [navOpen, setNavOpen] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        customers, devices, mediaEvents, ota,
        staffAccounts, accessLogs, alerts, services,
        auditLog, tenants, paymentInfo, transactions,
      ] = await Promise.all([
        getCustomers(), getDevices(), getMediaEvents(), getOta(),
        getStaff(), getAccessLogs(), getAlerts(), getServices(),
        getAuditLog(), getTenants(), getPaymentInfo(), getTransactions(),
      ]);
      setApiData({ customers, devices, mediaEvents, ota, staffAccounts, accessLogs, alerts, services, auditLog, tenants, paymentInfo, transactions });
    } catch (err) {
      setError(err.message || "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.body.style.background = t.bg;
    document.body.style.margin = "0";
  }, [t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const { role } = getAdminSession();
  const adminOnlyPages = ["payments", "transactions"];
  const PageComponent = PAGE_MAP[page];

  if (adminOnlyPages.includes(page) && role !== "admin") {
    return (
      <div style={{
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        background: t.bg, color: t.text, minHeight: "100vh",
        display: "flex", fontSize: "13px",
      }}>
        <Sidebar page={page} setPage={setPage} navOpen={navOpen} setNavOpen={setNavOpen}
          alertCount={apiData ? apiData.alerts.filter(a => a.status === "open").length : 0} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar page={page} onLogout={onLogout} />
          <main style={{ flex: 1, padding: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: t.textMuted }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>⊘</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: t.textDim }}>접근 권한 없음</div>
              <div style={{ fontSize: "0.75rem", marginTop: 6 }}>admin 계정만 접근할 수 있습니다.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: t.bg, color: t.text, minHeight: "100vh",
      display: "flex", fontSize: "13px",
    }}>
      <Sidebar
  page={page} setPage={setPage}
  navOpen={navOpen} setNavOpen={setNavOpen}
  alertCount={apiData ? apiData.alerts.filter(a => a.status === "open").length : 0}
/>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar page={page} onLogout={onLogout} onRefresh={fetchAll} />
        <main style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {error && <ErrorBanner message={error} onRetry={fetchAll} t={t} />}
          {loading ? (
            <Spinner t={t} />
          ) : apiData ? (
            <PageComponent data={apiData} />
          ) : null}
        </main>
      </div>
    </div>
  );
};

const AuthGate = () => {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("admin_token"));

  const handleLogin  = () => setAuthed(true);
  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    localStorage.removeItem("admin_role");
    setAuthed(false);
  };

  if (!authed) return <LoginPage onLogin={handleLogin} />;
  return <AppInner onLogout={handleLogout} />;
};

export default function ArgosAdminDashboard() {
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}
