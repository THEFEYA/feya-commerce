// @ts-nocheck

function recordOf(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

export function buildSavedDraftPreviewResult(row: Record<string, any>) {
  const output = recordOf(row.agent_output_snapshot);
  const validation = recordOf(row.validation_result_snapshot);
  const structuralValidation = recordOf(validation.structural_validation);
  const commercialValidation = recordOf(validation.commercial_validation);
  const keywordPlacementValidation = recordOf(validation.keyword_placement_validation);

  return {
    ok: true,
    status: 'saved_draft_loaded',
    read_only: true,
    message: 'Latest saved review draft loaded. OpenAI was not called.',
    saved_draft: {
      id: row.id,
      canonical_product_id: row.canonical_product_id,
      matched_etsy_listing_id: row.matched_etsy_listing_id || null,
      product_slug: row.product_slug || null,
      status: row.status || null,
      review_status: row.review_status || null,
      source_mode: row.source_mode || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    },
    generated_draft_output: output,
    generated_draft_validation: structuralValidation,
    generated_draft_commercial_validation: commercialValidation,
    generated_draft_keyword_placement_validation: keywordPlacementValidation,
    assembled_seo_pack: validation.assembled_seo_pack || null,
    blockers: [],
    openai_generation: {
      ok: false,
      status: 'not_called_saved_snapshot',
      writer_calls: 0,
      editor_calls: 0,
      total_tokens: 0,
    },
    guardrails: [
      'Read-only load from the saved SEO draft snapshot.',
      'No OpenAI call.',
      'No Supabase write.',
      'No Approval, Apply or Publish action.',
    ],
  };
}
