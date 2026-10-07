import { emptyDeliveryWorkspace, type DeliveryWorkspaceDraft, type DeliveryCatalogProduct, type DeliveryPreviewRequest } from '../../lib/commerceDeliveryWorkspace.ts';

/** Synthetic scenarios only; never seed these as approved production tariffs. */
export const deliveryIds = {
  product: '10000000-0000-4000-8000-000000000041', other: '10000000-0000-4000-8000-000000000042',
  configuration: '30000000-0000-4000-8000-000000000041', otherConfiguration: '30000000-0000-4000-8000-000000000042',
  shipping: 'a1000000-0000-4000-8000-000000000041', production: 'a2000000-0000-4000-8000-000000000041',
  rule: 'a3000000-0000-4000-8000-000000000041', version: 'a4000000-0000-4000-8000-000000000041',
};
export function syntheticDeliveryWorkspace(): DeliveryWorkspaceDraft {
  const calendar = () => ({ working_weekdays: [1, 2, 3, 4, 5], holidays: [] as string[] });
  return { ...emptyDeliveryWorkspace(), scheduling_time_zone: 'Europe/Madrid', cutoff_local: '16:00',
    dispatch_calendar: calendar(), combination_rule: 'one_parcel_highest_rate', default_shipping_profile_id: deliveryIds.shipping,
    default_production_profile_id: deliveryIds.production,
    shipping_profiles: [{ id: deliveryIds.shipping, name: 'Synthetic shipping', currency: 'EUR', served_countries: ['US', 'AU', 'MX'], max_units_per_parcel: 4,
      rules: [{ id: deliveryIds.rule, scope: 'default', countries: [], postal_prefix: null,
        standard: { amount_minor: 1900, transit: { min: 10, max: 14, unit: 'business_days' }, calendar: calendar() },
        express: { amount_minor: 3500, transit: { min: 7, max: 10, unit: 'business_days' }, calendar: calendar() } }] }],
    production_profiles: [{ id: deliveryIds.production, name: 'Synthetic production', duration: { min: 3, max: 5, unit: 'business_days' }, calendar: calendar(), max_units_per_order: 20, requires_specifications: false }],
  };
}
export const syntheticDeliveryCatalog: DeliveryCatalogProduct[] = [
  { canonical_product_id: deliveryIds.product, title: 'Synthetic product', configurations: [{ configuration_price_id: deliveryIds.configuration, name: 'Synthetic full set', currencies: ['EUR'] }] },
  { canonical_product_id: deliveryIds.other, title: 'Synthetic bulky product', configurations: [{ configuration_price_id: deliveryIds.otherConfiguration, name: 'Synthetic bulky set', currencies: ['EUR'] }] },
];
export function syntheticDeliveryRequest(): DeliveryPreviewRequest {
  return { lines: [{ canonical_product_id: deliveryIds.product, configuration_price_id: deliveryIds.configuration, quantity: 1, specifications_ready: false }], country: 'US', postal_code: '', shipping_method: 'standard' };
}
