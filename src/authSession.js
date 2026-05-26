export const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const getAdminSession = () => {
  const token = localStorage.getItem("admin_token") || "";
  const payload = decodeJwtPayload(token);

  return {
    token,
    payload,
    username: payload?.username || payload?.sub || localStorage.getItem("admin_username") || "admin",
    role: payload?.role || "",
    exp: payload?.exp || null,
  };
};

export const syncAdminSessionFromToken = () => {
  const session = getAdminSession();

  if (session.payload?.username || session.payload?.sub) {
    localStorage.setItem("admin_username", session.username);
  }

  if (session.payload?.role) {
    localStorage.setItem("admin_role", session.role);
  } else {
    localStorage.removeItem("admin_role");
  }

  return session;
};
