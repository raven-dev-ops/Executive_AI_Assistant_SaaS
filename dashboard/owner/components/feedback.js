/**
 * Feedback modal + FAB for static dashboards.
 * Expects `#feedback-overlay`, `#feedback-form`, and `#feedback-close` in the DOM.
 */
export function initFeedbackModal({ authorizedFetch }) {
  const feedbackBtn = document.createElement("button");
  feedbackBtn.id = "feedback-fab";
  feedbackBtn.type = "button";
  feedbackBtn.textContent = "Send Feedback";
  feedbackBtn.setAttribute("aria-haspopup", "dialog");
  feedbackBtn.setAttribute("aria-controls", "feedback-modal");
  feedbackBtn.setAttribute("aria-expanded", "false");
  document.body.appendChild(feedbackBtn);

  const feedbackOverlay = document.getElementById("feedback-overlay");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackClose = document.getElementById("feedback-close");
  let feedbackReturnFocus = null;

  function openFeedback() {
    if (!feedbackOverlay) return;
    feedbackReturnFocus = document.activeElement;
    feedbackOverlay.style.display = "flex";
    feedbackOverlay.setAttribute("aria-hidden", "false");
    feedbackBtn.setAttribute("aria-expanded", "true");
    (document.getElementById("feedback-category") || document.getElementById("feedback-summary"))?.focus();
  }

  function closeFeedback() {
    if (!feedbackOverlay) return;
    feedbackOverlay.style.display = "none";
    feedbackOverlay.setAttribute("aria-hidden", "true");
    feedbackBtn.setAttribute("aria-expanded", "false");
    const focusTarget = feedbackReturnFocus && feedbackReturnFocus.focus ? feedbackReturnFocus : feedbackBtn;
    focusTarget?.focus();
    feedbackReturnFocus = null;
  }

  feedbackBtn.addEventListener("click", openFeedback);
  feedbackClose?.addEventListener("click", closeFeedback);

  feedbackOverlay?.addEventListener("click", (e) => {
    if (e.target === feedbackOverlay) closeFeedback();
  });

  feedbackOverlay?.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeFeedback();
      return;
    }
    if (evt.key !== "Tab") return;
    const modal = document.getElementById("feedback-modal");
    if (!modal) return;
    const focusable = Array.from(
      modal.querySelectorAll(
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

  feedbackForm?.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    const urlObj = new URL(window.location.href);
    const payload = {
      category: document.getElementById("feedback-category")?.value || "bug",
      summary: (document.getElementById("feedback-summary")?.value || "").trim(),
      steps: (document.getElementById("feedback-steps")?.value || "").trim() || null,
      expected: (document.getElementById("feedback-expected")?.value || "").trim() || null,
      actual: (document.getElementById("feedback-actual")?.value || "").trim() || null,
      call_sid: (document.getElementById("feedback-call-sid")?.value || "").trim() || null,
      contact: (document.getElementById("feedback-contact")?.value || "").trim() || null,
      conversation_id: urlObj.searchParams.get("conversation_id") || null,
      session_id: urlObj.searchParams.get("session_id") || null,
      url: window.location.href,
    };

    if (!payload.summary) {
      alert("Please add a short summary.");
      return;
    }

    try {
      const res = await authorizedFetch("/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Submit failed (${res.status})`);
      closeFeedback();
      alert("Thanks for the feedback!");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Unable to submit feedback right now.");
    }
  });

  return { button: feedbackBtn, openFeedback, closeFeedback };
}

