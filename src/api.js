const BASE_URL = "http://localhost:8001";
const getToken = () => localStorage.getItem("admin_token");

const fetchAPI = async (endpoint) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
  }
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  return res.json();
};

export const login = async (username, password) => {
  const res = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("로그인 실패");
  return res.json();
};

export const getCustomers   = () => fetchAPI("/admin/customers");
export const getDevices     = () => fetchAPI("/admin/devices");
export const getMediaEvents = () => fetchAPI("/admin/media-events");
export const getOta         = () => fetchAPI("/admin/ota");
export const getStaff       = () => fetchAPI("/admin/staff");
export const getAccessLogs  = () => fetchAPI("/admin/access-logs");
export const getAlerts      = () => fetchAPI("/admin/alerts");
export const getServices    = () => fetchAPI("/admin/services");
export const getAuditLog    = () => fetchAPI("/admin/audit-log");
export const getTenants     = () => fetchAPI("/admin/tenants");
