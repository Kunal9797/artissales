Artis Field Sales App — 2‑Page Proposal & Stack Spec

Date: Oct 8, 2025
Owner: Kunal Gupta (Artis Laminates)

1) Executive Summary

Build an Android‑first, offline‑capable field sales app that ensures (1) reliable attendance with geo‑stamps, (2) fast territory‑based lead routing with a 4‑hour first‑touch SLA, (3) simple on‑site visit logging (notes/photos/next actions), and (4) an auto‑compiled Daily Sales Report (DSR) for manager oversight. We will keep V1 intentionally small but architected for scale and future modules (quotes, inventory, route planning) via events and clear boundaries.

⸻

2) V1 Goals & Non‑Goals

Goals:
	•	One‑tap attendance (check‑in/out) with GPS at event time only.
	•	Lead routing from website → webhook → pincode → rep; SLA timers + push alerts.
	•	Visit logging at dealers/distributors: start/end (geo/time), purpose chips, voice→text notes, photos, next action.
	•	DSR auto‑compile from day’s events; manager approve/comment.
	•	Manager view: today’s attendance, SLA queue, visits per rep; CSV/PDF export.
	•	Offline‑first: all writes queue locally and sync safely.

Non‑Goals (V1): payroll/expenses, continuous background tracking, route optimization, quoting/invoicing, ERP sync (exports only).

⸻

3) Users & Core Stories
	•	Rep: “Start day → check‑in → receive new leads → visit dealers → dictate notes → submit DSR → check‑out.”
	•	Manager (area/zonal): “See who checked in, who has hot leads overdue, how many visits happened, and review DSRs.”
	•	Admin: “Maintain territories (pincode→rep), users, and seed dealer accounts.”

⸻

4) Architecture (keep it boring, scalable)

Mobile (Android‑first): React Native + Expo (managed workflow).
Backend: Postgres (Supabase) with Row‑Level Security (RLS).
Pattern: Thin REST API + event outbox + 2 cron workers (outbox dispatcher, SLA escalator).
Data flow:
	1.	Wix/website posts JSON to /webhooks/lead.
	2.	API validates, assigns owner via pincode_routes, sets sla_due_at = now()+4h, writes LeadCreated + LeadAssigned to outbox_events.
	3.	Mobile app performs attendance, visits, first‑touch; each write emits domain events to outbox.
	4.	Background workers deliver push alerts and do SLA reassign/escalation.

Why this scales: write‑once domain events, idempotent endpoints, and a small set of indexed tables keep the hot path fast; more features later = new events/consumers.

⸻

5) Tech Stack (V1)
	•	Mobile: Expo SDK 53, expo-location, expo-camera, expo-av, expo-sqlite, expo-notifications, react-native-maps (optional).
	•	Backend / DB: Supabase (Auth, Postgres 15, RLS, Edge Functions, Cron).
	•	API: REST over HTTPS (/api/v1/*) with JWT auth; idempotency via Idempotency-Key header + request_id.
	•	Queues / Cron: Supabase cron + DB polling (no external infra in V1).
	•	Observability: Sentry (mobile/web/backend), basic metrics (SLA breach count, queue sizes).
	•	Hosting: Supabase + Expo EAS + Play Store (internal → closed → prod tracks).
	•	Security: RLS policies, column encryption for PII where needed, signed image URLs; no long‑term background location.

⸻

6) Minimal Data Model (Postgres)
	•	users(id, name, phone, email, role{rep,area_manager,zonal_head,national_head,admin}, is_active)
	•	pincode_routes(pincode pk, rep_user_id → users.id)
	•	leads(id, source, name, phone, email, company, city, state, pincode, message, status{new,contacted,qualified,quoted,won,lost}, owner_user_id, created_at, first_touch_at, sla_due_at, extra jsonb)
	•	visits(id, account_name, user_id, started_at, ended_at, lat_start, lon_start, lat_end, lon_end, notes, photos text[], extra jsonb)
	•	attendance(id, user_id, type{check_in,check_out}, ts, lat, lon, accuracy_m)
	•	Infra: outbox_events(id, event_type, payload jsonb, created_at, processed_at)

Indexes: leads(owner_user_id, status, sla_due_at), lower(leads.phone), and later PostGIS GIST for geo if needed.

⸻

7) API Surface (V1)
	•	POST /api/v1/webhooks/lead  → validate, route by pincode, set sla_due_at, emit events.
	•	POST /api/v1/attendance/check-in|check-out  → store GPS stamp.
	•	POST /api/v1/visits/start|end  → log visit lifecycle, notes/photos.
	•	POST /api/v1/leads/:id/first-touch  → set first_touch_at, status→contacted.
	•	GET  /api/v1/me/today  → attendance + assigned leads + visits summary.

Contracts: all write endpoints accept {request_id}; return {ok, id}.

⸻

8) Background Jobs (2 only)
	1.	Outbox dispatcher (30s): reads unprocessed events, sends push alerts, writes audit logs, marks processed.
	2.	SLA escalator (5–10 min): finds status='new' AND now()>sla_due_at, reassigns within pincode (round‑robin), emits LeadSLAExpired + LeadAssigned.

⸻

9) Offline‑First & Integrity
	•	Local SQLite queue for writes; exponential backoff sync.
	•	Attendance and visit check‑ins require GPS with accuracy_m ≤ 50–100.
	•	Device time skew noted vs server; reject obviously spoofed coords; store mocked flag if available.

⸻

10) “Vibe Coding” Workflow for This Project (rules we’ll enforce)

Why: We will use AI assistants (Claude Code, Cursor) to speed up scaffolding, but with guardrails to keep code maintainable and secure.

Project Rules (put in Cursor/Claude context file):
	1.	Plan first, then code. The agent must propose a plan/diff before writing files.
	2.	Respect the spec. Only change files requested; cite affected modules in a checklist.
	3.	Tests before non‑trivial code. For services and utils, ask for tests first, then implement until tests pass.
	4.	Schema safety. DB changes must ship as SQL migrations with reversible steps.
	5.	Idempotency & retries. All endpoints accept Idempotency-Key; workers are retry‑safe.
	6.	Event‑driven. Mutations emit domain events; side‑effects handled by consumers.
	7.	No secrets in code. Use env vars; generate .env.example.
	8.	Small PRs. Max 200 lines per change unless explicitly allowed.
	9.	Explain tradeoffs. Before picking a lib, the agent lists 2–3 alternatives + why chosen.
	10.	Security pass. After generating code, run a quick checklist (input validation, auth, RLS, logging of PII, error messages).

Prompt Pattern (for each task):
	•	Context: repo map, target files, constraints (e.g., Expo managed, Supabase), data contracts.
	•	Goal: one sentence of what should exist after the change.
	•	Plan: bullet steps (files to add/edit, functions, tests).
	•	Diffs: ask the agent to output file diffs or full files.
	•	Review: request a self‑review checklist and risks before applying.

⸻

11) Pseudocode (reference for Claude Code)

11.1 Lead routing webhook

POST /api/v1/webhooks/lead (body: LeadNew)
  validate(body)
  normalize(phone)
  owner := select rep_user_id from pincode_routes where pincode = body.pincode
  lead := insert into leads(..., owner_user_id=owner, status='new', sla_due_at=now()+4h)
  emit OutboxEvent('LeadCreated', {lead_id: lead.id})
  emit OutboxEvent('LeadAssigned', {lead_id: lead.id, owner_user_id: owner})
  return {ok: true, id: lead.id, owner_user_id: owner}

11.2 SLA escalator worker

cron job every 5m:
  overdue := select * from leads where status='new' and now()>sla_due_at limit 100
  for each L in overdue:
    owner2 := nextRepRoundRobin(L.pincode)
    update leads set owner_user_id=owner2, sla_due_at=now()+4h where id=L.id
    emit OutboxEvent('LeadSLAExpired', {lead_id: L.id, prev_owner: L.owner_user_id})
    emit OutboxEvent('LeadAssigned', {lead_id: L.id, owner_user_id: owner2})

11.3 Attendance & visit logging

POST /attendance/check-in {lat, lon, accuracy_m, request_id}
  assert accuracy_m <= 100
  insert attendance(user_id, 'check_in', now(), lat, lon, accuracy_m)
  emit OutboxEvent('AttendanceCheckedIn', {...})

POST /visits/start {account_name, lat, lon, accuracy_m}
  assert accuracy_m <= 100
  V := insert visits(..., started_at=now(), lat_start=lat, lon_start=lon)
  emit OutboxEvent('VisitStarted', {visit_id: V.id})

POST /visits/end {visit_id, lat, lon, notes?, photos?[]}
  update visits set ended_at=now(), lat_end=lat, lon_end=lon, notes=notes, photos=photos
  emit OutboxEvent('VisitEnded', {visit_id})

11.4 Mobile offline queue (SQLite)

function enqueue(action):
  db.insert('pending', {id: uuid(), action, body, ts: now()})

background sync:
  for row in pending oldest-first:
    resp := fetch(api, {headers: {Idempotency-Key: row.id}, body: row.body})
    if resp.ok: db.delete('pending', row.id)
    else if transient(resp): backoff and retry; else mark row.failed


