
import { SEV_COLOR } from "../constants.js";
import { useTheme } from "../ThemeContext.jsx";
import { StatCard, Card, SectionTitle, SevBadge, Pill } from "../components/UI.jsx";

const OverviewPage = ({ data: DATA }) => {
  const { theme: t } = useTheme();
  const username = localStorage.getItem("admin_username") || "admin";
  const openAlerts = DATA.alerts.filter(a => a.status === "open").length;
  const svcStatus = [
    "API Gateway","Auth Service","Customer API","Device API",
    "Media API","OTA Server","MinIO","PostgreSQL","Wazuh/SIEM",
  ];
  return (
    <div>
      {/* 인사말 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: t.textTitle, letterSpacing: "-0.02em" }}>
          안녕하세요, {username} 👋
        </h1>
        <p style={{ margin: "4px 0 0", color: t.textMuted, fontSize: "0.85rem" }}>
          Argos 관리 콘솔 · 오늘의 시스템 현황입니다.
        </p>
      </div>

      {/* 스탯 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="전체 고객"       value={DATA.customers.length}                                             accent="#7c3aed" sub="테넌트 2개" />
        <StatCard label="등록 디바이스"    value={DATA.devices.length}                                               accent="#06b6d4" sub="전체 온라인" />
        <StatCard label="미디어 이벤트"    value={DATA.mediaEvents.length}                                           accent="#f59e0b" />
        <StatCard label="OTA 진행중"       value={DATA.ota.filter(o=>o.update_status==="in_progress").length}        accent="#f97316" />
        <StatCard label="미처리 알림"      value={openAlerts}                                                        accent="#ef4444" sub="즉시 확인 필요" />
        <StatCard label="스태프 계정"      value={DATA.staffAccounts.length}                                         accent="#8b5cf6"
          sub={`비활성 ${DATA.staffAccounts.filter(s=>s.account_status==="disabled").length}건`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 서비스 헬스 */}
        <Card>
          <SectionTitle>서비스 상태</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {svcStatus.map(s => (
              <div key={s} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 10, background: t.bgRow,
                fontSize: "0.8rem",
              }}>
                <span style={{ color: t.text, fontWeight: 500 }}>{s}</span>
                <Pill val="healthy" />
              </div>
            ))}
          </div>
        </Card>

        {/* 최근 알림 */}
        <Card>
          <SectionTitle>최근 알림</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DATA.alerts.slice(0,5).map(a => {
              const c = SEV_COLOR[a.severity] || SEV_COLOR.info;
              return (
                <div key={a.alert_id} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 12, padding: "10px 14px", fontSize: "0.78rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <SevBadge sev={a.severity} />
                    <span style={{ color: t.textFaint, fontSize: "0.68rem" }}>{a.created_at}</span>
                  </div>
                  <div style={{ color: c.text, fontWeight: 700, marginBottom: 2 }}>
                    {a.event_type.replace(/_/g," ")}
                  </div>
                  <div style={{ color: t.textMuted, fontSize: "0.72rem" }}>
                    {a.actor_id} → {a.target_resource}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default OverviewPage;
