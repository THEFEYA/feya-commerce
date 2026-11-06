import { SHOP_PAGE_SIZE, catalogPageHref, type ShopFilters } from '@/lib/shopCatalogNavigation';

export function ShopPagination({ page, count, filters, basePath = '/shop' }: { page: number; count: number; filters: ShopFilters; basePath?: string }) {
  if (count <= SHOP_PAGE_SIZE) return null;
  return <nav aria-label="Catalog pages" className="flex justify-center gap-4 pt-10">
    {page > 1 ? <a className="btn-ghost" href={catalogPageHref(page - 1, filters, basePath)}>Previous 20</a> : null}
    {page * SHOP_PAGE_SIZE < count ? <a className="btn-ghost" href={catalogPageHref(page + 1, filters, basePath)}>Show 20 more</a> : null}
  </nav>;
}
