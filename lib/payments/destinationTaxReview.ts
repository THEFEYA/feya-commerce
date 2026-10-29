/**
 * Seller-Online LLC is the confirmed legal seller of thefeya.com purchases.
 * Their 2026-10-29 reply establishes PA sales-tax treatment, while the original
 * payment pricing contract has no product- and destination-specific tax.
 *
 * The PA Department of Revenue's 2026 guidance lists taxable costumes and
 * county-dependent rates (6% PA; 7% Allegheny; 8% Philadelphia).
 * This narrowly prevents an unpriced PA charge until independently approved
 * tax classification and destination mapping exist. It never changes a buyer
 * price, appends 6% indiscriminately, or disables other destinations.
 *
 * API: pure, safe to import in the browser; the server rechecks before creating
 * any payment order (the client is never authoritative).
 */
export function requiresPennsylvaniaTaxReview(country: string | null | undefined, region: string | null | undefined): boolean {
  return country?.trim().toUpperCase() === 'US' && region?.trim().toUpperCase() === 'PA';
}
