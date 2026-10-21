/** Independent owner release gate for customer-money movement.
 *
 * Provider technicians may configure credentials and complete a sanctioned
 * EUR 1.00 connection test without access to owner data. A provider test alone
 * cannot approve taxes, legal trader/controller disclosure or carrier coverage.
 * Production customer checkout remains disabled until the owner signs off on
 * those independent commerce prerequisites.
 *
 * Only affects production; automated isolated test environments retain their
 * dedicated synthetic payment fixtures.
 */
export function isPaidCommerceReleaseApproved(
  env:Record<string,string|undefined>=process.env,
):boolean{
  return env.VERCEL_ENV!=='production'
    ||env.FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED==='true';
}
