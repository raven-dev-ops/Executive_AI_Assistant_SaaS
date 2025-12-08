Service SLOs & Error Budgets
============================

Scope: AI Telephony backend (voice/telephony webhooks, chat API/widget, owner/admin APIs, background jobs).

SLO Targets (per rolling 30 days)
---------------------------------
- Voice/telephony availability: 99.5% of `/telephony/*` and `/v1/voice/session/*` requests return 2xx/3xx. Error budget: 0.5% failed.
- SMS webhooks: 99.5% of `/twilio/sms` requests return 2xx/3xx. Error budget: 0.5% failed.
- Chat API availability: 99.0% of `/v1/chat` requests return 2xx/3xx. Error budget: 1.0% failed.
- Chat latency: Average over 5–10m windows < 1.5s; aim for p95 < 2.0s (tracked via average in Prometheus; upgrade to histogram when available).
- Background jobs: 99% of jobs succeed (no increments to `background_job_errors`). Error budget: 1% failed jobs.
- Billing webhooks: 99% success (no increments to `billing_webhook_failures`). Error budget: 1% failed.

Key Metrics (Prometheus)
------------------------
- `ai_telephony_route_request_count{path=...}`, `ai_telephony_route_error_count{path=...}` — per-path request/error counters.
- `ai_telephony_twilio_voice_requests`, `ai_telephony_twilio_voice_errors`
- `ai_telephony_twilio_sms_requests`, `ai_telephony_twilio_sms_errors`
- `ai_telephony_voice_session_requests`, `ai_telephony_voice_session_errors`
- `ai_telephony_chat_messages`, `ai_telephony_chat_failures`, `ai_telephony_chat_latency_ms_total`, `ai_telephony_chat_latency_ms_samples`
- `ai_telephony_background_job_errors`
- `ai_telephony_billing_webhook_failures`

Alerting Rules
--------------
Defined in `k8s/prometheus-rules.yaml`:
- HighTwilioVoiceErrorRate: >5% for 5m
- HighTwilioSmsErrorRate: >5% for 5m
- HighVoiceSessionErrorRate: >5% for 5m
- HighChatErrorRate: >5% over 5m
- ElevatedChatLatency: avg latency >1.5s over 10m
- WebhookErrorRate: >5% errors on `/twilio/*` or `/telephony/*` paths for 5m
- BackgroundJobFailures: any job errors in last 10m
- BillingWebhookFailures: any billing webhook failures in last 10m

Operational Notes
-----------------
- Alert tuning: Start with the provided thresholds; adjust after observing baseline traffic/false positives.
- Dashboards: Break down error rates by path and tenant (where labels exist) to spot noisy tenants or misconfigurations.
- Longer-term: Replace averaged chat latency with histogram buckets to support true p95/p99 calculations.
