export const BASE_URL = "http://10.10.3.2:8001";
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
export const getInquiries    = () => fetchAPI("/inquiries");

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

// ── 결제 Export 승인 요청 ──────────────────────────────────
export const requestPaymentExport = async (purpose, tenantId = null, fmt = "csv") => {
  const token = localStorage.getItem("admin_token");
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/payment-info/request?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── 승인 대기 목록 조회 ────────────────────────────────────
export const getPaymentExportRequests = async () => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/payment-info/requests`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── 승인 실행 ──────────────────────────────────────────────
export const approvePaymentExport = async (requestId) => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/payment-info/approve/${requestId}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── 내 요청 목록 조회 (admin용) ────────────────────────────
export const getMyPaymentRequests = async () => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/payment-info/my-requests`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ── transactions 승인 요청 ─────────────────────────────────
export const requestTransactionsExport = async (purpose, tenantId = null, fmt = "csv") => {
  const token = localStorage.getItem("admin_token");
  const params = new URLSearchParams({ fmt });
  if (tenantId) params.append("tenant_id", tenantId);
  const res = await fetch(`${BASE_URL}/admin/export/transactions/request?${params}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getTransactionsExportRequests = async () => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/transactions/requests`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const approveTransactionsExport = async (requestId) => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/transactions/approve/${requestId}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMyTransactionsRequests = async () => {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE_URL}/admin/export/transactions/my-requests`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
