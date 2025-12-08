Incident Response Playbooks
===========================

This doc provides short, action-first runbooks for the highest-risk user-facing flows: Twilio/webhooks
and telephony, chat/owner assistant, and background jobs. Pair these with the alert routes in
`k8s/prometheus-rules.yaml` and the pager wiring in `k8s/alertmanager-config.example.yaml`.

How to use
----------

- Treat **severity=critical** or `page: "true"` alerts as page-worthy (Slack + email).
- Keep a short incident log (who/when/what). Use the post-incident template in
  `POST_INCIDENT_TEMPLATE.md` to capture follow-ups.
- Fallback bias: keep the assistant available (even if degraded) and avoid dropping calls.

Webhooks & Telephony (Twilio) Runbook
-------------------------------------

Signals
- Alerts: `WebhookErrorRate` (critical), `HighTwilioVoiceErrorRate`, `HighTwilioSmsErrorRate`.
- Metrics: `/metrics` `ai_telephony_twilio_*`, `ai_telephony_route_error_count{path=~"/twilio/.*|/telephony/.*"}`.
- Symptoms: Twilio console webhooks failing, owners not receiving call transfers/SMS, callers hear errors.

Immediate actions
1) Confirm health: `GET /healthz`, `GET /readyz`, `GET /metrics`.
2) Check recent errors in logs filtered by `/twilio/*` or `/telephony/*` paths.
3) Validate Twilio creds/env (`TWILIO_AUTH_TOKEN`, `VERIFY_TWILIO_SIGNATURES`), and webhook URLs.
4) If upstream (Twilio) degraded: switch to fail-soft messaging (short “we’ll call you back”) and pause retries.
5) If DB unavailable: switch `USE_DB_*` to false and restart in in-memory mode to stay reachable.

Stabilize & communicate
- Acknowledge the page in Slack/email and post a short status (“investigating Twilio webhook errors”).
- If caller impact is confirmed, route owner alerts via SMS stub or email fallback.
- Once fixed, clear the queue by posting a test call/SMS and confirm metrics trend down.

Owner/Chat Runbook
------------------

Signals
- Alerts: `HighChatErrorRate`, `ChatLatencyP95High`, `ChatErrorRateCritical` (page).
- Metrics: `ai_telephony_chat_failures`, `ai_telephony_chat_latency_p95_ms`, `/metrics/prometheus`.
- Symptoms: owner dashboard/chat PWA failures, long responses, queued messages staying offline.

Immediate actions
1) Verify backend health: `GET /healthz`, then `/metrics`.
2) Check upstream LLM or speech provider status; flip to stub providers if needed (`SPEECH_PROVIDER=stub`).
3) For elevated latency only: raise timeout to callers (e.g., increase client timeout) and throttle concurrency.
4) If queues build up in the PWA, prompt users to refresh; service worker flush will retry with jitter.
5) Restart the chat pod if memory/CPU is pegged; watch latency buckets after restart.

Stabilize & communicate
- Post an owner-facing banner if dashboards rely on the impacted backend.
- After recovery, run a quick load test (`python backend/load_test_chat.py ...`) to confirm p95/p99.

Background Jobs & Billing Runbook
---------------------------------

Signals
- Alerts: `BackgroundJobFailures` (warning), `BillingWebhookFailures` (warning).
- Metrics: `ai_telephony_background_job_errors`, `ai_telephony_billing_webhook_failures`.
- Symptoms: CSV imports stuck, retention jobs not running, Stripe webhook retries showing in dashboard.

Immediate actions
1) Check worker logs for stack traces; re-run failed jobs manually if safe.
2) For billing webhooks, verify `STRIPE_WEBHOOK_SECRET` and signature verification toggles.
3) If job backlog grows, pause non-critical jobs and process in batches during low-traffic windows.

Stabilize & communicate
- Notify owners if billing/CSV features are delayed; give an ETA for retries.

Paging & Contacts
-----------------

- Critical alerts carry `page: "true"`; route them to Slack + email via Alertmanager (see
  `k8s/alertmanager-config.example.yaml`).
- Keep an on-call rotation reachable via Slack channel `#ai-telephony-oncall` (example) and a shared email
  (e.g., `oncall@yourcompany.com`).

After the Incident
------------------

- Capture a post-incident review using `POST_INCIDENT_TEMPLATE.md`.
- Add concrete follow-ups (tests, alerts, playbook updates) and assign owners with dates.
