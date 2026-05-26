import { useEffect, useState } from "react";
import { useTheme } from "../ThemeContext.jsx";
import { BASE_URL, getInquiries } from "../api.js";

const MOCK_DEVICES = [
  { id: "DEV-001", name: "CAM-A1", model: "Argos-X200", firmware: "v2.1.1", status: "online",  location: "서울 강남구" },
  { id: "DEV-002", name: "CAM-B3", model: "Argos-X200", firmware: "v2.0.8", status: "offline", location: "부산 해운대구" },
  { id: "DEV-003", name: "CAM-C7", model: "Argos-X100", firmware: "v1.9.2", status: "online",  location: "인천 연수구" },
];

const DiagnosticReport = ({ serial, t }) => {
  const device = MOCK_DEVICES.find(d => d.id === serial || d.name === serial) || MOCK_DEVICES[0];
  const now = new Date().toLocaleString("ko-KR");

  return (
    <div style={{ marginTop: 16, background: t.bgSide, borderRadius: 10, padding: 16, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: t.textAccent, marginBottom: 12, letterSpacing: "0.08em" }}>
        ◈ 기기 자동 진단 리포트
      </div>
      <div style={{ fontSize: "0.7rem", color: t.textFaint, marginBottom: 12 }}>생성 시각: {now}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {[
          { label: "기기 ID",    value: device.id },
          { label: "기기명",     value: device.name },
          { label: "모델",       value: device.model },
          { label: "펌웨어",     value: device.firmware },
          { label: "상태",       value: device.status === "online" ? "🟢 온라인" : "🔴 오프라인" },
          { label: "위치",       value: device.location },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
            <span style={{ color: t.textFaint }}>{label}</span>
            <span style={{ color: t.textDim, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginBottom: 10 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: t.textFaint, marginBottom: 8 }}>진단 항목</div>
        {[
          { item: "네트워크 연결",   result: "정상", ok: true },
          { item: "스토리지 용량",   result: "78% 사용 중", ok: true },
          { item: "펌웨어 최신 여부", result: device.firmware === "v2.1.1" ? "최신" : "업데이트 필요", ok: device.firmware === "v2.1.1" },
          { item: "카메라 센서",     result: "정상", ok: true },
          { item: "마지막 통신",     result: "3분 전", ok: true },
        ].map(({ item, result, ok }) => (
          <div key={item} style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "0.75rem", padding: "4px 0",
            borderBottom: `1px solid ${t.border}22`,
          }}>
            <span style={{ color: t.textFaint }}>{item}</span>
            <span style={{ color: ok ? "#22c55e" : "#eab308", fontWeight: 600 }}>{result}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "0.7rem", color: t.textFaint, marginTop: 8, fontStyle: "italic" }}>
        * 임시 진단 데이터입니다. 실제 기기 연동 후 정확한 정보가 표시됩니다.
      </div>
    </div>
  );
};

const InquiriesPage = () => {
  const { theme: t } = useTheme();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDiag, setShowDiag] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    setShowDiag(false);
    try {
      const data = await getInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch {
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInquiries(); }, []);

  const handleSelect = (inq) => {
    setSelected(inq);
    setShowDiag(false);
  };

  const statusColor = { pending: "#eab308", resolved: "#22c55e" };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: t.textTitle }}>1:1 문의</div>
          <div style={{ fontSize: "0.8rem", color: t.textFaint, marginTop: 4 }}>외부 사용자 문의 목록</div>
        </div>
        <button onClick={fetchInquiries} style={{
          padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.border}`,
          background: t.bgCard, color: t.textDim, cursor: "pointer", fontSize: "0.8rem",
        }}>새로고침</button>
      </div>

      {loading ? (
        <div style={{ color: t.textFaint, padding: 40, textAlign: "center" }}>불러오는 중...</div>
      ) : inquiries.length === 0 ? (
        <div style={{ color: t.textFaint, padding: 40, textAlign: "center" }}>문의가 없습니다.</div>
      ) : (
        <div style={{ display: "flex", gap: 20 }}>
          {/* 목록 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {inquiries.map((inq) => (
              <div key={inq.id} onClick={() => handleSelect(inq)} style={{
                background: selected?.id === inq.id ? t.navActive : t.bgCard,
                border: `1px solid ${selected?.id === inq.id ? t.accent : t.border}`,
                borderRadius: 12, padding: "16px 20px", cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.75rem", color: t.textFaint }}>{inq.id}</span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: (statusColor[inq.status] || "#888") + "22",
                    color: statusColor[inq.status] || t.textFaint,
                  }}>{inq.status}</span>
                </div>
                <div style={{ fontWeight: 700, color: t.textTitle, fontSize: "0.9rem", marginBottom: 4 }}>{inq.title}</div>
                <div style={{ display: "flex", gap: 10, fontSize: "0.75rem", color: t.textFaint }}>
                  <span>📁 {inq.category}</span>
                  <span>🕒 {new Date(inq.created_at).toLocaleString("ko-KR")}</span>
                  {inq.serial_number && <span>🔢 {inq.serial_number}</span>}
                  {inq.file_paths?.length > 0 && <span>📎 {inq.file_paths.length}개</span>}
                </div>
              </div>
            ))}
          </div>

          {/* 상세 */}
          {selected && (
            <div style={{
              width: 420, background: t.bgCard, border: `1px solid ${t.border}`,
              borderRadius: 14, padding: "24px", flexShrink: 0, alignSelf: "flex-start",
              position: "sticky", top: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: t.textTitle, fontSize: "0.95rem" }}>문의 상세</div>
                <button onClick={() => { setSelected(null); setShowDiag(false); }} style={{
                  background: "none", border: "none", color: t.textFaint, cursor: "pointer", fontSize: "1rem",
                }}>✕</button>
              </div>

              <div style={{ fontSize: "0.75rem", color: t.textFaint, marginBottom: 6 }}>{selected.id} · {selected.category}</div>
              <div style={{ fontWeight: 700, color: t.textTitle, fontSize: "1rem", marginBottom: 14 }}>{selected.title}</div>

              {selected.serial_number && (
                <div style={{ fontSize: "0.78rem", color: t.textDim, marginBottom: 10 }}>
                  🔢 시리얼 넘버: <span style={{ color: t.textAccent, fontWeight: 700 }}>{selected.serial_number}</span>
                </div>
              )}

              <div style={{
                background: t.bgSide, borderRadius: 8, padding: 14,
                fontSize: "0.85rem", color: t.textDim, lineHeight: 1.7, marginBottom: 16,
                whiteSpace: "pre-wrap",
              }}>{selected.content}</div>

              {selected.file_paths?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.75rem", color: t.textFaint, marginBottom: 8 }}>첨부 파일</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.file_paths.map((f, i) => (
                      <a key={i} href={`${BASE_URL}/uploads/${f}`} target="_blank" rel="noreferrer"
                        style={{
                          background: t.bgSide, borderRadius: 6, padding: "8px 12px",
                          fontSize: "0.8rem", color: t.accent, display: "flex", alignItems: "center", gap: 8,
                          textDecoration: "none",
                        }}>
                        📎 {f}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: "0.75rem", color: t.textFaint, marginBottom: 16 }}>
                접수: {new Date(selected.created_at).toLocaleString("ko-KR")}
              </div>

              {/* 진단 버튼 */}
              <button
                onClick={() => setShowDiag(prev => !prev)}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8,
                  background: showDiag ? t.bgSide : t.accent,
                  border: `1px solid ${t.accent}`,
                  color: showDiag ? t.textDim : "#fff",
                  cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                {showDiag ? "▲ 진단 리포트 닫기" : "◈ 기기 자동 진단 리포트 생성"}
              </button>

              {showDiag && <DiagnosticReport serial={selected.serial_number} t={t} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
