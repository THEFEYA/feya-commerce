# SEO Rule Engine Architecture v1

Date: 2026-06-14  
Status: active planning passport

## Why this exists

The current project has Product Graph, Collection Planning, Media SEO, Content Pipeline and Indexation Readiness screens. The next layer must not be a hardcoded SEO checklist. It must be a versioned SEO rule engine that can absorb new research, templates, API signals, service data and manual corrections over time.

This document defines the foundation.

## Core principle

The system should separate:

1. product facts;
2. SEO rules;
3. content templates;
4. external signals;
5. scoring;
6. human approval;
7. publishing/export status.

This lets us improve SEO logic later without rebuilding the storefront or admin.

## SEO Rule Pack

A rule pack is a versioned set of requirements and recommendations.

Example fields:

- rule_pack_code;
- version;
- source_type: official_doc, research, internal_experiment, marketplace_learning, manual_strategy;
- source_name;
- valid_from;
- valid_to;
- priority;
- confidence;
- applies_to: product, collection, image, feed, structured_data, title, meta, description, alt_text;
- rule_text;
- scoring_weight;
- blocking_level: blocker, warning, suggestion;
- notes.

Rule packs must be additive and versioned. Old rules should not be deleted blindly; they should be superseded.

## Content Template Pack

Templates must be separate from rules.

Template families:

- product title;
- H1;
- meta title;
- meta description;
- product intro;
- full description;
- collection intro;
- image alt text;
- image caption;
- Pinterest title;
- Pinterest description;
- Merchant feed title;
- Merchant feed description.

Templates must support variables from the product graph:

- product_type;
- part;
- material;
- color;
- context;
- style;
- persona;
- component list;
- bundle/full set status;
- production time;
- shipping region;
- customization limits.

## Signal Sources

External signals can be connected later through API, export, CSV or manual import.

Priority signal sources:

- Google Search Console queries and page performance;
- GA4 traffic/conversion signals;
- Google Merchant Center diagnostics;
- PageSpeed/Core Web Vitals;
- Pinterest catalog/pin performance;
- internal product performance;
- Etsy historical organic terms;
- seasonal/event calendar;
- manual SEO research;
- AI-assisted keyword/content analysis.

Each signal must include source, date, confidence, and whether it is safe to act automatically.

## Scoring Model

Every product, collection and image should receive scores.

Product page scores:

- title_score;
- h1_score;
- meta_score;
- description_score;
- structured_data_score;
- media_score;
- internal_linking_score;
- collection_fit_score;
- indexation_score.

Image scores:

- filename_score;
- alt_score;
- page_context_score;
- size_format_score;
- sitemap_eligibility_score;
- pinterest_eligibility_score.

Collection scores:

- product_count_score;
- search_intent_score;
- content_score;
- media_score;
- internal_linking_score;
- feed_readiness_score.

Scores should produce actions, not just numbers.

## Action System

The rule engine should create action suggestions:

- rewrite title;
- rewrite H1;
- rewrite meta description;
- rewrite product intro;
- rewrite alt text;
- prepare image export;
- hold from sitemap;
- add to noindex preview;
- approve for index;
- approve for image sitemap;
- approve for Pinterest export;
- fix structured data;
- improve collection mapping.

Actions must support modes:

- manual;
- suggested;
- one-click draft;
- auto-draft;
- auto-apply only after explicit future approval.

## Approval Safety

The system can draft recommendations automatically, but publishing should remain approval-based until the user intentionally switches a category of repeated actions to automation.

No automatic public SEO change should happen without:

1. rule source;
2. affected object;
3. before/after;
4. reason;
5. approval event;
6. change log.

## Recommended build order

1. Create SEO rule pack data model.
2. Create content template pack data model.
3. Build Product SEO scoring helper.
4. Add /admin/seo-lab dashboard.
5. Add title/meta/description/alt suggestions as drafts.
6. Add approval events for content and SEO changes.
7. Add Search Console and GA4 connectors later.
8. Add Merchant/Pinterest export diagnostics later.
9. Add trend/seasonal/event signal import.
10. Add agent layer only after scoring and approval are stable.

## Current project alignment

This architecture must connect with current screens:

- /admin/indexation;
- /admin/content;
- /admin/media-seo;
- /admin/collections;
- /admin/graph;
- /admin/products/[slug];
- /admin/launch.

The next practical step is not to hardcode SEO rules, but to create a versioned rule/template foundation that can accept future research and service integrations.
