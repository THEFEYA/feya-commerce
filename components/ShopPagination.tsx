import { SHOP_PAGE_SIZE, shopPageHref, type ShopFilters } from '@/lib/shopCatalogNavigation';

export function ShopPagination({ page, count, filters }: { page: number; count: number; filters: ShopFilters }) {
  if (count <= SHOP_PAGE_SIZE) return null;
  return <nav aria-label="Catalog pages" className="flex justify-center gap-4 pt-10">
    {page > 1 ? <a className="btn-ghost" href={shopPageHref(page - 1, filters)}>Previous 20</a> : null}
    {page * SHOP_PAGE_SIZE < count ? <a className="btn-ghost" href={shopPageHref(page + 1, filters)}>Show 20 more</a> : null}
  </nav>;
}
