# Buyer confirmation

Studio tool for preparing a UTF-8 email attachment for one paid customer order. The attachment contains the items and selected options, customer and delivery details, original euro amounts, payment date, shipping service and transit estimate, and the complete policy edition accepted at checkout.

Run with Node 22.6 or later. Supply a private JSON projection of the order on standard input and write the result in a private directory.

```sh
umask 077
node --experimental-strip-types scripts/checkout/buyer-confirmation.ts < paid-order.json > order-confirmation.txt
```

Use the original fields `order_number`, `kind`, `status`, `environment`, `currency`, `created_at`, `paid_at`, `total_minor`, `paid_minor` and `snapshot` from the same order. On success attach the file to the message addressed to the buyer email in the snapshot. Keep any specifically agreed production deadline or other separate agreement with the confirmation. Keep customer exports out of the repository.

The tool checks the paid amount, line amounts, totals, accepted bundle and four source identities. Preserve earlier editions when a policy changes. An older order without an archived edition needs its own original evidence. Email dispatch is a separate studio operation.
