# Seller Online technician checklist (v2 — working installation)

One link from the TheFEYA owner opens `https://thefeya.com/partner/seller-online`. No TheFEYA password is needed and the
link gives access to the payment connection only (no orders, customers or site administration).

1. **PayPal account** — choose *PayPal Checkout (REST)* and *Live*. Enter the Client ID and Secret of Seller Online's
   PayPal REST app (PayPal Developer → Apps & Credentials → Live) and the PayPal e-mail that receives TheFEYA payments.
   No REST app? Choose *PayPal Standard* (same fields as WooCommerce/OpenCart: receiving e-mail only).
2. **Store key** — the Seller Online personal key for CMS / personal online stores. Every payment carries
   `custom = FEYA-<order>;opencart:<key>` and `invoice = FEYA-<order>`.
3. **Save and verify** — the system authorizes with PayPal, proves the receiving account accepts EUR with an unpaid
   verification order, and registers its webhook in that PayPal app automatically.
4. **Test payment €1.00** — pay it on PayPal; the server captures and checks amount, currency, payee, invoice and key.
5. **Activate** — becomes available only after a verified live test payment for the current settings. Any later change
   pauses payments until verified again.

Never ask buyers for card data in TheFEYA; cards are entered on PayPal's pages only.
