'use client';

import { useMemo } from 'react';
import { ShopClient } from '@/components/ShopClient';
import { unpackStorefrontCatalog, type StorefrontCatalogWire } from '@/lib/storefrontCatalogWire';
import type { ShopNavigation } from '@/lib/shopCatalogNavigation';

/**
 * Data-only adapter. ShopClient and all its DOM, filters, state, prices,
 * cards, navigation and visual design remain byte-for-byte unchanged.
 */
export function ShopCatalogWireClient({
  catalog,
  error,
  navigation,
  initialNavigation,
  embedded = false,
}: {
  catalog: StorefrontCatalogWire;
  error?: string;
  navigation?: ShopNavigation;
  initialNavigation?: ShopNavigation;
  embedded?: boolean;
}) {
  const products = useMemo(() => unpackStorefrontCatalog(catalog), [catalog]);
  return <ShopClient
    products={products}
    error={error}
    navigation={navigation}
    initialNavigation={initialNavigation}
    embedded={embedded}
  />;
}
