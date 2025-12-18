// LocalStorage-backed state helpers for the static owner dashboard.

export const OWNER_STORAGE_KEYS = Object.freeze({
  apiKey: "owner_api_key",
  ownerToken: "owner_owner_token",
  businessId: "owner_business_id",
  activeBusinessId: "owner_active_business_id",
  accessToken: "owner_access_token",
  refreshToken: "owner_refresh_token",
  userEmail: "owner_user_email",
  userRoles: "owner_user_roles",
  userId: "owner_user_id",
  emailAlerts: "owner_email_alerts",
  locale: "owner_locale",
});

export function loadOwnerState(storage = localStorage) {
  const apiKey = storage.getItem(OWNER_STORAGE_KEYS.apiKey) || "";
  const ownerToken = storage.getItem(OWNER_STORAGE_KEYS.ownerToken) || "";

  const accessToken = storage.getItem(OWNER_STORAGE_KEYS.accessToken) || "";
  const refreshToken = storage.getItem(OWNER_STORAGE_KEYS.refreshToken) || "";

  const userEmail = storage.getItem(OWNER_STORAGE_KEYS.userEmail) || "";
  const userId = storage.getItem(OWNER_STORAGE_KEYS.userId) || "";

  const emailAlertsEnabled = storage.getItem(OWNER_STORAGE_KEYS.emailAlerts) === "true";
  const locale = storage.getItem(OWNER_STORAGE_KEYS.locale) || "en";

  const businessId =
    storage.getItem(OWNER_STORAGE_KEYS.activeBusinessId) ||
    storage.getItem(OWNER_STORAGE_KEYS.businessId) ||
    "";

  let userRoles = [];
  try {
    const raw = storage.getItem(OWNER_STORAGE_KEYS.userRoles) || "[]";
    const parsed = JSON.parse(raw);
    userRoles = Array.isArray(parsed) ? parsed : [];
  } catch {
    userRoles = [];
  }

  return {
    apiKey,
    ownerToken,
    businessId,
    accessToken,
    refreshToken,
    userEmail,
    userRoles,
    userId,
    emailAlertsEnabled,
    locale,
  };
}

export function persistOwnerSession(
  {
    accessToken,
    refreshToken,
    userEmail,
    userRoles,
    userId,
    businessId,
  },
  storage = localStorage,
) {
  if (accessToken !== undefined) storage.setItem(OWNER_STORAGE_KEYS.accessToken, accessToken || "");
  if (refreshToken !== undefined) storage.setItem(OWNER_STORAGE_KEYS.refreshToken, refreshToken || "");
  if (userEmail !== undefined) storage.setItem(OWNER_STORAGE_KEYS.userEmail, userEmail || "");
  if (userRoles !== undefined) storage.setItem(OWNER_STORAGE_KEYS.userRoles, JSON.stringify(userRoles || []));
  if (userId) storage.setItem(OWNER_STORAGE_KEYS.userId, String(userId));

  if (businessId !== undefined) {
    storage.setItem(OWNER_STORAGE_KEYS.businessId, businessId || "");
    storage.setItem(OWNER_STORAGE_KEYS.activeBusinessId, businessId || "");
  }
}

export function clearOwnerSession(storage = localStorage) {
  storage.removeItem(OWNER_STORAGE_KEYS.accessToken);
  storage.removeItem(OWNER_STORAGE_KEYS.refreshToken);
  storage.removeItem(OWNER_STORAGE_KEYS.userEmail);
  storage.removeItem(OWNER_STORAGE_KEYS.userRoles);
  storage.removeItem(OWNER_STORAGE_KEYS.userId);
  storage.removeItem(OWNER_STORAGE_KEYS.businessId);
  storage.removeItem(OWNER_STORAGE_KEYS.activeBusinessId);
}

