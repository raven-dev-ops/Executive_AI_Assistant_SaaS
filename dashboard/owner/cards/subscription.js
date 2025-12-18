import { escapeHtml } from "../utils.js";

export function initSubscriptionCard({
  authorizedFetch,
  setDataSourceStatus,
  updateUserUi,
  getSubscriptionState,
  setSubscriptionState,
}) {
  async function loadSubscriptionStatus() {
    const statusText = document.getElementById("subscription-status-text");
    const warning = document.getElementById("subscription-warning");
    const usage = document.getElementById("subscription-usage");
    const planBadge = document.getElementById("plan-badge");
    const warningsList = document.getElementById("subscription-warnings-list");

    try {
      const res = await authorizedFetch("/v1/billing/subscription/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Unable to load subscription (${res.status})`);

      const current = getSubscriptionState();
      const nextStatus = data?.status || "unknown";
      const nextPlan = data?.plan || current?.subscriptionPlan || "basic";
      setSubscriptionState({ subscriptionStatus: nextStatus, subscriptionPlan: nextPlan });

      const select = document.getElementById("plan-select");
      if (select && nextPlan) select.value = nextPlan;

      if (statusText) {
        const endLabel = data?.current_period_end ? new Date(data.current_period_end).toLocaleString() : "n/a";
        const graceNote =
          data?.in_grace && !data?.blocked
            ? ` • In grace (${data?.grace_remaining_days || 0} days left)`
            : data?.blocked && data?.message
              ? ` • ${data.message}`
              : "";
        statusText.textContent = `Status: ${nextStatus}${graceNote} . Period end: ${endLabel}`;
      }

      if (usage) {
        const parts = [];
        if (data?.calls_limit) parts.push(`Calls ${data.calls_used || 0}/${data.calls_limit}`);
        if (data?.appointments_limit) parts.push(`Appointments ${data.appointments_used || 0}/${data.appointments_limit}`);
        usage.textContent = parts.join(" . ");
      }

      if (warningsList) {
        const warnings = Array.isArray(data?.usage_warnings) ? data.usage_warnings : [];
        warningsList.innerHTML = warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
        warningsList.style.display = warnings.length ? "block" : "none";
      }

      if (planBadge) {
        planBadge.style.display = "inline-flex";
        planBadge.textContent = `Plan: ${nextPlan}`;

        const pillState =
          data?.blocked || nextStatus === "canceled"
            ? "disconnected"
            : nextStatus === "active"
              ? "success"
              : "warn";
        planBadge.className = "status-badge " + pillState;
      }

      const billingState = data?.blocked ? "error" : nextStatus === "active" ? "ok" : "warn";
      const billingNote =
        data?.blocked && data?.message
          ? data.message
          : data?.in_grace
            ? `In grace period (${data?.grace_remaining_days || 0} days remaining)`
            : nextStatus === "active"
              ? "Billing active"
              : nextStatus === "past_due"
                ? "Past due · update payment method"
                : "Add payment method to activate";

      setDataSourceStatus("data-pill-billing", billingState, billingNote);

      const startBtn = document.getElementById("start-subscription");
      if (startBtn) startBtn.textContent = nextStatus === "active" ? "Update plan" : "Start/Resume Subscription";

      if (warning) {
        warning.style.display = "none";
        warning.className = "pill muted";

        if (data?.blocked) {
          warning.style.display = "inline-flex";
          warning.classList.add("disconnected");
          warning.textContent = data?.message || "Subscription inactive. Upgrade to use voice/chat.";
        } else if (data?.in_grace) {
          warning.style.display = "inline-flex";
          warning.textContent = `In grace period (${data?.grace_remaining_days || 0} days remaining).`;
        }
      }
    } catch (err) {
      if (statusText) statusText.textContent = err?.message || "Unable to load subscription.";
      setDataSourceStatus("data-pill-billing", "error", "Billing unreachable");
    } finally {
      updateUserUi();
    }
  }

  async function startSubscription() {
    const select = document.getElementById("plan-select");
    const planId = select ? select.value : "basic";
    const statusText = document.getElementById("subscription-status-text");

    try {
      if (statusText) statusText.textContent = "Starting checkout session...";
      const res = await authorizedFetch("/v1/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ plan_id: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Checkout failed (${res.status})`);
      if (statusText) statusText.textContent = "Redirecting to checkout...";
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      if (statusText) statusText.textContent = err?.message || "Unable to start subscription.";
    }
  }

  async function openBillingPortal() {
    const statusText = document.getElementById("subscription-status-text");
    try {
      if (statusText) statusText.textContent = "Opening billing portal...";
      const res = await authorizedFetch("/v1/billing/portal-link");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Portal unavailable (${res.status})`);
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      if (statusText) statusText.textContent = err?.message || "Billing portal unavailable.";
    }
  }

  return { loadSubscriptionStatus, startSubscription, openBillingPortal };
}

