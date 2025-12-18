import { createAuthorizedFetch, createFetchJson } from "./api.js";
import { i18nStrings } from "./i18n.js";
import { clearOwnerSession, loadOwnerState, persistOwnerSession } from "./state.js";
import { escapeHtml, generateTempPassword } from "./utils.js";
import { initFeedbackModal } from "./components/feedback.js";
import { initSubscriptionCard } from "./cards/subscription.js";
import { initTeamCard } from "./cards/team.js";

const DEFAULT_BACKEND_BASE = "http://localhost:8000";

const backendBase = DEFAULT_BACKEND_BASE;

const persisted = loadOwnerState();

let apiKey = persisted.apiKey;

let ownerToken = persisted.ownerToken;

let businessId = persisted.businessId;

let accessToken = persisted.accessToken;

let refreshToken = persisted.refreshToken;

let userEmail = persisted.userEmail;
let emailAlertsEnabled = persisted.emailAlertsEnabled;

let userRoles = persisted.userRoles;

let userId = persisted.userId;

let calendar90dData = null;

let ownerAssistantOpen = false;

let ownerAssistantBusy = false;

let geoMap = null;

let geoLayer = null;

let ownerServiceTier = null;

let locale = persisted.locale;

let connectionState = "connecting";

let recentInvites = [];

let subscriptionStatus = "unknown";

let subscriptionPlan = "basic";

let businessMemberships = [];

let conversationItems = [];

let voiceChannelsHealthy = true;

let callbackItems = [];
let filteredCallbacks = [];






if (!i18nStrings[locale]) {

  locale = "en";

}



function t(key, fallback = "") {

  const table = i18nStrings[locale] || i18nStrings.en;

  if (table && Object.prototype.hasOwnProperty.call(table, key)) {

    return table[key];

  }

  if (i18nStrings.en && Object.prototype.hasOwnProperty.call(i18nStrings.en, key)) {

    return i18nStrings.en[key];

  }

  return fallback || key;

}



function formatTemplate(str, vars = {}) {

  return String(str || "").replace(/\{(\w+)\}/g, (match, key) => {

    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;

  });

}



function applyLocale() {

  const table = i18nStrings[locale] || i18nStrings.en;

  document.documentElement.lang = locale;

  document.querySelectorAll("[data-i18n]").forEach((el) => {

    const key = el.getAttribute("data-i18n");

    const attr = el.getAttribute("data-i18n-attr");

    const value = table && Object.prototype.hasOwnProperty.call(table, key)

      ? table[key]

      : i18nStrings.en?.[key];

    if (value === undefined) return;

    if (attr) {

      attr.split(",").forEach((attrNameRaw) => {

        const attrName = attrNameRaw.trim();

        if (!attrName) return;

        if (attrName === "text") {

          el.textContent = value;

        } else {

          el.setAttribute(attrName, value);

        }

      });

    } else {

      el.textContent = value;

    }

  });

  const localeSelect = document.getElementById("locale-select");

  if (localeSelect && localeSelect.value !== locale) {

    localeSelect.value = locale;

  }

  updateConnectionStatus(connectionState);

  setThemeToggleLabel();

}



function initLocale() {

  const select = document.getElementById("locale-select");

  if (select) {

    select.value = locale;

    select.addEventListener("change", () => {

      locale = select.value || "en";

      localStorage.setItem("owner_locale", locale);

      applyLocale();

      refreshAllData();

    });

  } else {

    document.documentElement.lang = locale;

  }

}



function updateConnectionStatus(state) {

  connectionState = state || "connecting";

  const el = document.getElementById("connection-status");

  if (!el) return;

  

  const dot = el.querySelector(".status-dot");

  const text = el.querySelector("span:last-child");

  

  if (state === "ok") {

    el.className = "status-badge success";

    text.textContent = t("status_connected");

  } else if (state === "error") {

    el.className = "status-badge error";

    text.textContent = t("status_error");

  } else {

    el.className = "status-badge muted";

    text.textContent = t("status_connecting");

  }

}



function setDataSourceStatus(id, state, note) {

  const pill = document.getElementById(id);

  if (!pill) return;

  pill.classList.remove("success", "warn", "error");

  if (state === "ok") pill.classList.add("success");

  else if (state === "warn") pill.classList.add("warn");

  else if (state === "error") pill.classList.add("error");

  const noteEl = pill.querySelector(".pill-note");

  if (noteEl && note) {

    noteEl.textContent = note;

  }

  if (id === "data-pill-voice") {

    const extra = document.getElementById("voice-health-note");

    if (extra && note) extra.textContent = note;

  }

  if (id === "data-pill-speech") {

    const extra = document.getElementById("speech-health-note");

    if (extra && note) extra.textContent = note;

  }

}



function renderOutcomeBadge(outcome) {

  const text = (outcome || "").toLowerCase();

  if (!text) return '<span class="pill-badge muted">No outcome</span>';

  if (text.includes("book") || text.includes("scheduled")) return '<span class="pill-badge success">Booked</span>';

  if (text.includes("voicemail") || text.includes("missed")) return '<span class="pill-badge warn">Voicemail</span>';

  if (text.includes("callback")) return '<span class="pill-badge warn">Callback</span>';

  return `<span class="pill-badge">${escapeHtml(outcome || "Outcome")}</span>`;

}



function renderCallbackStatus(status) {

  const text = (status || "").toUpperCase();

  if (text === "RESOLVED") return '<span class="pill-badge success">Resolved</span>';

  if (text === "PENDING") return '<span class="pill-badge warn">Pending</span>';

  return `<span class="pill-badge">${escapeHtml(text || "PENDING")}</span>`;

}

function renderConversationSummary(list = []) {
  const row = document.getElementById("conversations-summary");
  if (!row) return;
  if (!list.length) {
    row.textContent = "No conversations yet.";
    return;
  }
  const total = list.length;
  const byChannel = list.reduce((acc, item) => {
    const key = (item.channel || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const booked = list.filter((c) => (c.outcome || "").toLowerCase().includes("book")).length;
  const parts = [
    `Total ${total}`,
    `Voice ${byChannel.voice || 0}`,
    `SMS ${byChannel.sms || 0}`,
    `Chat ${byChannel.chat || 0}`,
    `Booked ${booked}`,
  ];
  row.textContent = parts.join(" | ");
}



function initDataStrip() {

  document.querySelectorAll(".pill-action[data-target]").forEach((btn) => {

    btn.addEventListener("click", () => {

      const targetId = btn.getAttribute("data-target");

      const target = targetId ? document.getElementById(targetId) : null;

      if (target) {

        target.scrollIntoView({ behavior: "smooth", block: "start" });

      }

    });

  });

  setDataSourceStatus("data-pill-calendar", "warn", "Checking calendar sync...");

  setDataSourceStatus("data-pill-voice", "warn", "Awaiting webhook status...");

  setDataSourceStatus("data-pill-speech", "warn", "Checking speech providers...");

  setDataSourceStatus("data-pill-billing", "warn", "Loading plan & payment...");

}



function initQuickActions() {

  document.querySelectorAll(".quick-actions button[data-target]").forEach((btn) => {

    btn.addEventListener("click", () => {

      const targetId = btn.getAttribute("data-target");

      const target = targetId ? document.getElementById(targetId) : null;

      if (target) {

        target.scrollIntoView({ behavior: "smooth", block: "start" });

      }

    });

  });

  document.querySelectorAll(".quick-actions button[data-link]").forEach((btn) => {

    btn.addEventListener("click", () => {

      const href = btn.getAttribute("data-link");

      if (href) window.location.href = href;

    });

  });

}



function updateRefreshed(id, isError = false) {

  const el = document.getElementById(id);

  if (!el) return;

  const stamp = new Date().toLocaleTimeString();

  el.textContent = isError ? `Last attempt ${stamp} (error)` : `Updated ${stamp}`;

  el.classList.toggle("muted", !isError);

  el.style.color = isError ? "#b91c1c" : "#64748b";

}



function attachRefreshBadge(buttonId, labelId) {

  const button = document.getElementById(buttonId);

  if (!button) return;

  const label = document.getElementById(labelId);

  if (!label) return;

  button.addEventListener("click", () => updateRefreshed(labelId));

}



function initConversationFilters() {

  const textInput = document.getElementById("conversations-filter");

  const channelSelect = document.getElementById("conversations-channel-filter");

  const sortSelect = document.getElementById("conversations-sort");

  const clearBtn = document.getElementById("conversations-clear");

  textInput?.addEventListener("input", () => applyConversationFilters());

  channelSelect?.addEventListener("change", () => applyConversationFilters());

  sortSelect?.addEventListener("change", () => applyConversationFilters());

  clearBtn?.addEventListener("click", () => {

    if (textInput) textInput.value = "";

    if (channelSelect) channelSelect.value = "";

    if (sortSelect) sortSelect.value = "newest";

    applyConversationFilters();

  });

}



function initCallbackFilters() {
  const textInput = document.getElementById("callbacks-filter");
  const statusSelect = document.getElementById("callbacks-status-filter");
  const sortSelect = document.getElementById("callbacks-sort");
  const clearBtn = document.getElementById("callbacks-clear");
  textInput?.addEventListener("input", () => applyCallbackFilters());
  statusSelect?.addEventListener("change", () => applyCallbackFilters());
  sortSelect?.addEventListener("change", () => applyCallbackFilters());
  clearBtn?.addEventListener("click", () => {
    if (textInput) textInput.value = "";
    if (statusSelect) statusSelect.value = "";
    if (sortSelect) sortSelect.value = "newest";
    applyCallbackFilters();
  });
}

function renderCallbackSummary(list = []) {
  const row = document.getElementById("callbacks-summary");
  if (!row) return;
  if (!list.length) {
    row.textContent = "No callbacks yet.";
    return;
  }
  const total = list.length;
  const resolved = list.filter((c) => (c.status || "").toUpperCase() === "RESOLVED").length;
  const pending = total - resolved;
  const voicemails = list.filter((c) => c.voicemail_url).length;
  row.textContent = `Total ${total} | Pending ${pending} | Resolved ${resolved} | Voicemail ${voicemails}`;
}

function downloadCallbacksCsv() {
  const data = (filteredCallbacks && filteredCallbacks.length) ? filteredCallbacks : callbackItems || [];
  if (!data.length) {
    alert("No callbacks to download.");
    return;
  }
  const header = ["phone", "reason", "status", "last_seen", "voicemail_url"];
  const rows = data.map((cb) => [
    cb.phone || "",
    cb.reason || "",
    cb.status || "",
    cb.last_seen || "",
    cb.voicemail_url || "",
  ]);
  const csv = [header, ...rows].map((r) =>
    r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "callbacks.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function loadActiveBusiness() {
  const pill = document.getElementById("active-business-pill");
  if (!pill) return;
  try {
    const res = await authorizedFetch("/v1/auth/me");
    if (!res.ok) throw new Error();
    const data = await res.json();
    const businessId = data?.active_business_id || "default_business";
    pill.textContent = `Active business: ${businessId}`;
  } catch {
    pill.textContent = "Active business: unknown";
  }
}

async function setActiveBusiness() {
  const input = document.getElementById("active-business-input");
  const requestedBiz = input?.value?.trim();
  if (!requestedBiz) return;
  try {
    const res = await authorizedFetch("/v1/auth/active-business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: requestedBiz }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || `Unable to set active business (${res.status})`);
    persistSessionFromTokens(data);
    const nextBiz = data?.user?.active_business_id || requestedBiz;
    const nextRoles = Array.isArray(data?.user?.roles) ? data.user.roles : userRoles;
    businessId = nextBiz;
    localStorage.setItem("owner_business_id", nextBiz);
    localStorage.setItem("owner_active_business_id", nextBiz);
    if (nextRoles?.length) userRoles = nextRoles;
    renderBusinessSwitcher();
    updateUserUi();
    await loadActiveBusiness();
    loadTeam();
    loadInvites();
    loadAuditLog();
    refreshAllData();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Unable to set active business.");
  }
}

async function loadAuditLog() {
  const container = document.getElementById("audit-log-content");
  const pill = document.getElementById("audit-count-pill");
  const actorSelect = document.getElementById("audit-actor-filter");
  const methodSelect = document.getElementById("audit-method-filter");
  const pathInput = document.getElementById("audit-path-filter");
  if (!container) return;
  if (!hasOwnerPrivileges()) {
    container.textContent = "Activity log requires owner or admin.";
    if (pill) {
      pill.textContent = "Restricted";
      pill.className = "pill muted";
    }
    return;
  }
  const params = new URLSearchParams({ limit: "50" });
  const actor = actorSelect?.value || "";
  const method = methodSelect?.value || "";
  const path = pathInput?.value?.trim() || "";
  if (actor) params.append("actor_type", actor);
  if (method) params.append("method", method);
  if (path) params.append("path_contains", path);
  container.innerHTML = '<div class="loading">Loading activity...</div>';
  try {
    const res = await authorizedFetch(`/v1/owner/audit?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || `Unable to load activity (${res.status})`);
    }
    const events = Array.isArray(data) ? data : [];
    if (!events.length) {
      container.innerHTML = '<div class="muted">No recent activity.</div>';
      if (pill) {
        pill.textContent = "0 entries";
        pill.className = "pill muted";
      }
      return;
    }
    container.innerHTML = events
      .map(
        (ev) => `
        <div class="metric-row" style="align-items:flex-start; gap:0.5rem;">
          <div style="min-width:90px; font-weight:600;">${escapeHtml(ev.method || "")}</div>
          <div style="flex:1;">
            <div style="font-weight:600;">${escapeHtml(ev.path || "")}</div>
            <div class="muted" style="font-size:0.8rem;">
              ${new Date(ev.created_at).toLocaleString()} · ${escapeHtml(ev.actor_type || "user")} · Status ${ev.status_code ?? ""}
            </div>
          </div>
        </div>
      `
      )
      .join("");
    if (pill) {
      pill.textContent = `${events.length} entr${events.length === 1 ? "y" : "ies"}`;
      pill.className = "pill connected";
    }
  } catch (err) {
    console.error(err);
    container.textContent = err?.message || "Unable to load activity.";
    if (pill) {
      pill.textContent = "Error";
      pill.className = "pill muted";
    }
  }
}

function persistSessionFromTokens(data) {

  if (!data) return;

  accessToken = data.access_token || "";

  refreshToken = data.refresh_token || "";

  const user = data.user || {};

  userEmail = user.email || userEmail || "";

  userRoles = Array.isArray(user.roles) ? user.roles : [];

  userId = user.id || userId || "";

  const nextBusinessId = user.active_business_id || "";

  if (nextBusinessId) businessId = nextBusinessId;

  persistOwnerSession({
    accessToken,
    refreshToken,
    userEmail,
    userRoles,
    userId,
    businessId: nextBusinessId || undefined,
  });

}



function clearSession(redirect = false) {

  accessToken = "";

  refreshToken = "";

  userEmail = "";

  userRoles = [];

  userId = "";

  businessId = "";

  clearOwnerSession();

  updateUserUi();

  if (redirect) {

    window.location.href = "login.html";

  }

}



function hasOwnerPrivileges() {

  return userRoles.some((r) => ["owner", "admin"].includes(String(r).toLowerCase()));

}



function renderBusinessSwitcher() {

  const switcher = document.getElementById("business-switcher");

  const select = document.getElementById("business-select");

  if (!switcher || !select) return;

  if (!businessMemberships.length) {

    switcher.style.display = "none";

    select.innerHTML = "";

    return;

  }

  switcher.style.display = "inline-flex";

  select.innerHTML = businessMemberships

    .map(

      (m) =>

        `<option value="${escapeHtml(m.business_id)}">${escapeHtml(m.business_name || m.business_id)} (${escapeHtml(m.role)})</option>`

    )

    .join("");

  if (businessId) {

    select.value = businessId;

  }

}



function updateUserUi() {

  const chip = document.getElementById("user-chip");

  const logoutBtn = document.getElementById("logout-btn");

  const logoutInline = document.getElementById("logout-btn-inline");

  const loginLink = document.getElementById("login-link-header");

  const sessionInfo = document.getElementById("user-session-summary");

  const inviteWrapper = document.getElementById("staff-invite-form-wrapper");

  const staffList = document.getElementById("staff-invite-list");

  const subBadge = document.getElementById("subscription-pill");



  const signedIn = !!accessToken;

  const rolesLabel = userRoles.length ? `(${userRoles.join(", ")})` : "";

  const chipText = signedIn

    ? `Signed in as ${userEmail || "user"} ${rolesLabel}`.trim()

    : "Signed out";



  if (chip) {

    chip.querySelector(".user-chip-text").textContent = chipText;

    chip.classList.toggle("muted", !signedIn);

  }

  if (logoutBtn) logoutBtn.style.display = signedIn ? "inline-flex" : "none";

  if (logoutInline) logoutInline.style.display = signedIn ? "inline-flex" : "none";

  if (loginLink) loginLink.style.display = signedIn ? "none" : "inline-flex";

  if (sessionInfo) {

    const activeBiz = businessMemberships.find((m) => m.business_id === businessId);

    const businessLabel = activeBiz

      ? `${activeBiz.business_name || activeBiz.business_id} (${activeBiz.role})`

      : businessId || "unset";

    sessionInfo.textContent = signedIn

      ? `Active business: ${businessLabel}`

      : "Signed out. Use login to continue.";

  }

  if (inviteWrapper) inviteWrapper.style.display = hasOwnerPrivileges()

    ? "block"

    : "none";

  if (staffList && !hasOwnerPrivileges()) {

    staffList.textContent = "Staff invites require owner or admin.";

  }

  if (subBadge) {

    const statusLabel = subscriptionStatus || "unknown";

    subBadge.textContent = `Subscription: ${statusLabel}`;

    subBadge.className = "pill";

    if (statusLabel === "active") {

      subBadge.classList.add("connected");

    } else if (statusLabel === "past_due" || statusLabel === "canceled") {

      subBadge.classList.add("disconnected");

    } else {

      subBadge.classList.add("muted");

    }

  }

  renderBusinessSwitcher();

}



async function refreshAccessToken() {

  if (!refreshToken) return false;

  try {

    const res = await fetch(`${backendBase}/v1/auth/refresh`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        refresh_token: refreshToken,

        business_id: businessId || undefined,

      }),

    });

    if (!res.ok) {

      clearSession();

      return false;

    }

    const data = await res.json();

    persistSessionFromTokens(data);

    updateUserUi();

    return true;

  } catch (err) {

    clearSession();

    return false;

  }

}



async function loadBusinesses() {

  try {

    const res = await authorizedFetch("/v1/auth/me/businesses");

    const data = await res.json();

    if (!res.ok) {

      throw new Error(data?.detail || `Unable to load businesses (${res.status})`);

    }

    businessMemberships = Array.isArray(data?.memberships) ? data.memberships : [];

    renderBusinessSwitcher();

  } catch (err) {

    businessMemberships = [];

    renderBusinessSwitcher();

  }

}



async function switchBusiness(newBusinessId) {

  if (!newBusinessId || newBusinessId === businessId) return;

  if (!refreshToken) return;

  const sessionInfo = document.getElementById("user-session-summary");

  try {

    if (sessionInfo) sessionInfo.textContent = "Switching business...";

    const res = await fetch(`${backendBase}/v1/auth/refresh`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        refresh_token: refreshToken,

        business_id: newBusinessId,

      }),

    });

    const data = await res.json();

    if (!res.ok) {

      throw new Error(data?.detail || "Unable to switch business");

    }

    persistSessionFromTokens(data);

    businessId = data?.user?.active_business_id || newBusinessId;

    updateUserUi();

    loadTeam();

    loadInvites();

    loadSubscriptionStatus();

    refreshAllData();

  } catch (err) {

    if (sessionInfo) sessionInfo.textContent = err?.message || "Unable to switch business.";

  }

}



function authHeaders() {

  const headers = {};

  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  if (apiKey) headers["X-API-Key"] = apiKey;

  if (ownerToken) headers["X-Owner-Token"] = ownerToken;

  if (businessId) headers["X-Business-ID"] = businessId;

  return headers;

}



const _authorizedFetch = createAuthorizedFetch({
  backendBase,
  authHeaders,
  getRefreshToken: () => refreshToken,
  refreshAccessToken,
});

const _fetchJson = createFetchJson({ authorizedFetch: _authorizedFetch, updateConnectionStatus });

async function authorizedFetch(path, init = {}) {

  return _authorizedFetch(path, init);

}



async function fetchJson(path, init = {}) {

  return _fetchJson(path, init);

}



const teamCard = initTeamCard({ authorizedFetch, hasOwnerPrivileges });

async function loadTeam() {
  return teamCard.loadTeam();
}

const subscriptionCard = initSubscriptionCard({
  authorizedFetch,
  setDataSourceStatus,
  updateUserUi,
  getSubscriptionState: () => ({ subscriptionStatus, subscriptionPlan }),
  setSubscriptionState: ({ subscriptionStatus: nextStatus, subscriptionPlan: nextPlan }) => {
    subscriptionStatus = nextStatus;
    subscriptionPlan = nextPlan;
  },
});

async function loadSubscriptionStatus() {
  return subscriptionCard.loadSubscriptionStatus();
}

async function startSubscription() {
  return subscriptionCard.startSubscription();
}

async function openBillingPortal() {
  return subscriptionCard.openBillingPortal();
}

function formatPercent(value) {

  if (value === null || value === undefined || isNaN(value)) {

    return "0%";

  }

  const pct = Math.round(Number(value) * 100);

  return `${pct}%`;

}



function formatMinutes(value) {

  if (value === null || value === undefined || isNaN(value)) {

    return "0m";

  }

  const minutes = Math.max(0, Math.round(Number(value)));

  if (minutes < 60) {

    return `${minutes}m`;

  }

  const hours = Math.floor(minutes / 60);

  const rem = minutes % 60;

  return rem ? `${hours}h ${rem}m` : `${hours}h`;

}



function formatCurrency(value) {

  if (value === null || value === undefined || isNaN(value)) {

    return "0";

  }

  const num = Number(value);

  return num.toLocaleString(locale || undefined, { maximumFractionDigits: 0 });

}



function tierCodeToLabel(tier) {

  if (!tier) return "Unselected";

  if (tier === "20") return "Starter ($20/mo)";

  if (tier === "100") return "Growth ($100/mo)";

  if (tier === "200") return "Scale ($200/mo)";

  return tier;

}



function tierCodeToNumber(tier) {

  if (!tier) return 0;

  const n = Number(tier);

  return Number.isFinite(n) ? n : 0;

}



function featureEnabledForTier(requiredTierCode) {

  const required = tierCodeToNumber(requiredTierCode);

  const actual = tierCodeToNumber(ownerServiceTier);

  if (!required || !actual) return true;

  return actual >= required;

}



function renderIntegrationStatuses(list) {

  const container = document.getElementById("integration-status-list");

  if (!container) return;

  if (!list || !list.length) {

    container.innerHTML = `<div class="empty-state">${t("integration_empty")}</div>`;

    setDataSourceStatus("data-pill-voice", "warn", "Connect your Twilio number");

    setDataSourceStatus("data-pill-calendar", "warn", "Connect calendar to auto-book");

    return;

  }

  const twilioConnected = list.some((item) => (item?.provider || "").toLowerCase() === "twilio" && item?.connected);

  const calendarConnected = list.some((item) => (item?.provider || "").toLowerCase() === "gcalendar" && item?.connected);

  setDataSourceStatus("data-pill-voice", twilioConnected ? "ok" : "warn", twilioConnected ? "Twilio webhooks connected" : "Wire voice webhooks to streaming URL");

  setDataSourceStatus("data-pill-calendar", calendarConnected ? "ok" : "warn", calendarConnected ? "Calendar connected" : "Connect Google Calendar");

  container.innerHTML = list

    .map((item) => {

      const connected = !!item?.connected;

      const label = escapeHtml(item?.label || item?.provider || "Integration");

      const statusRaw = (item?.status || "").toLowerCase();

      let statusText = connected ? t("integration_connected") : t("integration_disconnected");

      if (statusRaw === "error") statusText = "Error";

      if (!connected && statusRaw && statusRaw !== "disconnected" && statusRaw !== "error") {
        statusText = statusRaw;
      }

      const statusClass = statusRaw === "error" ? "error" : connected ? "connected" : "disconnected";

      return `

        <div class="integration-row ${statusClass}">

          <div>

            <div class="label">${label}</div>

            <div class="metric-label">${escapeHtml(item?.provider || "")}</div>

          </div>

          <span class="status">${statusText}</span>

        </div>

      `;

    })

    .join("");

}



async function loadOwnerKpis() {

  const el = document.getElementById("owner-kpis-content");

  if (!el) return;

  el.innerHTML = `<div class="loading">${t("kpi_loading")}</div>`;



  try {

    const [customers, sms, ttb, funnel, completeness] = await Promise.all([

      fetchJson("/v1/owner/customers/analytics?days=365"),

      fetchJson("/v1/owner/sms-metrics"),

      fetchJson("/v1/owner/time-to-book?days=90"),

      fetchJson("/v1/owner/conversion-funnel?days=90"),

      fetchJson("/v1/owner/data-completeness?days=365"),

    ]);



    const kpis = [];



    const convRate = funnel && typeof funnel.overall_conversion_rate === "number"

      ? funnel.overall_conversion_rate

      : null;

    if (convRate !== null) {

      kpis.push({ label: t("kpi_conversion"), value: formatPercent(convRate) });

    }



    const avgMinutes = ttb && typeof ttb.overall_average_minutes === "number"

      ? ttb.overall_average_minutes

      : null;

    if (avgMinutes !== null) {

      kpis.push({ label: t("kpi_avg_time"), value: formatMinutes(avgMinutes) });

    }



    const repeatShare = customers && customers.economics && typeof customers.economics.repeat_customer_share === "number"

      ? customers.economics.repeat_customer_share

      : null;

    if (repeatShare !== null) {

      kpis.push({ label: t("kpi_repeat"), value: formatPercent(repeatShare) });

    }



    const smsShare = sms && typeof sms.confirmation_share_via_sms === "number"

      ? sms.confirmation_share_via_sms

      : null;

    if (smsShare !== null) {

      kpis.push({ label: t("kpi_sms"), value: formatPercent(smsShare) });

    }



    const completenessScore = completeness && typeof completeness.appointment_completeness_score === "number"

      ? completeness.appointment_completeness_score

      : null;

    if (completenessScore !== null) {

      kpis.push({ label: t("kpi_data_complete"), value: formatPercent(completenessScore) });

    }



    if (!kpis.length) {

      el.innerHTML = `<div class="empty-state">${t("kpi_empty")}</div>`;

      return;

    }



    el.innerHTML = kpis.map(kpi => `

      <div class="kpi-card">

        <div class="kpi-value">${escapeHtml(kpi.value)}</div>

        <div class="kpi-label">${escapeHtml(kpi.label)}</div>

      </div>

    `).join("");

  } catch (err) {

    el.innerHTML = `<div class="empty-state">${t("kpi_unable")}</div>`;

  }

}



async function loadOwnerQbo() {

  const content = document.getElementById("owner-qbo-content");

  const modeEl = document.getElementById("owner-qbo-mode");

  const statusEl = document.getElementById("owner-qbo-status");

  const badgeEl = document.getElementById("owner-qbo-pill");

  const connectBtn = document.getElementById("owner-qbo-connect");

  if (!content) return;

  content.innerHTML = '<div class="loading">Loading QuickBooks status...</div>';

  if (statusEl) statusEl.textContent = "";

  try {

    const [summary, pending] = await Promise.all([

      fetchJson("/v1/owner/qbo/summary"),

      fetchJson("/v1/owner/qbo/pending"),

    ]);

    if (modeEl) {
      modeEl.textContent = summary.connected
        ? `QuickBooks: live mode${summary.realm_id ? " (" + summary.realm_id + ")" : ""}`
        : summary.configured
          ? "QuickBooks: live credentials set, connect to go live."
          : "QuickBooks: demo/stub mode until client_id/secret/redirect are set.";
    }

    const badge = summary.connected

      ? '<span class="status-badge success">Connected</span>'

      : '<span class="status-badge warning">Not connected</span>';

    if (badgeEl) {

      badgeEl.className = "status-badge " + (summary.connected ? "success" : summary.configured ? "warning" : "muted");

      badgeEl.textContent = summary.connected ? "Connected" : summary.configured ? "Ready to link" : "Stub mode";

    }

    if (connectBtn) {

      if (summary.connected) {

        connectBtn.disabled = true;

        connectBtn.textContent = "QuickBooks linked";

      } else if (!summary.configured) {

        connectBtn.disabled = true;

        connectBtn.textContent = "Configure QBO first";

      } else {

        connectBtn.disabled = false;

        connectBtn.textContent = "Link QuickBooks";

      }

    }

    const pendingItems = (pending.items || []).slice(0, 5);

    const pendingHtml =

      pendingItems.length > 0

        ? pendingItems

            .map(

              (item) => `

        <div class="usage-row">

          <div class="usage-cell strong">${escapeHtml(item.customer_name || "Customer")}</div>

          <div class="usage-cell">${escapeHtml(item.service_type || "Service")} - ${escapeHtml(item.quote_status || "pending")}</div>

          <div class="usage-cell">$${formatNumber(item.quoted_value || 0)}</div>

        </div>

      `

            )

            .join("")

        : '<div class="muted">No pending approvals.</div>';

    content.innerHTML = `

      <div class="info-grid">

        <div>

          <div class="info-label">Status</div>

          <div class="info-value">${badge}</div>

          <div class="info-sub">${summary.connected ? "Realm: " + escapeHtml(summary.realm_id || "unknown") : "Not linked"}</div>

        </div>

        <div>

          <div class="info-label">Pending approvals</div>

          <div class="info-value">${formatNumber(summary.pending_count || 0)}</div>

          <div class="info-sub">Items waiting to sync to QuickBooks</div>

        </div>

      </div>

      <div style="margin-top: 0.75rem;">

        <div class="info-label">Pending items (latest)</div>

        ${pendingHtml}

      </div>

    `;

    if (statusEl) {

      statusEl.textContent = summary.connected

        ? `Connected to QuickBooks${summary.realm_id ? " (" + summary.realm_id + ")" : ""}`

        : "Not connected to QuickBooks yet.";

    }

  } catch (err) {

    content.innerHTML = `<div class="error">Unable to load QuickBooks status.</div>`;

    if (statusEl) statusEl.textContent = err.message || "Error loading QuickBooks status.";

    if (badgeEl) {

      badgeEl.className = "status-badge warning";

      badgeEl.textContent = "Status unknown";

    }

    if (connectBtn) {

      connectBtn.disabled = false;

      connectBtn.textContent = "Link QuickBooks";

    }

  }

}



async function notifyOwnerQbo() {

  const statusEl = document.getElementById("owner-qbo-status");

  if (statusEl) statusEl.textContent = "Sending QBO notification...";

  try {

    const res = await fetch(backendBase + "/v1/owner/qbo/notify", {

      method: "POST",

      headers: { ...authHeaders(), "Content-Type": "application/json" },

      body: JSON.stringify({ send_sms: true, send_email: false }),

    });

    const data = await res.json();

    if (!res.ok) {

      throw new Error(data.detail || "Notify failed");

    }

    if (statusEl) statusEl.textContent = "Notification sent to owner.";

  } catch (err) {

    if (statusEl) statusEl.textContent = "Unable to notify: " + (err.message || err);

  }

}



async function connectOwnerQbo() {

  const statusEl = document.getElementById("owner-qbo-status");
  const connectBtn = document.getElementById("owner-qbo-connect");
  const modeEl = document.getElementById("owner-qbo-mode");

  if (statusEl) statusEl.textContent = "Opening QuickBooks authorization...";
  if (connectBtn) connectBtn.disabled = true;

  try {

    const data = await fetchJson("/v1/integrations/qbo/authorize");

    if (data && data.authorization_url) {

      window.open(data.authorization_url, "_blank");

      if (statusEl) statusEl.textContent = "Complete QuickBooks OAuth in the new tab, then refresh.";

    } else {

      if (statusEl) statusEl.textContent = "Authorization URL not available.";
      if (modeEl) modeEl.textContent = "QuickBooks: demo/stub mode (missing client_id/secret/redirect).";

    }

  } catch (err) {

    console.error(err);
    if (statusEl) {
      statusEl.textContent =
        err?.detail ||
        err?.message ||
        "QuickBooks is not configured for this environment. Set QBO client id/secret/redirect to enable live mode.";
    }

  } finally {

    if (connectBtn) connectBtn.disabled = false;
  }

}



async function loadTodaySummary() {

  const el = document.getElementById("today-summary-content");

  if (!el) return;

  el.innerHTML = `<div class="loading">${t("today_loading")}</div>`;

  

  try {

    const data = await fetchJson("/v1/owner/summary/today");

    const total = data?.total_appointments ?? 0;

    const emergency = data?.emergency_appointments ?? 0;

    const standard = data?.standard_appointments ?? 0;



    el.innerHTML = `

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("today_total"))}</span>

        <span class="metric-value">${escapeHtml(total)}</span>

      </div>

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("today_emergency"))}</span>

        <span class="metric-value" style="color: #ef4444;">${escapeHtml(emergency)}</span>

      </div>

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("today_standard"))}</span>

        <span class="metric-value">${escapeHtml(standard)}</span>

      </div>

    `;

  } catch (err) {

    el.innerHTML = `<div class="empty-state">${t("today_unable")}</div>`;

  }

}



async function loadSchedule() {

  const summaryEl = document.getElementById("schedule-summary");

  const listEl = document.getElementById("schedule-list");

  if (!summaryEl || !listEl) return;

  

  summaryEl.textContent = t("schedule_loading");

  listEl.innerHTML = "";

  

  try {

    const data = await fetchJson("/v1/owner/schedule/tomorrow");

    const appointments = Array.isArray(data?.appointments) ? data.appointments : [];

    updateRefreshed("schedule-updated");



    summaryEl.textContent = data?.reply_text || formatTemplate(t("schedule_fallback"), { count: appointments.length });

    setDataSourceStatus(

      "data-pill-calendar",

      appointments.length ? "ok" : "warn",

      appointments.length ? `Calendar in sync . ${appointments.length} booking(s)` : "No upcoming bookings found"

    );



    if (!appointments.length) {

      listEl.innerHTML = `<div class="empty-state">${t("schedule_empty")}</div>`;

      return;

    }



    listEl.innerHTML = appointments.map(apt => {

      const start = apt.start_time ? new Date(apt.start_time) : null;

      const timeLabel = start && !isNaN(start.getTime())

        ? start.toLocaleTimeString(locale || undefined, { hour: "numeric", minute: "2-digit" })

        : "";

      const tag = apt.is_emergency ? "emergency" : "normal";

      const tagText = apt.is_emergency ? t("tag_emergency") : t("tag_normal");

      return `

        <div class="metric-row">

          <div>

            <div style="font-weight: 600;">${escapeHtml(apt.customer_name || t("conversations_unknown_customer"))}</div>

            <div style="font-size: 0.875rem; color: #64748b;">${escapeHtml(timeLabel)}</div>

          </div>

          <span class="tag tag-${tag}">${escapeHtml(tagText)}</span>

        </div>

      `;

    }).join("");

  } catch (err) {

    summaryEl.textContent = t("schedule_unable");

    setDataSourceStatus("data-pill-calendar", "error", "Calendar unavailable");

    updateRefreshed("schedule-updated", true);

  }

}



async function loadEmergencyJobs() {

  const el = document.getElementById("emergency-content");

  if (!el) return;

  el.innerHTML = `<div class="loading">${t("emergencies_loading")}</div>`;

  

  try {

    const [today, week, month] = await Promise.all([

      fetchJson("/v1/owner/service-mix?days=1"),

      fetchJson("/v1/owner/service-mix?days=7"),

      fetchJson("/v1/owner/service-mix?days=30"),

    ]);



    const todayEmerg = today?.emergency_appointments_30d ?? 0;

    const weekEmerg = week?.emergency_appointments_30d ?? 0;

    const monthEmerg = month?.emergency_appointments_30d ?? 0;



    el.innerHTML = `

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("emergencies_today"))}</span>

        <span class="metric-value">${escapeHtml(todayEmerg)}</span>

      </div>

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("emergencies_last7"))}</span>

        <span class="metric-value">${escapeHtml(weekEmerg)}</span>

      </div>

      <div class="metric-row">

        <span class="metric-label">${escapeHtml(t("emergencies_last30"))}</span>

        <span class="metric-value">${escapeHtml(monthEmerg)}</span>

      </div>

    `;

  } catch (err) {

    el.innerHTML = `<div class="empty-state">${t("emergencies_unable")}</div>`;

  }

}



async function loadAnalytics() {

  const el = document.getElementById("analytics-content");

  if (!el) return;

  el.innerHTML = `<div class="loading">${t("analytics_loading")}</div>`;



  try {

    const [mix, customers, funnel] = await Promise.all([

      fetchJson("/v1/owner/service-mix?days=30"),

      fetchJson("/v1/owner/customers/analytics?days=365"),

      fetchJson("/v1/owner/conversion-funnel?days=90"),

    ]);



    const total30 = mix?.total_appointments_30d ?? 0;

    const emergency30 = mix?.emergency_appointments_30d ?? 0;

    const emergencyShare = total30 > 0 ? emergency30 / total30 : 0;



    const repeatShare = customers?.economics?.repeat_customer_share ?? 0;

    const convRate = funnel?.overall_conversion_rate ?? 0;



    el.innerHTML = `

      <div class="feature-grid">

        <div class="feature-item">

          <div class="feature-icon">

            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

              <path fill="white" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>

            </svg>

          </div>

          <div>

            <div style="font-weight: 600;">${escapeHtml(total30)}</div>

            <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(t("analytics_total"))}</div>

          </div>

        </div>

        <div class="feature-item">

          <div class="feature-icon">

            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

              <path fill="white" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>

            </svg>

          </div>

          <div>

            <div style="font-weight: 600;">${escapeHtml(formatPercent(emergencyShare))}</div>

            <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(t("analytics_emergency_share"))}</div>

          </div>

        </div>

        <div class="feature-item">

          <div class="feature-icon">

            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

              <path fill="white" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 15l-4-4 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>

            </svg>

          </div>

          <div>

            <div style="font-weight: 600;">${escapeHtml(formatPercent(repeatShare))}</div>

            <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(t("analytics_repeat_share"))}</div>

          </div>

        </div>

        <div class="feature-item">

          <div class="feature-icon">

            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

              <path fill="white" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 15l-4-4 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>

            </svg>

          </div>

          <div>

            <div style="font-weight: 600;">${escapeHtml(formatPercent(convRate))}</div>

            <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(t("analytics_conversion"))}</div>

          </div>

        </div>

      </div>

    `;

  } catch (err) {

    el.innerHTML = `<div class="empty-state">${t("analytics_unable")}</div>`;

  }

}



  

async function loadZipWealth() {

  const el = document.getElementById("zip-wealth-content");

  if (!el) return;

  if (!featureEnabledForTier("100")) {

    el.innerHTML = `<div class="empty-state">${t("zip_locked")}</div>`;

    return;

  }

  el.innerHTML = `<div class="loading">${t("zip_loading")}</div>`;

  try {

    const data = await fetchJson("/v1/owner/neighborhoods?days=365");

    const items = Array.isArray(data?.items) ? data.items : [];

    if (!items.length) {

      el.innerHTML = `<div class="empty-state">${t("zip_empty")}</div>`;

      return;

    }

    const rows = items

      .filter(item => typeof item.label === "string" && item.label.length > 0)

      .map(item => {

        const zip = String(item.label);

        const value = Number(item.estimated_value_total || 0);

        const income = item.median_household_income;

        let band = t("zip_unknown");

        let color = "#e2e8f0";

        if (typeof income === "number") {

          if (income < 50000) {

            band = t("zip_band_low");

            color = "#bfdbfe";

          } else if (income < 80000) {

            band = t("zip_band_mid");

            color = "#fed7aa";

          } else {

            band = t("zip_band_high");

            color = "#bbf7d0";

          }

        }

        return { zip, value, income, band, color, appointments: item.appointments || 0 };

      })

      .sort((a, b) => b.value - a.value);



    el.innerHTML = `

      <div class="kpi-grid">

        ${rows.map(row => `

          <div class="metric-row" style="background: ${row.color}; border-radius: 12px; padding: 0.75rem 0.9rem;">

            <div style="display: flex; justify-content: space-between; align-items: center;">

              <div>

                <div style="font-weight: 600;">ZIP ${escapeHtml(row.zip)}</div>

                <div style="font-size: 0.75rem; color: #475569;">

                  ${escapeHtml(formatTemplate(t("zip_jobs_value"), { jobs: row.appointments, value: formatCurrency(row.value) }))}

                </div>

              </div>

              <div style="text-align: right;">

                <div style="font-size: 0.8rem; font-weight: 600;">

                  ${row.income ? "$" + formatCurrency(row.income) : escapeHtml(t("zip_no_income"))}

                </div>

                <div style="font-size: 0.75rem; color: #475569;">${row.band}</div>

              </div>

            </div>

          </div>

        `).join("")}

      </div>

    `;

  } catch (err) {

    console.error("Error loading ZIP wealth data", err);

    el.innerHTML = `<div class="empty-state">${t("zip_unable")}</div>`;

  }

}



function ensureGeoCard() {

  const grid = document.querySelector(".dashboard-grid");

  if (!grid) return;

  if (document.getElementById("geo-map-card")) return;

  const card = document.createElement("div");

  card.className = "card";

  card.id = "geo-map-card";

  card.innerHTML = `

    <div class="card-header">

      <div class="card-icon">

        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>

        </svg>

      </div>

      <h2 data-i18n="service_map_title">Service Map (last 30 days)</h2>

      <button id="refresh-geo-map" type="button" class="secondary" data-i18n="refresh">Refresh</button>

    </div>

    <div id="geo-map" class="map-container"></div>

    <div id="geo-map-status" style="margin-top:0.5rem; font-size:0.85rem; color:#64748b;"></div>

  `;

  grid.prepend(card);

}



async function loadGeoMarkers() {

  ensureGeoCard();

  const statusEl = document.getElementById("geo-map-status");

  const mapEl = document.getElementById("geo-map");

  if (!mapEl) return;

  if (statusEl) statusEl.textContent = t("map_loading");

  try {

    const data = await fetchJson("/v1/owner/geo/markers?days=30");

    const markers = Array.isArray(data?.markers) ? data.markers : [];

    if (!geoMap) {

      geoMap = L.map("geo-map").setView([39.0997, -94.5786], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {

        attribution: "&copy; OpenStreetMap contributors",

      }).addTo(geoMap);

      geoLayer = L.layerGroup().addTo(geoMap);

    }

    geoLayer.clearLayers();

    if (!markers.length) {

      if (statusEl) statusEl.textContent = t("map_empty");

      return;

    }

    markers.forEach((m) => {

      const color = m.is_emergency ? "#ef4444" : "#3b82f6";

      const circle = L.circleMarker([m.lat, m.lng], {

        radius: m.is_emergency ? 8 : 6,

        color,

        fillColor: color,

        fillOpacity: 0.7,

      }).addTo(geoLayer);

      circle.bindPopup(`

        <strong>${escapeHtml(m.label || t("map_unknown_area"))}</strong><br/>

        ${escapeHtml(m.address || "")}<br/>

        ${escapeHtml(m.service_type || t("map_service"))} ${m.is_emergency ? t("map_emergency") : ""}

      `);

    });

    geoMap.fitBounds(geoLayer.getBounds(), { maxZoom: 13 });

    if (statusEl) statusEl.textContent = formatTemplate(t("map_locations"), { count: markers.length });

  } catch (err) {

    console.error("Error loading geo markers", err);

    if (statusEl) statusEl.textContent = t("map_unable");

  }

}



async function loadSpeechHealth() {

  const detailEl = document.getElementById("speech-health-note");

  if (detailEl) detailEl.textContent = "Checking speech providers...";

  try {

    const data = await fetchJson("/v1/admin/speech/health");

    const provider = (data?.provider || "speech").toString();

    const healthy = !!data?.healthy;

    const circuitOpen = !!data?.circuit_open;

    const usedFallback = !!data?.used_fallback;

    const reason = (data?.reason || data?.detail || "").toString();

    let summary = healthy ? `Healthy via ${provider}` : `Degraded via ${provider}`;

    let state = healthy ? "ok" : "error";

    if (circuitOpen) {

      state = "warn";

      summary = `Circuit open on ${provider}`;

    } else if (usedFallback && healthy) {

      summary = `Healthy (fallback active)`;

    } else if (!healthy && reason) {

      summary = `Degraded: ${reason}`;

    }

    setDataSourceStatus("data-pill-speech", state, summary);

    if (detailEl) {

      const detail = (data?.last_error || data?.detail || data?.reason || "").toString();

      detailEl.textContent = detail || (usedFallback ? "Using fallback speech provider" : "");

    }

  } catch (err) {

    console.error("speech health load failed", err);

    setDataSourceStatus("data-pill-speech", "error", "Speech health unavailable");

    if (detailEl) detailEl.textContent = "Unable to load speech health.";

  }

}



function refreshAllData() {

  loadOwnerKpis();

  loadSpeechHealth();

  loadOwnerQbo();

  loadTodaySummary();

  loadSchedule();

  loadEmergencyJobs();

  loadAnalytics();

  loadZipWealth();

  loadCalendar90d();

  loadServiceMetrics();

  loadGeoMarkers();

  loadConversations();

  loadInvites();

  loadAuditLog();

  loadCallbacks();

}



async function loadServiceMetrics() {

  const el = document.getElementById("service-metrics-content");

  if (!el) return;

  if (!featureEnabledForTier("100")) {

    el.innerHTML = `<div class="empty-state">${t("service_metrics_locked")}</div>`;

      return;

    }

    el.innerHTML = `<div class="loading">${t("service_metrics_loading")}</div>`;

  try {

    const data = await fetchJson("/v1/owner/service-metrics?days=90");

    const items = Array.isArray(data?.items) ? data.items : [];

    updateRefreshed("service-metrics-updated");

    if (!items.length) {

      el.innerHTML = `<div class="empty-state">${t("service_metrics_empty")}</div>`;

      return;

    }

    const rows = items.map(item => {

      const svc = item.service_type || t("service_metrics_unspecified");

      const jobs = item.appointments || 0;

      const totalValue = item.estimated_value_total || 0;

      const avgValue = item.estimated_value_average || 0;

      const minDur = item.scheduled_minutes_min;

      const maxDur = item.scheduled_minutes_max;

      const avgDur = item.scheduled_minutes_average;

      return {

        svc,

        jobs,

        totalValue,

        avgValue,

        minDur,

        maxDur,

        avgDur,

      };

    }).sort((a, b) => b.totalValue - a.totalValue);



    el.innerHTML = `

      <div class="kpi-grid">

        ${rows.map(row => `

          <div class="metric-row">

            <div>

              <div style="font-weight: 600;">${escapeHtml(row.svc)}</div>

              <div style="font-size: 0.75rem; color: #64748b;">

                ${escapeHtml(formatTemplate(t("service_metrics_jobs_price"), { jobs: row.jobs, price: formatCurrency(row.avgValue) }))}

              </div>

            </div>

            <div style="text-align: right; font-size: 0.75rem; color: #475569;">

              <div>${escapeHtml(t("service_metrics_avg_time"))}: ${formatMinutes(row.avgDur)}</div>

              <div>${escapeHtml(t("service_metrics_range"))}: ${formatMinutes(row.minDur)} to ${formatMinutes(row.maxDur)}</div>

          </div>

        </div>

      `).join("")}

      </div>

    `;

  } catch (err) {

      console.error("Error loading service metrics", err);

      el.innerHTML = `<div class="empty-state">${t("service_metrics_unable")}</div>`;

      updateRefreshed("service-metrics-updated", true);

    }

  }



  async function loadCalendar90d() {

    const container = document.getElementById("calendar-90d-content");

    if (!container) return;

    if (!featureEnabledForTier("100")) {

      container.innerHTML = `<div class="empty-state">${t("calendar_locked")}</div>`;

      return;

    }

    container.innerHTML = `<div class="loading">${t("calendar_loading")}</div>`;



    try {

      const data = await fetchJson("/v1/owner/calendar/90d");

      calendar90dData = data;

      const days = Array.isArray(data?.days) ? data.days : [];

      if (!days.length) {

        container.innerHTML = `<div class="empty-state">${t("calendar_empty")}</div>`;

        return;

      }



      const gridHtml = `

        <div class="calendar-grid">

          ${days.map(day => {

            const date = day.date;

            const total = day.total_appointments || 0;

            const tags = day.tag_counts || {};

            const emergency = tags.emergency || tags["emergency"] || 0;

            const maintenance = tags.maintenance || tags["maintenance"] || 0;

            const newClients = tags.new_client || tags["new_client"] || 0;

            const routine = tags.routine || tags["routine"] || 0;

            const classes = ["calendar-day"];

            if (emergency > 0) classes.push("calendar-day-emergency");

            else if (newClients > 0) classes.push("calendar-day-new-client");

            else if (maintenance > 0) classes.push("calendar-day-maintenance");

            else if (routine > 0) classes.push("calendar-day-routine");

            const label = typeof date === "string" ? date.slice(5) : "";

            const title = total === 1

              ? t("calendar_jobs_single")

              : formatTemplate(t("calendar_jobs_plural"), { count: total });

            return `

              <button

                type="button"

                class="${classes.join(" ")}"

                data-calendar-date="${escapeHtml(date)}"

                title="${escapeHtml(title)}"

              >

                <div class="calendar-day-date">${escapeHtml(label)}</div>

                <div class="calendar-day-total">${escapeHtml(total)}</div>

              </button>

            `;

          }).join("")}

        </div>

      `;

      container.innerHTML = gridHtml;



      const buttons = container.querySelectorAll("[data-calendar-date]");

      buttons.forEach((btn) => {

        btn.addEventListener("click", () => {

          const dateStr = btn.getAttribute("data-calendar-date");

          if (dateStr) {

            openCalendarModal(dateStr);

          }

        });

      });

    } catch (err) {

      console.error("Error loading 90-day calendar", err);

      container.innerHTML = `<div class="empty-state">${t("calendar_unable")}</div>`;

    }

  }



  let calendarModalReturnFocus = null;

  function openCalendarModal(dateStr) {

    const modal = document.getElementById("calendar-report-modal");

    const body = document.getElementById("calendar-modal-body");

    const titleEl = document.getElementById("calendar-modal-title");

    if (!modal || !body || !titleEl || !calendar90dData) return;



    const days = Array.isArray(calendar90dData.days) ? calendar90dData.days : [];

    const day = days.find((d) => d.date === dateStr);



    titleEl.textContent = `${t("calendar_modal_title_prefix")} ${dateStr}`;



    if (!day) {

      body.innerHTML = `<div class="empty-state">${t("calendar_modal_empty")}</div>`;

    } else {

      const tags = day.tag_counts || {};

      const services = day.service_type_counts || {};

      const total = day.total_appointments || 0;

      const newCustomers = day.new_customers || 0;

      const estTotal = day.estimated_value_total || 0;

      const estAvg = day.estimated_value_average;



      const tagRows = Object.keys(tags)

        .sort()

        .map((tag) => {

          const count = tags[tag] ?? 0;

          return `

            <tr>

              <td style="padding: 0.1rem 0.5rem;">${escapeHtml(tag)}</td>

              <td style="padding: 0.1rem 0.5rem; text-align: right;">${escapeHtml(count)}</td>

            </tr>

          `;

        })

        .join("");



      const svcRows = Object.keys(services)

        .sort()

        .map((svc) => {

          const count = services[svc] ?? 0;

          return `

            <tr>

              <td style="padding: 0.1rem 0.5rem;">${escapeHtml(svc)}</td>

              <td style="padding: 0.1rem 0.5rem; text-align: right;">${escapeHtml(count)}</td>

            </tr>

          `;

        })

        .join("");



      const overviewLine = (() => {

        const base = `${t("calendar_modal_total_jobs")}: ${escapeHtml(total)} | ${t("calendar_modal_new_customers")}: ${escapeHtml(newCustomers)} | ${t("calendar_modal_est_value")}: $${formatCurrency(estTotal)}`;

        if (estAvg !== null && estAvg !== undefined && !isNaN(estAvg)) {

          return `${base} (${t("calendar_modal_avg_label")}: $${formatCurrency(estAvg)})`;

        }

        return base;

      })();



      body.innerHTML = `

        <div style="margin-bottom: 0.75rem;">

          <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(t("calendar_modal_overview"))}</div>

          <div style="font-size: 0.8rem; color: #4b5563;">

            ${overviewLine}

          </div>

        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem;">

          <div>

            <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 0.25rem;">${escapeHtml(t("calendar_modal_by_tag"))}</div>

            ${

              tagRows

                ? `<table style="width: 100%; font-size: 0.8rem;">${tagRows}</table>`

                : `<div class="empty-state" style="padding: 0.5rem 0; font-size: 0.8rem;">${escapeHtml(t("calendar_modal_no_tag"))}</div>`

            }

          </div>

          <div>

            <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 0.25rem;">${escapeHtml(t("calendar_modal_by_service"))}</div>

            ${

              svcRows

                ? `<table style="width: 100%; font-size: 0.8rem;">${svcRows}</table>`

                : `<div class="empty-state" style="padding: 0.5rem 0; font-size: 0.8rem;">${escapeHtml(t("calendar_modal_no_service"))}</div>`

            }

          </div>

        </div>

      `;

    }



    modal.dataset.date = dateStr;

    modal.style.display = "flex";

    modal.setAttribute("aria-hidden", "false");
    calendarModalReturnFocus = document.activeElement;
    document.getElementById("calendar-modal-close")?.focus();

  }



  function closeCalendarModal() {

    const modal = document.getElementById("calendar-report-modal");

    if (!modal) return;

    modal.style.display = "none";

    modal.setAttribute("aria-hidden", "true");

    delete modal.dataset.date;
    if (calendarModalReturnFocus && calendarModalReturnFocus.focus) {
      calendarModalReturnFocus.focus();
    }
    calendarModalReturnFocus = null;

  }



  function initCalendarModal() {

    const closeButton = document.getElementById("calendar-modal-close");

    const dismissButton = document.getElementById("calendar-modal-dismiss");

    const downloadButton = document.getElementById("calendar-modal-download");

    const modal = document.getElementById("calendar-report-modal");



    closeButton?.addEventListener("click", closeCalendarModal);

    dismissButton?.addEventListener("click", closeCalendarModal);



    if (modal) {

      modal.addEventListener("click", (evt) => {

        if (evt.target === modal) {

          closeCalendarModal();

        }

      });

      modal.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape") {
          evt.preventDefault();
          closeCalendarModal();
          return;
        }
        if (evt.key !== "Tab") {
          return;
        }
        const focusRoot = modal.querySelector(".modal") || modal;
        const focusable = Array.from(
          focusRoot.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (evt.shiftKey && document.activeElement === first) {
          evt.preventDefault();
          last.focus();
        } else if (!evt.shiftKey && document.activeElement === last) {
          evt.preventDefault();
          first.focus();
        }
      });

    }



    downloadButton?.addEventListener("click", () => {

      if (!modal) return;

      const dateStr = modal.dataset.date;

      if (!dateStr) return;

      const url = `${backendBase}/v1/owner/calendar/report.pdf?day=${encodeURIComponent(dateStr)}`;

      window.open(url, "_blank");

    });

  }

async function loadConversations() {

  const listEl = document.getElementById("conversations-list");

  const detailEl = document.getElementById("conversation-detail");

  if (!listEl) return;

  listEl.innerHTML = `<div class="loading">${t("conversations_loading")}</div>`;

  if (detailEl) detailEl.innerHTML = "";



  try {

    const data = await fetchJson("/v1/owner/conversations/review");

    const items = Array.isArray(data?.items) ? data.items : [];

    updateRefreshed("conversations-updated");

    conversationItems = items;

    applyConversationFilters();

  } catch (err) {

    listEl.innerHTML = `<div class="empty-state">${t("conversations_unable")}</div>`;

    if (detailEl) detailEl.innerHTML = "";

    updateRefreshed("conversations-updated", true);

  }

}



function renderConversationList(list) {

  const listEl = document.getElementById("conversations-list");

  const detailEl = document.getElementById("conversation-detail");

  const countEl = document.getElementById("conversations-count");

  if (!listEl) return;



  if (!list || !list.length) {

    listEl.innerHTML = `<div class="empty-state">${t("conversations_empty")}</div>`;

    if (countEl) countEl.textContent = "Showing 0";

    if (detailEl) detailEl.innerHTML = "";

    return;

  }



  listEl.innerHTML = list.map(conv => `

    <button type="button" class="metric-row metric-row-interactive" data-conversation-id="${escapeHtml(conv.id)}">

      <div>

        <div style="font-weight: 600;">${escapeHtml(conv.customer_name || t("conversations_unknown_customer"))}</div>

        <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap; margin-top: 0.2rem;">

          <span class="pill-badge ${escapeHtml(String(conv.channel || "").toLowerCase())}">

            ${escapeHtml(String(conv.channel || "").toUpperCase() || "N/A")}

          </span>

          ${renderOutcomeBadge(conv.outcome)}

        </div>

      </div>

    </button>

  `).join("");



  if (countEl) countEl.textContent = `Showing ${list.length} of ${conversationItems.length}`;



  listEl.querySelectorAll(".metric-row").forEach(row => {

    row.addEventListener("click", () => {

      if (!detailEl) return;

      const id = row.getAttribute("data-conversation-id") || "";

      const conv = conversationItems.find(c => c.id === id);

      if (!conv) return;

      const created = conv.created_at ? new Date(conv.created_at) : null;

      const createdLabel = created && !isNaN(created.getTime())

        ? created.toLocaleString(locale || undefined)

        : "";

      detailEl.innerHTML = `

        <div style="padding-top: 1rem; border-top: 1px solid #f1f5f9;">

          <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(conv.customer_name || t("conversations_unknown_customer"))}</div>

          <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom: 0.25rem;">

            <span class="pill-badge ${escapeHtml(String(conv.channel || "").toLowerCase())}">

              ${escapeHtml(String(conv.channel || "").toUpperCase() || "N/A")}

            </span>

            ${renderOutcomeBadge(conv.outcome)}

          </div>

          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">

            ${escapeHtml(t("conversations_created"))}: ${escapeHtml(createdLabel)}

          </div>

          <div style="font-size: 0.875rem; color: #4b5563;">${escapeHtml(conv.outcome || "")}</div>

        </div>

      `;

    });

  });

}



function applyConversationFilters() {

  const text = (document.getElementById("conversations-filter")?.value || "").toLowerCase();

  const channel = (document.getElementById("conversations-channel-filter")?.value || "").toLowerCase();

  const sort = (document.getElementById("conversations-sort")?.value || "newest").toLowerCase();

  let list = conversationItems || [];

  if (channel) {

    list = list.filter((c) => (c.channel || "").toLowerCase() === channel);

  }

  if (text) {

    list = list.filter((c) => {

      const combined = `${c.customer_name || ""} ${c.outcome || ""}`.toLowerCase();

      return combined.includes(text);

    });

  }

  list = list.slice().sort((a, b) => {

    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;

    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;

    return sort === "oldest" ? aDate - bDate : bDate - aDate;

  });

  renderConversationList(list);
  renderConversationSummary(list);

}



function appendAssistantMessage(role, text) {

  const container = document.getElementById("owner-assistant-messages");

  if (!container) return null;

  const div = document.createElement("div");

  div.className = "assistant-message";

  if (role === "user") {

    div.classList.add("assistant-message-user");

  } else if (role === "assistant") {

    div.classList.add("assistant-message-assistant");

  } else {

    div.classList.add("assistant-message-system");

  }

  div.textContent = text;

  container.appendChild(div);

  container.scrollTop = container.scrollHeight;

  return div;

}



async function askOwnerAssistant(question) {

  const statusEl = document.getElementById("owner-assistant-status");

  if (!question || !question.trim()) return null;

  if (ownerAssistantBusy) return null;

  if (!featureEnabledForTier("100")) {

    if (statusEl) {

      statusEl.textContent = t("assistant_limited");

    }

  }

  ownerAssistantBusy = true;

  if (statusEl) statusEl.textContent = t("assistant_thinking");



  let assistantDiv = appendAssistantMessage("assistant", "");

  try {

    const res = await fetch(`${backendBase}/v1/chat/stream`, {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        Accept: "text/event-stream",

        ...authHeaders(),

      },

      body: JSON.stringify({

        text: question,

        conversation_id: ownerAssistantConversationId,

      }),

    });

    if (!res.ok || !res.body) {

      const msg = `Error ${res.status}`;

      if (statusEl) statusEl.textContent = msg;

      return null;

    }



    const reader = res.body.getReader();

    const decoder = new TextDecoder();

    let buffer = "";



    function handleEventBlock(block) {

      let event = "message";

      const dataLines = [];

      for (const line of block.split("\n")) {

        if (line.startsWith("event:")) {

          event = line.slice(6).trim();

        } else if (line.startsWith("data:")) {

          dataLines.push(line.slice(5).trim());

        }

      }

      const data = dataLines.join("\n");

      if (event === "meta") {

        try {

          const meta = JSON.parse(data);

          if (meta.conversation_id) {

            ownerAssistantConversationId = meta.conversation_id;

          }

        } catch (e) {

          // ignore parse errors

        }

        return false;

      }

      if (event === "done") {

        return true;

      }

      if (assistantDiv && data) {

        const spacer = assistantDiv.textContent ? " " : "";

        assistantDiv.textContent = `${assistantDiv.textContent || ""}${spacer}${data}`;

      }

      return false;

    }



    let done = false;

    while (!done) {

      const { value, done: readerDone } = await reader.read();

      if (readerDone) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;

      while ((idx = buffer.indexOf("\n\n")) !== -1) {

        const block = buffer.slice(0, idx);

        buffer = buffer.slice(idx + 2);

        const stop = handleEventBlock(block);

        if (stop) {

          done = true;

          break;

        }

      }

    }

    if (statusEl) statusEl.textContent = "";

    return true;

  } catch (err) {

    console.error("Error calling owner assistant", err);

    if (statusEl) statusEl.textContent = t("assistant_unreachable");

    if (assistantDiv) assistantDiv.textContent = t("assistant_unavailable");

    return null;

  } finally {

    ownerAssistantBusy = false;

  }

}



function initOwnerAssistant() {

  const toggle = document.getElementById("owner-assistant-toggle");

  const panel = document.getElementById("owner-assistant-panel");

  const closeBtn = document.getElementById("owner-assistant-close");

  const form = document.getElementById("owner-assistant-form");

  const input = document.getElementById("owner-assistant-input");



  if (!toggle || !panel || !form || !input) {

    return;

  }



  // If the tenant is on Starter tier, keep the UI visible but

  // remind them this assistant is a Growth feature when they open it.

  const isGrowthOrHigher = featureEnabledForTier("100");



  function setOpen(open) {

    ownerAssistantOpen = open;

    panel.style.display = open ? "flex" : "none";

    panel.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");

    if (open) {

      input.focus();

    } else {
      toggle.focus();
    }

  }



  toggle.addEventListener("click", () => {

    if (!isGrowthOrHigher) {

      const status = document.getElementById("owner-assistant-status");

      if (status) {

        status.textContent = t("assistant_poc_notice");

        status.className = "assistant-status";

      }

    }

    setOpen(!ownerAssistantOpen);

  });



  closeBtn?.addEventListener("click", () => {

    setOpen(false);

  });

  panel.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      evt.preventDefault();
      setOpen(false);
    }
  });



  form.addEventListener("submit", async (evt) => {

    evt.preventDefault();

    const question = (input.value || "").trim();

    if (!question) return;

    appendAssistantMessage("user", question);

    input.value = "";

    await askOwnerAssistant(question);

  });

}



async function loadOwnerOnboardingProfile() {

  try {

    const data = await fetchJson("/v1/owner/onboarding/profile");

    ownerServiceTier = data && typeof data.service_tier === "string" ? data.service_tier : null;

    if (typeof data?.owner_email_alerts_enabled === "boolean") {
      emailAlertsEnabled = data.owner_email_alerts_enabled;
      localStorage.setItem("owner_email_alerts", emailAlertsEnabled ? "true" : "false");
      const toggle = document.getElementById("email-alerts-toggle");
      if (toggle) toggle.checked = emailAlertsEnabled;
    }

    const labelEl = document.getElementById("owner-plan-label");

    if (labelEl) {

      const label = tierCodeToLabel(ownerServiceTier);

      labelEl.textContent = formatTemplate(t("plan_label"), { plan: label });

      labelEl.style.display = "inline-flex";

    }

    renderIntegrationStatuses(data?.integrations || []);

  } catch (err) {

    renderIntegrationStatuses([]);

    // On failure, keep tier unset and let features load as default.

  }

}

async function saveEmailAlertsPreference(enabled) {
  try {
    const res = await authorizedFetch("/v1/owner/onboarding/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_email_alerts_enabled: !!enabled }),
    });
    if (!res.ok) {
      throw new Error(`Unable to save email alerts (${res.status})`);
    }
    emailAlertsEnabled = !!enabled;
    localStorage.setItem("owner_email_alerts", emailAlertsEnabled ? "true" : "false");
  } catch (err) {
    console.error(err);
    const toggle = document.getElementById("email-alerts-toggle");
    if (toggle) toggle.checked = emailAlertsEnabled;
    alert(err?.message || "Unable to update email alerts preference.");
  }
}



function initAuth() {

  const apiInput = document.getElementById("owner-api-key-input");

  const tokenInput = document.getElementById("owner-token-input");

  const businessInput = document.getElementById("business-id-input");

  const businessApply = document.getElementById("business-apply");

  const businessClear = document.getElementById("business-clear");

  const statusEl = document.getElementById("owner-auth-status");



  if (apiInput) {

    if (apiKey) apiInput.value = apiKey;

    apiInput.addEventListener("change", (e) => {

      apiKey = (e.target.value || "").trim();

      if (apiKey) {

        localStorage.setItem("owner_api_key", apiKey);

        if (statusEl) {

          statusEl.textContent = t("api_key_saved");

          statusEl.className = "success";

        }

      } else {

        localStorage.removeItem("owner_api_key");

        if (statusEl) {

          statusEl.textContent = t("api_key_cleared");

          statusEl.className = "muted";

        }

      }

    });

  }



  function persistBusinessId(nextId) {

    businessId = (nextId || "").trim();

    if (businessInput) businessInput.value = businessId;

    if (businessId) {

      localStorage.setItem("owner_business_id", businessId);

      localStorage.setItem("owner_active_business_id", businessId);

      if (statusEl) {

        statusEl.textContent = formatTemplate(t("business_set"), { id: businessId });

        statusEl.className = "success";

      }

    } else {

      localStorage.removeItem("owner_business_id");

      localStorage.removeItem("owner_active_business_id");

      if (statusEl) {

        statusEl.textContent = t("business_cleared");

        statusEl.className = "muted";

      }

    }

    updateUserUi();

  }



  if (businessInput) {

    if (businessId) businessInput.value = businessId;

    businessInput.addEventListener("change", (e) => {

      persistBusinessId(e.target.value);

    });

  }

  if (businessApply) {

    businessApply.addEventListener("click", () => {

      persistBusinessId(businessInput ? businessInput.value : businessId);

    });

  }

  if (businessClear) {

    businessClear.addEventListener("click", () => {

      persistBusinessId("");

    });

  }



  if (tokenInput) {

    if (ownerToken) tokenInput.value = ownerToken;

    tokenInput.addEventListener("change", (e) => {

      ownerToken = (e.target.value || "").trim();

      if (ownerToken) {

        localStorage.setItem("owner_owner_token", ownerToken);

        if (statusEl) {

          statusEl.textContent = t("owner_token_saved");

          statusEl.className = "success";

        }

      } else {

        localStorage.removeItem("owner_owner_token");

        if (statusEl) {

          statusEl.textContent = t("owner_token_cleared");

          statusEl.className = "muted";

        }

      }

    });

  }

}



function setThemeToggleLabel() {

  const themeToggle = document.getElementById("theme-toggle");

  if (!themeToggle) return;

  const isDark = document.body.classList.contains("dark");

  themeToggle.textContent = isDark ? t("theme_light") : t("theme_dark");

}



function initThemeToggle() {

  const themeToggle = document.getElementById("theme-toggle");

  const storedTheme = localStorage.getItem("owner_theme") || "light";

  if (storedTheme === "dark") {

    document.body.classList.add("dark");

  }

  if (themeToggle) {

    setThemeToggleLabel();

    themeToggle.addEventListener("click", () => {

      const isDark = document.body.classList.toggle("dark");

      localStorage.setItem("owner_theme", isDark ? "dark" : "light");

      setThemeToggleLabel();

    });

  }

}



function renderRecentInvites() {

  const list = document.getElementById("staff-invite-list");

  if (!list) return;

  if (!recentInvites.length) {

    list.textContent = hasOwnerPrivileges()

      ? "No invites sent yet."

      : "Staff invites require owner or admin.";

    return;

  }

  list.innerHTML = recentInvites

    .map(

      (invite) => `

        <div class="metric-row">

          <div>

            <div style="font-weight: 600;">${escapeHtml(invite.email)}</div>

            <div style="font-size: 0.75rem; color: #64748b;">${escapeHtml(invite.role)}</div>

            ${

              invite.invite_token

                ? `<div class="muted" style="font-size: 0.75rem; word-break: break-all;">Token: ${escapeHtml(invite.invite_token)}</div>`

                : ""

            }

          </div>

          <div class="pill ${invite.status === "accepted" ? "connected" : invite.status === "expired" ? "disconnected" : "muted"}" style="font-size: 0.7rem;">

            ${escapeHtml(invite.status || "pending")}

          </div>

          <div class="pill muted" style="font-size: 0.7rem;">

            ${invite.expires_at ? new Date(invite.expires_at).toLocaleString() : "no expiry"}

          </div>

        </div>`

    )

    .join("");

}



async function loadInvites() {

  const list = document.getElementById("staff-invite-list");

  if (list) {

    list.textContent = hasOwnerPrivileges()

      ? "Loading invites..."

      : "Staff invites require owner or admin.";

  }

  try {

    const res = await authorizedFetch("/v1/owner/invites");

    const data = await res.json();

    if (!res.ok) {

      throw new Error(data?.detail || `Unable to load invites (${res.status})`);

    }

    recentInvites = Array.isArray(data?.invites) ? data.invites : [];

    renderRecentInvites();

  } catch (err) {

    if (list) list.textContent = err?.message || "Unable to load invites.";

  }

}



function renderCallbacks(items = []) {

  const list = document.getElementById("callbacks-list");

  const count = document.getElementById("callbacks-count");

  if (!list) return;

  if (!items.length) {

    list.innerHTML = '<div class="muted">No callbacks yet.</div>';

    if (count) count.textContent = "Showing 0";

    return;

  }

  if (count) count.textContent = `Showing ${items.length} of ${callbackItems.length || items.length}`;

  const emailToggle = document.getElementById("email-alerts-toggle");
  if (emailToggle) {
    emailToggle.checked = emailAlertsEnabled;
  }

  list.innerHTML = items

    .map(

      (cb) => `

        <div class="metric-row" style="align-items: center; gap: 0.5rem;">

          <div>

            <div style="font-weight: 700;">${escapeHtml(cb.phone || "unknown")}</div>

            <div class="muted" style="font-size: 0.8rem;">

              ${escapeHtml(cb.reason || "callback")} | Seen ${cb.last_seen ? new Date(cb.last_seen).toLocaleString() : "n/a"}

            </div>

            ${

              cb.voicemail_url

                ? `<a href="${escapeHtml(cb.voicemail_url)}" target="_blank" class="pill-badge warn">Voicemail</a>`

                : ""

            }

          </div>

          ${renderCallbackStatus(cb.status)}

          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            <button class="ghost-button" data-callback-phone="${escapeHtml(cb.phone)}">Mark resolved</button>
            <button class="ghost-button" data-copy-phone="${escapeHtml(cb.phone)}">Copy</button>
          </div>

        </div>

      `

    )

    .join("");

  list.querySelectorAll("[data-callback-phone]").forEach((btn) => {

    btn.addEventListener("click", async (e) => {

      const phone = e.target.getAttribute("data-callback-phone");

      try {

        const res = await authorizedFetch(`/v1/owner/callbacks/${encodeURIComponent(phone)}`, {

          method: "PATCH",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ status: "RESOLVED", last_result: "Handled" }),

        });

        if (!res.ok) {

          throw new Error("Update failed");

        }

        loadCallbacks();

      } catch (err) {

        console.error("Unable to update callback", err);

      }

    });

  });

  list.querySelectorAll("[data-copy-phone]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const phone = btn.getAttribute("data-copy-phone") || "";
      try {
        await navigator.clipboard.writeText(phone);
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.textContent = "Copy";
        }, 1200);
      } catch (err) {
        console.error("Clipboard failed", err);
      }
    });
  });

}



async function loadCallbacks() {

  const list = document.getElementById("callbacks-list");

  if (list) list.innerHTML = '<div class="loading">Loading callbacks...</div>';

  try {

    const res = await authorizedFetch("/v1/owner/callbacks");

    const data = await res.json();

    if (!res.ok) throw new Error(data?.detail || `Unable to load callbacks (${res.status})`);

    const items = Array.isArray(data?.callbacks) ? data.callbacks : [];

    callbackItems = items;

    updateRefreshed("callbacks-updated");

    applyCallbackFilters();

  } catch (err) {

    if (list) list.innerHTML = `<div class="error">${escapeHtml(err?.message || "Unable to load callbacks")}</div>`;

    updateRefreshed("callbacks-updated", true);

  }

}



function applyCallbackFilters() {
  const text = (document.getElementById("callbacks-filter")?.value || "").toLowerCase();
  const status = (document.getElementById("callbacks-status-filter")?.value || "").toUpperCase();
  const sort = (document.getElementById("callbacks-sort")?.value || "newest").toLowerCase();
  let list = callbackItems || [];
  if (status) {
    list = list.filter((c) => (c.status || "").toUpperCase() === status);
  }
  if (text) {
    list = list.filter((c) => {
      const combined = `${c.phone || ""} ${c.reason || ""}`.toLowerCase();
      return combined.includes(text);
    });
  }
  list = list.slice().sort((a, b) => {
    const aDate = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bDate = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return sort === "oldest" ? aDate - bDate : bDate - aDate;
  });
  filteredCallbacks = list;
  renderCallbacks(list);
  renderCallbackSummary(list);
}


async function handleStaffInvite(event) {

  event.preventDefault();

  const emailInput = document.getElementById("invite-email");

  const roleInput = document.getElementById("invite-role");

  const statusEl = document.getElementById("staff-invite-status");

  if (!emailInput || !roleInput) return;

  if (!hasOwnerPrivileges()) {

    if (statusEl) statusEl.textContent = "Invites require owner or admin.";

    return;

  }

  const email = (emailInput.value || "").trim();

  const role = (roleInput.value || "staff").trim();

  if (!email) {

    if (statusEl) statusEl.textContent = "Email is required.";

    return;

  }

  if (statusEl) {

    statusEl.textContent = "Sending invite...";

    statusEl.className = "muted";

  }

  try {

    const res = await authorizedFetch("/v1/owner/invites", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

      },

      body: JSON.stringify({

        email,

        role,

      }),

    });

    const data = await res.json();

    if (!res.ok) {

      throw new Error(data?.detail || "Invite failed");

    }

    recentInvites.unshift(data);

    renderRecentInvites();

    emailInput.value = "";

    if (statusEl) {

      statusEl.textContent = data?.invite_token

        ? `Invite created. Share this token with your teammate: ${data.invite_token}`

        : "Invite created. We will email or share the link.";

      statusEl.className = "success";

    }

  } catch (err) {

    if (statusEl) {

      statusEl.textContent = err?.message || "Unable to send invite.";

      statusEl.className = "error";

    }

  }

}



function initButtons() {

  document.getElementById("refresh-owner-kpis")?.addEventListener("click", loadOwnerKpis);

  document.getElementById("owner-qbo-refresh")?.addEventListener("click", loadOwnerQbo);

  document.getElementById("owner-qbo-notify")?.addEventListener("click", notifyOwnerQbo);

  document.getElementById("owner-qbo-connect")?.addEventListener("click", connectOwnerQbo);

  document.getElementById("refresh-today-summary")?.addEventListener("click", loadTodaySummary);

  document.getElementById("refresh-schedule")?.addEventListener("click", loadSchedule);

  document.getElementById("refresh-emergencies")?.addEventListener("click", loadEmergencyJobs);

  document.getElementById("refresh-analytics")?.addEventListener("click", loadAnalytics);

  document.getElementById("refresh-conversations")?.addEventListener("click", loadConversations);

  document.getElementById("refresh-geo-map")?.addEventListener("click", loadGeoMarkers);



  document.getElementById("download-service-mix")?.addEventListener("click", () => {

    window.open(backendBase + "/v1/owner/export/service-mix.csv", "_blank");

  });

  document.getElementById("download-conversations")?.addEventListener("click", () => {

    window.open(backendBase + "/v1/owner/export/conversations.csv", "_blank");

  });



  document.getElementById("refresh-all")?.addEventListener("click", () => {

    refreshAllData();

  });



  document.getElementById("open-assistant-cta")?.addEventListener("click", () => {

    document.getElementById("owner-assistant-toggle")?.click();

  });

  document.getElementById("scroll-conversations")?.addEventListener("click", () => {

    const chatCard = document.getElementById("chat-card");

    if (chatCard) {

      chatCard.scrollIntoView({ behavior: "smooth", block: "start" });

    }

  });



  document.getElementById("logout-btn")?.addEventListener("click", () => {

    clearSession(true);

  });

  document.getElementById("logout-btn-inline")?.addEventListener("click", () => {

    clearSession(true);

  });

  document.getElementById("staff-invite-form")?.addEventListener("submit", handleStaffInvite);

  document.getElementById("start-subscription")?.addEventListener("click", startSubscription);

  document.getElementById("manage-billing")?.addEventListener("click", openBillingPortal);

  document.getElementById("team-card")?.addEventListener("mouseenter", loadTeam);

  document.getElementById("business-select")?.addEventListener("change", (e) => {

    const value = e.target.value;

    switchBusiness(value);

  });

  document.getElementById("refresh-callbacks")?.addEventListener("click", loadCallbacks);
  document.getElementById("download-callbacks")?.addEventListener("click", downloadCallbacksCsv);
  document.getElementById("set-active-business")?.addEventListener("click", setActiveBusiness);
  document.getElementById("audit-refresh")?.addEventListener("click", loadAuditLog);
  document.getElementById("audit-actor-filter")?.addEventListener("change", loadAuditLog);
  document.getElementById("audit-method-filter")?.addEventListener("change", loadAuditLog);
  document.getElementById("audit-path-filter")?.addEventListener("change", loadAuditLog);
  document.getElementById("email-alerts-toggle")?.addEventListener("change", (e) => {
    saveEmailAlertsPreference(!!e.target.checked);
  });

}



function initMobileNav() {

  const buttons = Array.from(document.querySelectorAll(".mobile-nav button[data-target]"));

  if (!buttons.length) return;



  const setActive = (btn) => {

    buttons.forEach((b) => b.classList.toggle("active", b === btn));

  };



  const observer = new IntersectionObserver(

    (entries) => {

      entries.forEach((entry) => {

        if (entry.isIntersecting && entry.target.__navButton) {

          setActive(entry.target.__navButton);

        }

      });

    },

    { rootMargin: "-140px 0px -40% 0px", threshold: 0.1 }

  );



  buttons.forEach((btn) => {

    const targetId = btn.dataset.target;

    const target = targetId ? document.getElementById(targetId) : null;

    if (target) {

      target.__navButton = btn;

      observer.observe(target);

    }

    btn.addEventListener("click", () => {

      if (target) {

        target.scrollIntoView({ behavior: "smooth", block: "start" });

        setActive(btn);

      }

    });

  });

}



window.addEventListener("DOMContentLoaded", () => {

  initLocale();

  applyLocale();

  initDataStrip();

  initQuickActions();

  initConversationFilters();

  initCallbackFilters();

  updateConnectionStatus("connecting");

  updateUserUi();

  // Light status chips for streaming/intent readiness

  const statusContainer = document.querySelector(".status-bar");

  if (statusContainer) {

    const chip = document.createElement("div");

    chip.className = "status-badge success";

    chip.textContent = "Voice streaming ready";

    statusContainer.appendChild(chip);

    const intentChip = document.createElement("div");

    intentChip.className = "status-badge muted";

    intentChip.textContent = "Intent threshold 0.5";

    statusContainer.appendChild(intentChip);

  }

  if (!accessToken && !apiKey && !ownerToken) {

    window.location.href = "login.html";

    return;

  }

  initAuth();

  initThemeToggle();

  initButtons();

  loadBusinesses();

  loadTeam();
  loadActiveBusiness();

  loadInvites();

  loadAuditLog();

  loadCallbacks();

  initMobileNav();

  initCalendarModal();

  initOwnerAssistant();

    loadOwnerOnboardingProfile();

    loadSubscriptionStatus();

    refreshAllData();

    initFeedbackModal({ authorizedFetch });

  });
