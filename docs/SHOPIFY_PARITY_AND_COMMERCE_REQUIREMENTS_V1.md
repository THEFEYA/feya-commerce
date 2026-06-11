# FEYA Commerce — Shopify Parity & Commerce Requirements v1

Status: strategic requirements guardrail  
Purpose: make sure FEYA Commerce can grow from catalog preview into a real sellable commerce system  
Current implementation phase: read-only catalog/admin preview

---

## 1. Honest project position

FEYA Commerce is not yet a Shopify replacement today.

Current working system is Phase B:

- real products load from Supabase;
- public storefront preview works;
- PDP preview works;
- admin review queues work;
- admin product overview works;
- no write actions yet;
- no cart/checkout yet;
- no payment/shipping/order system yet.

The goal is to build toward Shopify-level operational capability, but in a safer phased way.

---

## 2. Target principle

The target admin must support the normal capabilities expected from a serious e-commerce admin, plus FEYA-specific product intelligence.

Baseline Shopify-like capability:

- create products;
- duplicate/copy products;
- edit product content;
- upload/manage photos;
- upload/manage video later;
- manage variants/options;
- manage prices;
- manage inventory/availability;
- manage collections;
- manage SEO fields;
- manage shipping/tax/payment settings;
- see orders;
- see customers;
- see discounts;
- manage policies;
- connect analytics and feeds.

FEYA-specific capability above Shopify baseline:

- Etsy import memory;
- source evidence preservation;
- product DNA;
- component/set logic;
- configuration vs component separation;
- sampler/probnik exclusion;
- fallback price evidence quality;
- AI/styled imagery disclosure;
- content snippets and approval workflow;
- SEO/GEO/AI readiness;
- media readiness;
- change impact tracking;
- task packs and action queues;
- future marketplace/feed readiness.

---

## 3. Product admin requirements

### 3.1 Product creation

Future admin must support:

- create product from scratch;
- create product from imported Etsy source listing;
- duplicate existing product;
- duplicate existing product with new SEO/photo strategy;
- create product as draft;
- mark product as not publishable;
- archive product.

### 3.2 Product editing

Future Product Builder must support editing:

- public title;
- H1;
- SEO title;
- meta description;
- slug;
- product type;
- material;
- color;
- sizing mode;
- production profile;
- shipping profile;
- handmade/styled imagery flags;
- description blocks;
- snippets;
- readiness status.

All important edits must be logged.

### 3.3 Media management

Future media admin must support:

- upload images;
- reorder gallery;
- select primary card image;
- assign image roles;
- add/edit alt text;
- mark AI/styled images;
- flag low quality images;
- connect image to product/configuration;
- upload/manage video later;
- prepare feed-safe image set.

### 3.4 Options, variants and configurations

Future Product Builder must support:

- configuration/set options;
- size options;
- color options;
- material options;
- price per configuration;
- fallback price warning;
- sampler/probnik exclusion;
- whole-product mode when there are no meaningful options;
- future buy-box selector.

Important rule:

Components are not always customer-facing options. Internal components and customer-facing configurations must remain separate.

### 3.5 Pricing

Future admin must support:

- real collected price as primary evidence;
- fallback price status;
- manual approved price;
- discount simulation;
- currency handling;
- future cost/margin calculation;
- shipping impact;
- price change log.

### 3.6 Collections and merchandising

Future admin must support:

- manual collections;
- SEO landing collections;
- shop by piece;
- shop by occasion;
- shop by style;
- shop by color/material;
- featured products;
- related products;
- complete-the-look logic;
- product sorting/positioning.

---

## 4. Storefront requirements

Public storefront must eventually support:

- homepage;
- shop/collection pages;
- product pages;
- filters;
- sorting;
- search;
- product recommendations;
- related products;
- SEO metadata;
- JSON-LD structured data;
- sitemap/robots;
- policy pages;
- cart;
- checkout;
- payment;
- shipping estimates;
- order confirmation;
- email notifications later.

Current storefront is not final visual or commerce checkout. It is a real data-backed catalog preview.

---

## 5. Checkout, payments and shipping

These are not safe to fake.

They must be implemented only after catalog and Product Builder foundations are stable.

Future decisions required:

- payment provider suitable for the business/legal setup;
- payment methods;
- currency strategy;
- shipping zones;
- shipping rates;
- express/standard shipping logic;
- duties/taxes responsibility messaging;
- VAT/IOSS/tax strategy if applicable;
- return/refund policy pages;
- order emails.

Important:

A visual checkout button is not enough. Payment/shipping must be tested end-to-end with real provider sandbox or production-safe mode.

---

## 6. Admin areas required for Shopify-level operation

Future left navigation should include at least:

1. Dashboard / Command Center
2. Products
3. Product Builder
4. Import Center
5. Review Queues
6. Media QA
7. Content / SEO / AI
8. Collections / Merchandising
9. Pricing / Profit
10. Feed / Channels
11. Orders
12. Customers
13. Discounts
14. Shipping
15. Payments
16. Policies
17. Analytics
18. Tasks / Work Queue
19. Change Log
20. Settings

Some sections can be placeholders first, but the roadmap must preserve them.

---

## 7. Phasing

### Phase B — current

- read-only storefront;
- read-only PDP;
- read-only review queues;
- read-only product overview;
- no edits;
- no checkout.

### Phase C — visual pass

- improve UI/UX over real data;
- preserve all real data flows;
- no mock replacement;
- no checkout yet.

### Phase D — Product Builder read-only detail

- one admin detail page per product;
- all product data in structured blocks;
- no edits yet.

### Phase E — controlled editing

- edit product drafts;
- approve content;
- approve price/configurations;
- edit media roles;
- log all changes.

### Phase F — commerce foundation

- cart model;
- checkout provider decision;
- shipping model;
- tax/policy pages;
- order records;
- customer records.

### Phase G — production commerce

- payment integration;
- shipping integration or shipping rules;
- order notifications;
- order admin;
- customer/admin workflows;
- analytics and feeds.

---

## 8. Confidence and risk

What can be trusted now:

- the catalog data foundation is real;
- Supabase safe views are working;
- Vercel deploy is working;
- read-only storefront and admin preview are real.

What cannot be promised yet:

- that payments work before payment provider integration is built and tested;
- that shipping is calculated before shipping rules/providers are built and tested;
- that the admin is Shopify-equivalent before Product Builder, media upload, editing, orders, customers and checkout are implemented.

Correct expectation:

This project can become a real Shopify-level replacement, but only if built in stages and not rushed into a fake visual shell.

---

## 9. Non-negotiable safety rule

Do not add public buy buttons, checkout promises, payment messages or shipping guarantees before the actual commerce backend is implemented and tested.

Do not let visual work create fake functionality.

Every visible commerce action must eventually connect to real data and real workflows.
