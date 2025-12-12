# Closed Beta KPIs

Baseline KPIs to track during closed beta. Each KPI should be visible in the admin beta health panel or derivable from existing metrics/endpoints.

1) **Call answer rate** — 1 - (Twilio voice errors ÷ Twilio voice requests). Source: `/v1/admin/businesses/usage` (aggregated), beta health card.
2) **Booking rate** — Total appointments ÷ total conversations. Source: `/v1/admin/businesses/usage`, beta health card.
3) **Emergency capture rate** — Emergency appointments ÷ emergency conversations. Source: `/v1/admin/businesses/usage`, beta health card.
4) **Pending reschedules** — Count of appointments marked `PENDING_RESCHEDULE`. Source: `/v1/admin/businesses/usage`, beta health card.
5) **Callback queue size** — Pending callbacks/voicemails per tenant. Source: owner dashboard callbacks card.
6) **SMS opt-out rate** — Opted-out customers ÷ total customers. Source: `/v1/admin/businesses/usage`, beta health card.
7) **Webhook health** — Twilio error rate and signature verification status. Source: `/v1/admin/twilio/health` + `/metrics`.
8) **Calendar success rate** — Appointment create/update success vs failures (from logs/metrics); manual checks via usage + errors.
9) **Subscription readiness** — Active subscriptions vs past_due/canceled (Stripe health + `businesses/usage` subscription_status).
10) **Last activity freshness** — Most recent tenant activity timestamp; stale tenants indicate engagement issues. Source: `/v1/admin/businesses/usage`, beta health card.

Operational questions:
- **What broke?** — Check call answer rate, webhook health, and error counts.
- **Who is impacted?** — Inspect usage per-tenant (filters in admin usage table) and callback queues.
- **How bad is it?** — Booking/emergency capture rates, pending reschedules, and last-activity recency.
