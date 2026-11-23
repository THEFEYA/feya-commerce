export type CheckoutAddress = {
  country: string; region: string | null; city: string; postal_code: string | null;
  line1: string; line2: string | null;
};

/** Hongkong Post addresses use a district and region without a postal code. */
export function checkoutUsesPostalCode(country: string): boolean {
  return country !== 'HK';
}

/** Old checkout versions collected a code for every destination. */
export function shippingPostalCode(address: CheckoutAddress): string | null {
  return checkoutUsesPostalCode(address.country) ? address.postal_code : null;
}
