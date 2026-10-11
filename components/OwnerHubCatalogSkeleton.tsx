/** Neutral, visible and accessible fallback while the shared approved
 * catalogue cache is read. No invented products, prices or category claims.
 */
export function OwnerHubCatalogSkeleton(){
  return <section aria-busy="true" aria-label="Loading catalogue"
    className="owner-hub-products mt-1 border-t border-white/[.08] pb-0 pt-4">
    <p className="mb-5 text-[12px] text-[var(--bone-dim)]" role="status">Loading the pieces…</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0,1,2,3].map(i=><div key={i}
        className="overflow-hidden rounded-xl border border-white/[.08] bg-white/[.018]">
        <div className="aspect-[4/5] animate-pulse bg-[#17171c]"/>
        <div className="space-y-3 p-3">
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/[.08]"/>
          <div className="h-3 w-2/5 animate-pulse rounded bg-white/[.06]"/>
        </div>
      </div>)}
    </div>
  </section>;
}
