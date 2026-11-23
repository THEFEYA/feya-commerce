import type {StorefrontProduct} from '../types.ts';
import {productColorChoices} from '../bonanzaColorChoices.ts';
import {verifiedColorPriceRows} from '../bonanzaColorPriceExceptions.ts';
import {optionCompareAtPrice, sortedOptions} from '../storefront.ts';
import {configurationIdentity, priceCartLine, type CartLineInput} from './catalogLinePricing.ts';
import {CheckoutPricingError} from './pricing.ts';

export type CartColourChoice = {
  code: string; label: string; configuration_id: string; config: string;
  unit_minor: number; compare_at_minor: number | null;
};
export type CartColourRecovery = {line_id: string; title: string; choices: CartColourChoice[]};

export class SavedColourError extends CheckoutPricingError {
  readonly recovery: CartColourRecovery;
  constructor(recovery: CartColourRecovery) {
    super('checkout_color_invalid');
    this.recovery = recovery;
  }
}

/** Only a quote suggests replacements. Creating an order still requires a valid buyer selection. */
export function priceCartLineForQuote(product: StorefrontProduct, line: CartLineInput) {
  try {
    return priceCartLine(product, line);
  } catch (error) {
    if (!(error instanceof CheckoutPricingError) || !['checkout_color_invalid','checkout_option_unpriced'].includes(error.message)) throw error;
    const options = sortedOptions(product);
    const original = options.find(option => configurationIdentity(option) === line.configuration_id);
    const pricedColours = verifiedColorPriceRows(product.canonical_product_id, options);
    if (error.message === 'checkout_option_unpriced' &&
        (!original || !pricedColours?.length || original.configuration_color === line.color)) throw error;
    const choices: CartColourChoice[] = [];
    let title = '';
    for (const {code, label} of productColorChoices(product)) {
      const option = pricedColours === null ? original : pricedColours.find(row => row.configuration_color === label);
      if (!option) continue;
      const configuration_id = configurationIdentity(option);
      const pair = line.paired_selection;
      try {
        // In a genuine pair both partners use the same approved palette; their final choices are independent.
        const priced = priceCartLine(product, {...line, configuration_id, color: label, color_code: code,
          paired_selection: pair ? {women: {...pair.women, color: code}, men: {...pair.men, color: code}} : null});
        const compare = optionCompareAtPrice(option);
        choices.push({code, label, configuration_id, config: priced.option_label, unit_minor: priced.unit_minor,
          compare_at_minor: compare != null && Math.round(compare * 100) > priced.unit_minor ? Math.round(compare * 100) : null});
        title = priced.title;
      } catch (candidateError) {
        if (!(candidateError instanceof CheckoutPricingError)) throw candidateError;
      }
    }
    throw new SavedColourError({line_id: line.id, title, choices});
  }
}
