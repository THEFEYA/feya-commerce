#!/usr/bin/env python3
"""READ-ONLY preflight for TheFEYA -> Bonanza staged source exports.

This does not connect to Bonanza or Supabase and never publishes listings.
Run from repository root:
    python scripts/bonanza/preflight_review_only.py
"""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / "docs" / "marketplaces" / "bonanza" / "staging"


def load_csv(filename: str) -> list[dict[str, str]]:
    with (STAGING / filename).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    products = load_csv("thefeya_products_207_REVIEW_ONLY.csv")
    variants = load_csv("thefeya_variants_856_REVIEW_ONLY.csv")
    repairs = load_csv("option_label_repair_suggestions_856_REVIEW_ONLY.csv")
    problems: list[str] = []
    if len(products) != 207:
        problems.append(f"Expected 207 products, got {len(products)}")
    if len(variants) != 856:
        problems.append(f"Expected 856 variants, got {len(variants)}")
    if len(repairs) != 856:
        problems.append(f"Expected 856 label-audit rows, got {len(repairs)}")

    product_ids = [p["thefeya_product_id"] for p in products]
    variant_ids = [v["variant_id"] for v in variants]
    repair_ids = [v["variant_id"] for v in repairs]
    skus = [v["bonanza_variant_sku"] for v in variants]
    external_ids = [p["bonanza_external_id"] for p in products]
    for name, xs in [("product ID", product_ids),
                     ("Bonanza external ID", external_ids),
                     ("variant ID", variant_ids),
                     ("variant SKU", skus),
                     ("repair variant ID", repair_ids)]:
        if len(xs) != len(set(xs)):
            problems.append(f"Duplicate {name} detected")

    idset = set(product_ids)
    counts = Counter()
    wrong_currency = 0
    unpriced = 0
    for v in variants:
        if v["thefeya_product_id"] not in idset:
            problems.append(f"Orphan variant {v['variant_id']}")
        counts[v["thefeya_product_id"]] += 1
        try:
            src = Decimal(v["source_amount_eur"])
            dest = Decimal(v["bonanza_amount_usd"])
            if src != dest or dest <= 0 or dest.as_tuple().exponent != -2:
                problems.append(f"Price parity/precision: {v['variant_id']}")
        except (InvalidOperation, KeyError):
            unpriced += 1
        if v.get("currency_conversion") != "NO_CONVERSION":
            wrong_currency += 1
        if v.get("publish_gate") != "HOLD_NOT_FOR_UPLOAD":
            problems.append(f"UNSAFE variant gate: {v['variant_id']}")
    if unpriced:
        problems.append(f"{unpriced} variant(s) lack valid decimal price")
    if wrong_currency:
        problems.append(f"{wrong_currency} unexpected FX rules")

    for p in products:
        pid = p["thefeya_product_id"]
        if counts[pid] != int(p["option_count"]):
            problems.append(f"Variant count mismatch for {pid}")
        if len(p["bonanza_title_80"]) > 80:
            problems.append(f"Bonanza title exceeds 80 chars for {pid}")
        if not p["approved_description"].strip():
            problems.append(f"No approved description for {pid}")
        if not p["primary_image"].startswith("https://"):
            problems.append(f"Missing image for {pid}")
        if p.get("publish_gate") != "HOLD_NOT_FOR_UPLOAD":
            problems.append(f"UNSAFE product gate: {pid}")

    repair_variant_ids = set(repair_ids)
    if set(variant_ids) != repair_variant_ids:
        problems.append("Repair suggestions do not cover exact active offer variants")

    summary = {
        "products": len(products),
        "variants": len(variants),
        "label_review_rows": len(repairs),
        "confirmed_category_ids": dict(Counter(
            p["bonanza_category_candidate_id"] or "PENDING" for p in products
        )),
        "option_label_placeholder_products": sum(
            p["placeholder_option_label"] == "YES" for p in products
        ),
        "duplicate_option_label_products": sum(
            p["duplicate_option_label"] == "YES" for p in products
        ),
        "problem_count": len(problems),
        "publishable": False,
        "notes": "Structurally valid does not mean eligible for Bonanza CSV/API import.",
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if problems:
        print("ERRORS:")
        for err in problems[:60]:
            print(f" - {err}")
        return 1
    print("PASS: staging structure & numeric price parity. UPLOAD REMAINS BLOCKED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
