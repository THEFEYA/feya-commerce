import type { StorefrontProduct } from './types';
import {
  resolveStorefrontSellableOffer,
  sellableOfferIncludedLabels,
} from './storefrontSellableOffer.ts';

type EvidenceRow = Record<string, unknown>;

const NON_CONFIGURATION_AXES = /\b(?:size|colour|color|material|quantity|length)\b/i;
const FULL_SET = /^(?:the\s+)?full\s+(?:set|outfit|look|costume)$/i;
const CYRILLIC = /[\u0400-\u04ff]/;
const COMBINATION_SEPARATOR = /\s*(?:&|\+|\/|\band\b)\s*/i;

export function storefrontIncludedOptions(
  product: StorefrontProduct,
  activeConfiguration?: Record<string, unknown> | null,
) {
  const currentOffer = resolveStorefrontSellableOffer(product);
  if (currentOffer.source_available) {
    return sellableOfferIncludedLabels(currentOffer, activeConfiguration);
  }

  const record = product as Record<string, unknown>;
  const sourceVariationLabels = variationLabels(record.canonical_source_variations);
  const labels = uniqueStrings(
    sourceVariationLabels.length
      ? sourceVariationLabels
      : optionRowLabels(record.canonical_option_price_rows),
  ).filter((label) => !CYRILLIC.test(label));
  const pieceLabels = labels.filter((label) => !FULL_SET.test(label));
  const fullSetChecklist = removeRedundantCombinationChoices(pieceLabels);

  if (!pieceLabels.length) return [];
  if (!activeConfiguration || isFullConfiguration(activeConfiguration)) return fullSetChecklist;

  const activeRawLabel = firstString(
    activeConfiguration.raw_option_value,
    activeConfiguration.raw_option_text,
    activeConfiguration.public_label,
    activeConfiguration.configuration_label,
    activeConfiguration.configuration_name,
    activeConfiguration.option_value,
  );
  if (!activeRawLabel || FULL_SET.test(activeRawLabel)) return fullSetChecklist;

  const exact = pieceLabels.find((label) => label.localeCompare(activeRawLabel, undefined, {
    sensitivity: 'base',
  }) === 0);
  return exact ? [exact] : [];
}

function variationLabels(value: unknown) {
  const rows = evidenceRows(value);
  const grouped = rows.flatMap((row) => {
    const axis = firstString(
      row.raw_variation_name,
      row.variation_name,
      row.option_name,
      row.name,
      row.axis,
    );
    if (axis && NON_CONFIGURATION_AXES.test(axis)) return [];

    const values = Array.isArray(row.values)
      ? row.values
      : Array.isArray(row.options)
        ? row.options
        : [];
    return values.map(rawLabel).filter(Boolean) as string[];
  });

  const individual = rows.flatMap((row) => {
    const axis = firstString(
      row.raw_variation_name,
      row.variation_name,
      row.option_name,
      row.axis,
      row.detected_canonical_axis,
    );
    if (axis && NON_CONFIGURATION_AXES.test(axis)) return [];
    return [
      firstString(
        row.raw_value,
        row.raw_option_value,
        row.raw_option_text,
        row.option_value,
      ),
    ].filter(Boolean) as string[];
  });

  return [...grouped, ...individual];
}

function optionRowLabels(value: unknown) {
  return evidenceRows(value).flatMap((row) => {
    const axis = firstString(row.option_name, row.raw_option_name, row.variation_name);
    if (axis && NON_CONFIGURATION_AXES.test(axis)) return [];
    return [
      firstString(row.raw_option_value, row.raw_option_text, row.option_value),
    ].filter(Boolean) as string[];
  });
}

function evidenceRows(value: unknown): EvidenceRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is EvidenceRow => Boolean(item) && typeof item === 'object');
}

function rawLabel(value: unknown) {
  if (typeof value === 'string') return clean(value);
  if (!value || typeof value !== 'object') return '';
  const row = value as EvidenceRow;
  return firstString(row.raw_value, row.raw_option_value, row.raw_option_text, row.value, row.label);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && clean(value)) return clean(value);
  }
  return '';
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeRedundantCombinationChoices(labels: string[]) {
  const normalizedLabels = new Set(labels.map(normalized));
  return labels.filter((label) => {
    const parts = label
      .split(COMBINATION_SEPARATOR)
      .map(clean)
      .filter(Boolean);
    if (parts.length < 2) return true;
    return !parts.every((part) => normalizedLabels.has(normalized(part)));
  });
}

function normalized(value: string) {
  return clean(value).toLocaleLowerCase();
}

function isFullConfiguration(configuration: Record<string, unknown>) {
  if (configuration.is_full_set === true) return true;
  return [
    configuration.raw_option_value,
    configuration.raw_option_text,
    configuration.public_label,
    configuration.configuration_label,
    configuration.configuration_name,
    configuration.option_value,
  ].some((value) => typeof value === 'string' && FULL_SET.test(clean(value)));
}
