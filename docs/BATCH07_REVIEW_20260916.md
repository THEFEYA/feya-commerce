# Batch07 — composition corrections and owner axes

The owner reported a missing Belt search chip and an ambiguous Shoulder /
Shoulders confirmation error for the second product. The Belt family already
exists in Product Truth. This change adds the axis to the form, its save
allowlist and keyword matching, without adding database families or metrics.
No measured belt queries were found in the approved bank or commercial metric
import. Belt may be described factually; it has no claimed search volume.

For the owner-confirmed shoulder-and-belt set, the exact two source price rows
now mean Shoulder Armor and Belt. Top stays search-only, and Skirt is not a
sold part. IDs, prices and raw source rows remain intact. This makes current
offer evidence sufficient and removes the need for the ambiguous legacy
composition confirmation on that product.

Two adjacent defects were found while checking this batch's offer contract:
the angel costume's leg bracelets shared the hand-bracelet classification,
and the cosmic costume's upper grouped option inherited belt/garter members.
Both corrections are bounded by product and price-row IDs, independently
supported by raw option labels. They do not select additional owner SEO axes.

The angel costume uses the existing measured `angel bodysuit costume` query
for its complete bodysuit-led character rather than a partial bodysuit query.
Persona, exclusion, current offer and trusted-metric gates still apply.

Validation: 57 focused composition, recommendation, search-axis and previous
correction tests passed. The local TypeScript CLI is unavailable; the Vercel
build remains the compile gate. Browser and saved-draft verification follow
deployment and are recorded in the durable continuation passport.

Four owner decisions were found on receipt. The fifth gold stage product had
no saved decision: do not generate from its defaults. Complete the verified
products and ask only for the missing fifth save. No Apply or publication.
