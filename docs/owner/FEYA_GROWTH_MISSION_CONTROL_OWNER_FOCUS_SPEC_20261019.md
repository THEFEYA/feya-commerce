# FEYA Growth OS — Mission Control Owner Focus vNext / Specification Packet
**Дата:** 2026-10-19  
**Статус:** PROPOSAL + SAFE UI ITERATION / DRAFT PR; не CANONICAL, не approval на Production.  
**Иерархия:** 12 CANONICAL v1.0 (18.09.2026) → решения владельца → проверенная реализация → этот UI-proposal. Единый MASTER: issue #145. PR #175 — отдельный неутверждённый blueprint; его идеи используются только после проверки с каноном.

## A. Business purpose
Владелец за один взгляд отличает сохранённый факт от запланированной возможности; открывает конкретный Case, Owner Attention и реальное досье роли. Визуальная карта помогает понять передачу работы, **не имитирует непрерывно работающий AI**. Цель первого среза: сократить путь «вижу кейс → вижу связанный поток → открываю истинный маршрут/решение», сделать карту доступной на мобильном без горизонтальной ловушки.

## B. Existing-state audit (verified 19.10)
- Main: \`533bc8e40f2fd1a9464495134459afde9308bd7d\`; Vercel Production READY (точный SHA). Existing \`/admin/company/mission-control\` (PR #174 merged) — server-side guarded \`getAdminReadClient\`, six bounded owner-safe reads, \`buildMissionSnapshot\`, 8 canonical roles, SVG graph/Office, dossier, replay (НЕ live), zoom/pan, motion preference. No model API/new DB/schema/worker.
- Verified read-only Supabase: 8 roles (5 SHADOW, 3 INACTIVE), 2 OPEN cases, 2 persisted handoffs, 6 workflow events, 1 scoped TSEO L0 owner-attention record. This is a snapshot, **not proof of model execution**.
- \`MissionControlClient.tsx\` currently has no case-scoped timeline/links, mobile user must traverse oversized graphic, and wording \`Выполняется сейчас\` is too strong when only a workflow status—not a current lease/run—is present.
- Existing \`OwnerShell\`, \`/admin/company/work/[id]\`, \`/admin/company/owner-attention\`, \`/admin/roles\`, \`OwnerCaseRouteTruth\` are reusable. Avoid duplicating these screens.

## C. Information hierarchy / IA
**Level 1:** Home/Сегодня: material Owner Attention, blocked decisions, confirmed status; Mission Control: shortcuts → snapshot limitations → chosen Case → role map.  
**Level 2:** Case focus shows only persisted case events/links; role card reveals role mode/permissions and assigned cases; click event opens Case/Attention.  
**Level 3:** canonical Case Detail, Agent Room, safe evidence and execution receipts—not raw SQL in a giant drawer.
Existing navigation retained:
\`Сегодня → Работа {Cases, Mission Control, Owner Attention, Role Room} → Рост → Товары → Результаты → Система\`.
Product OS/SEO Studio stay inside their established workspaces; no new dashboard route.

## D. UX flow (this PR)
1. From Mission Control choose a real Case in \`Фокус кейса\`. Component filters already-read events and connections **locally**. Selected role becomes accountable owner; irrelevant role nodes are visually subdued but remain reachable.
2. Click \`Открыть маршрут кейса\` to canonical \`/admin/company/work/[id]\`; \`Мои решения\` goes to existing Owner Attention and \`Все кейсы\` to Work. Selecting \`Все кейсы\` restores whole snapshot; no database mutation.
3. Mobile default \`Список\`: eight keyboard/touch-accessible role buttons → shared dossier. \`Карта\` is optional; graph remains available on demand. No mandatory horizontal navigation.
4. History controls apply to the focused Case, show **Воспроизведение истории**, never live model operation.
5. No Cases/events: empty states and disabled replay, not fabricated robots.

## E. Layout & responsive
Desktop: quick actions above source-limited counts, toolbar with case selector, graph and dossier, historical rail below. Mobile: toolbar wraps, role list defaults, optional graph, dossier below, history as scannable cards. Keep existing dark/gold visual tokens; introduce no public-site design changes. Next visual pass can implement richer neon styling **only** after evidence and usability check.

## F. Component architecture / data contracts
- Reuse \`MissionControlClient.tsx\`, \`MissionControl.module.css\`, \`missionControlProjection.ts\`.
- New *pure local view selector*: \`missionEventsForCase(snapshot, caseId)\`; fail closed for unknown IDs; no new domain object/table/API.
- Only server-derived `MissionSnapshot.cases/events/roles` from six existing owner-safe sources **plus one bounded** SELECT on `feya_commerce_v_owner_attention_safe_v2` (OPEN/ACKNOWLEDGED, exact count, max three source-grounded IDs/priorities/titles). Failed optional read displays UNKNOWN, not zero. No new queue, raw PII, service role, or unbounded query. Optional future feature: true run-lease evidence and timestamp freshness.

## G. UI states & motion semantic contract
- Logical role = registered, not active LLM. SHADOW = capability policy, not a background model call.
- \`workflow_status=RUNNING\` counts as **recorded status only**, explicitly not proof of currently active runtime. Actual live flow requires verifiable run + lease freshness; not implemented in this PR.
- Edge = persisted case-linked handoff or Owner Attention event. Organizational *potential* links should be dashed and clearly separate when implemented later; do not manufacture saved events.
- Replay effect only during explicit historical play. Motion respects reduced-motion preference and manual toggle. No blinking status purely for decoration.
- \`SOURCE_UNAVAILABLE\` UI blocks invented numbers; valid no-data empty state distinguished from failed read.

## H. Action contracts (read-only; no new endpoints)
| Control | Input/guard | Effect | Source / audit / failure |
| --- | --- | --- | --- |
| \`Фокус кейса\` | case_id from current snapshot only | Filters event rail/edges; selects accountable role | Client-local state, no server write; unknown id → empty fail-closed helper |
| \`Список / Карта\` (mobile) | owner page loaded | Switches alternate presentation | Client-only, no audit; graph remains opt-in |
| Agent button | 8 canonical role codes | Selects dossier | Client-only; not model-run control |
| \`Открыть маршрут кейса\` | verified case_id | Navigates existing detail route | Existing authenticated owner boundary |
| \`Мои решения\` | existing guarded route | Opens active owner queue | No approval issued by link |
| `Открыть вопрос` | Persisted UUID from capped Owner Attention view | Navigates existing protected `/admin/company/owner-attention/[id]` | Read-only; no approval; count UNKNOWN if source fails; separate commerce approvals remain distinct |
| Replay controls | persisted events in filtered Case | Historical sequence only | Disabled when empty; never calls worker |
| Pan/zoom/reset | graph visible | Changes local viewport | Local-only, no backend |
| Reload | user click | Rereads existing server snapshot | Existing auth; failure shows no fictional content |

All owner Production mutations and approvals remain in existing exact Core/Execution Gateway. Future \`Запустить AI\` stays absent until runtime, budget, permissions, idempotency, receipt, release gate and explicit approval exist.

## I–K. Security, performance, accessibility and tests
- One additional capped read from the **existing** owner-safe Owner Attention view used by Today and the owner queue; no schema, package, CSS global selectors, indexation changes, cron, paid calls or mutations.
- Regression: 8 role codes, 2 OPEN despite workflow COMPLETE, real-edge-only, bad case ID fail-closed, one-case-only rail, zero-events disabled replay, shared timeline, no direct write/model endpoint, reduced motion, keyboard focus.
- QA on Preview: laptop/tablet/mobile, choose Case A/Case B/all, reopen dossier, OWNER selection, focus/back, use keyboard and touch, reduced-motion. Exact SQL/HTTP/SSOT validations unchanged.
- Keep bundle scoped; do not adopt React Flow merely for looks. Current SVG/CSS is already present. Re-evaluate library only after a reproducible accessibility/interaction limitation.
- Benchmark evidence: GOV.UK sparse notices (https://design-system.service.gov.uk/components/notification-banner/); React Flow keyboard accessibility as design baseline (https://reactflow.dev/learn/advanced-use/accessibility), not proposed dependency; W3C animation from interactions (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) — SC 2.3.3 is AAA, while WCAG 2.2 AA remains project minimum; Toyota jidoka/andon (https://www.toyota-global.com/company/history_of_toyota/75years/text/entering_the_automotive_business/chapter1/section4/item4.html).

## L. Definition of done, gaps and release
**P1 UI slice (this PR):** real case focus; mobile role list; truthful workflow-status copy; sparse read-only Owner Attention brief (exact total + maximum three links, no approval); canonical Case navigation; existing sources only, no new API/schema; typecheck, boundary, search tests, build and Preview. Draft PR requires exact owner merge authorization.
**Next UI review:** typed source freshness, full cross-source approvals aggregation only after authority review (existing Owner Attention view is not the whole commerce approval queue), clicked edge provenance, richer role passports, real Case route visualization, mobile owner usability.
**Deferred:** fake AI presence, invented ROI, synthetic robot activities, paid LLM loop, third-party animation library, new office avatar production assets, live running line without lease, global public V13 restyle.
**Parallel P0 safety gate:** issue #166 / recovery evidence; no bulk RLS/grant writes without permission + restore. **Payments:** Seller Online still awaiting external confirmation; only provider-verified orders may enter commercial KPI. GSC L0 and HTTP observations cannot be labeled Google ranking success.

### ADR-MC-001 (PROPOSAL)
Choose **existing SVG/CSS + local Case focus + mobile semantic list** over (a) new React Flow dependency now, or (b) a separate flashy independent office app. Reason: no second Core, accessible owner path, lower maintenance/release blast radius. Risk: complex future edge editing may later justify graph library; require concrete interaction tests before revisiting. This ADR does not change canonical role/decision rights.

### Verification / checkpoint
Source links: GitHub issue #145, merged PR #174, draft #175 and #186, 12 Library CANONICAL docs (2026-09-18), source files listed above. Record PR/head + CI + browser review in #145 only when verified.