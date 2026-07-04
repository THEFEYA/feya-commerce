# FEYA Vision Focus Agent Plan v1

Date: 2026-07-04

Purpose: use computer vision as an assistant for Listing Master product focus, not as an automatic source of truth.

## Why this exists

The product SEO focus should match both:

1. Product facts from import / component mapping
2. What search systems and visual systems can actually see in product images

A product can have a source title that says festival, rave, armor, or dress, while the primary image visually looks more like Burning Man, futuristic, desert, burlesque, stage performance, drag, warrior, or another visual angle. The SEO workflow needs a safe way to compare the image-based interpretation with the current product DNA and the operator's chosen focus.

## Correct role of the agent

The vision agent is an advisor.

It can suggest:

- visible colors
- visible materials / surface impression
- visible garment parts
- style / visual world
- persona / character impression
- event/context fit
- audience angle
- image SEO opportunities
- mismatches between image and current focus

It must not directly overwrite canonical product DNA.

## Operator workflow

Listing Master should eventually have a button like:

`Analyze primary image`

The result should show:

- Suggested focus chips
- Confidence per axis
- Evidence from image
- Mismatch warnings
- New keyword ideas not currently in the bank
- Apply selected suggestions button

The operator can then:

1. Apply all strong suggestions
2. Apply only some suggestions
3. Ignore the agent
4. Add manual focus chips
5. Save the final decision as a Listing Master draft

## Data flow

Input:

- canonical_product_id
- product_slug
- product title / source title
- existing product focus
- primary_image_url
- optional secondary_image_url / media_gallery
- allowed taxonomy lists from Listing Master

Vision model output:

```json
{
  "visible_parts": ["shoulders", "top", "skirt"],
  "visible_colors": ["gold", "white"],
  "visible_material_impressions": ["metallic", "mirror", "acrylic-like"],
  "event_fit": [
    {"value": "burning man", "confidence": 0.86, "reason": "desert styling and armor-like outfit"},
    {"value": "festival", "confidence": 0.72, "reason": "statement costume styling"}
  ],
  "style_fit": [
    {"value": "futuristic", "confidence": 0.82},
    {"value": "desert", "confidence": 0.70},
    {"value": "post apocalyptic", "confidence": 0.63}
  ],
  "persona_fit": [
    {"value": "warrior", "confidence": 0.75}
  ],
  "audience_fit": [
    {"value": "women", "confidence": 0.60},
    {"value": "men", "confidence": 0.45}
  ],
  "freeform_notes": ["Looks like desert armor styling, not casual clothing"],
  "new_keyword_candidates": ["desert warrior outfit", "futuristic shoulder armor"],
  "warnings": ["Do not call it a dress if the product is top plus skirt unless the page explains it as a set"]
}
```

## Safety rules

- The agent must not invent included pieces.
- The agent can say a product visually resembles a dress, but the product facts decide whether it is a dress, a set, a top, or a skirt.
- If the image suggests a keyword that contradicts component mapping, it becomes a warning, not an automatic keyword.
- If confidence is low, suggestions must be optional.
- Use image analysis as a second opinion for focus and image SEO, not as the final catalog truth.

## Where to implement first

Phase 1: Listing Master advisor

- Add server route: `/api/internal/vision-focus-analyze`
- Protected by internal token
- Uses primary_image_url and current focus as input
- Returns JSON only
- Stores optional analysis snapshot in a safe table later

Phase 2: Decision draft integration

- Allow operator to apply suggestions into manual_focus_json
- Store vision_focus_json inside the decision record or a related table
- Do not change canonical Product DNA automatically

Phase 3: SEO pack generation

- Use vision result as context for:
  - image ALT
  - filename suggestions
  - visual keywords
  - mismatch warnings
  - page copy guardrails

## Recommendation

Implement this after Listing Master keyword decisions are stable and before final SEO pack generation. It is useful now, but it should be an advisor layer first, not a blocking dependency for launch.
