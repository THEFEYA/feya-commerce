# FEYA Company / AI Team — Visual Contract v1

Date: 2026-09-20  
Scope: `/admin/company/**` and agent / Growth OS owner-facing surfaces only.

## 1. Hard boundary

The approved Product OS and public storefront are visually frozen. This visual contract must not redesign:

- Listing Master;
- Product catalog / product detail;
- existing Product OS review, media and SEO working screens;
- public shop, product cards or PDP.

The Company / AI Team surface is a separate owner-facing operating layer. It may share FEYA visual DNA, but it does not wrap or restyle Product OS.

## 2. Visual character

The target is a premium internal FEYA command center:

- near-black / midnight-navy base;
- warm restrained gold for brand, selection and owner attention;
- bone / warm off-white text instead of stark white;
- muted warm-gray secondary copy;
- deep blue only for active/information states;
- green only for healthy/completed;
- red only for critical risk/error;
- amber/gold for review, warning and owner attention.

No bright generic SaaS blue outline language. No marketing landing-page hero typography inside operational screens.

## 3. Typography

- Brand / major owner page title: Italiana or Cormorant, restrained and editorial.
- Interface, data, tables, controls: Manrope.
- Page title: 35–46 px desktop.
- Section title: 18–22 px.
- Primary UI/body: 12–15 px depending on density.
- Metadata: 9–11 px.
- Numbers use tabular rendering when comparison matters.

## 4. Geometry and density

- Base spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32.
- Standard radius: 8–14 px.
- Thin borders over heavy shadows.
- Pills only for real statuses/tags.
- Cards are not default containers for every number.
- Queue counts should prefer compact strips/lists over KPI walls.
- Owner default is information-dense but calm.

## 5. Navigation

Primary Company destinations stay:

1. Сегодня
2. Работа
3. Рост
4. Товары
5. Результаты
6. Система

`Товары` is an explicit bridge back to the approved Product OS; it is not a second Product Workspace.

Search and Advanced remain secondary. Raw registries, traces and technical IDs never become primary navigation.

## 6. Today hierarchy

Today is a decision surface, not a dashboard. Order:

1. current owner state / concise command brief;
2. owner decisions;
3. material signals;
4. real opportunities when they exist;
5. active work / real operational queues;
6. measured outcomes only when real measurement exists;
7. compact system state;
8. FYI collapsed.

No fake revenue, conversion, ranking or experiment result before authoritative datasets exist.

## 7. Interaction

- Progressive disclosure: compact → drawer → evidence → action.
- Primary action is one clear next step.
- Dangerous actions require a decision preview.
- Hover motion is subtle; state transitions 120–180 ms.
- One-time page reveal is allowed.
- No perpetual agent animation or fake realtime.
- Respect `prefers-reduced-motion`.

## 8. Agent representation

Agents are logical business roles, not cartoon characters or implied independent services.

Default representation:

- role name;
- real current state;
- current work;
- what it waits for;
- latest result;
- next step.

Workflow handoff may be shown as a compact timeline only when canonical events exist.

## 9. Truthfulness rules

Every owner-facing claim should preserve:

- source;
- freshness;
- period/baseline when relevant;
- evidence limitation;
- distinction between fact, inference, recommendation and hypothesis.

Never show an uncalibrated numeric AI confidence score.

## 10. Implementation rule

Visual work proceeds in bounded passes:

- V0: contract/tokens;
- V1: Shell + Today;
- V2: Work + Team FEYA;
- V3: Signals;
- V4: Growth;
- V5: Results + System;
- V6: mobile/accessibility/polish.

Each pass must build and pass visual/owner review before the next pass. Once the owner-facing read-only interface meets the research checklist, stop cosmetic iteration and move to protected actions/data prerequisites.
