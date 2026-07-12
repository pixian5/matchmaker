const LEGACY_SESSION_KEY = "matchmaker_session";

export const SESSION_KEYS = {
  client: "matchmaker_session_client",
  matchmaker: "matchmaker_session_matchmaker",
  admin: "matchmaker_session_admin",
};

export function getRoleForPath(path = "") {
  if (path.startsWith("/pages/matchmaker/")) return "matchmaker";
  if (path.startsWith("/pages/admin/")) return "admin";
  return "client";
}

export function getCurrentPagePath() {
  try {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    return page?.route ? `/${page.route}` : "";
  } catch (error) {
    return "";
  }
}

export function getCurrentRole() {
  return getRoleForPath(getCurrentPagePath());
}

export function getSessionKey(role = getCurrentRole()) {
  return SESSION_KEYS[role] || SESSION_KEYS.client;
}

export function readSession(role = getCurrentRole()) {
  try {
    const key = getSessionKey(role);
    const session = uni.getStorageSync(key);
    if (session?.token) return session;

    // 兼容升级前的旧会话，首次进入对应角色时自动迁移。
    const legacy = uni.getStorageSync(LEGACY_SESSION_KEY);
    if (legacy?.token && (!legacy.role || legacy.role === role)) {
      uni.setStorageSync(key, legacy);
      uni.removeStorageSync(LEGACY_SESSION_KEY);
      return legacy;
    }
  } catch (error) {
    // ignore storage errors
  }
  return null;
}

export function removeSession(role = getCurrentRole()) {
  try {
    uni.removeStorageSync(getSessionKey(role));
  } catch (error) {
    // ignore storage errors
  }
}
