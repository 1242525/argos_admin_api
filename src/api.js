const BASE_URL = "http://10.10.3.2:8001";
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
export const getTenants      = () => fetchAPI("/admin/tenants");
export const getPaymentInfo  = () => fetchAPI("/admin/payment-info");
export const getTransactions = () => fetchAPI("/admin/transactions");

export const exportPaymentInfo = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/payment-info?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};

export const exportTransactions = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/transactions?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};

export const exportCustomers = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/customers?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};

export const exportDevices = async (tenantId = null, fmt = "csv") => {
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/devices?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Export 오류: ${res.status}`);
  return res.json();
};
