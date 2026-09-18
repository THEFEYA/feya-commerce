// @ts-nocheck
import { NextResponse } from 'next/server';
import { POST as generateCatalogDraft } from '@/app/api/admin/seo-engine/catalog-draft-generate/route';
import { POST as saveDraft } from '@/app/api/admin/seo-engine/draft-save/route';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_PRODUCT_IDS = new Set([
  'c35b5b75-7e6e-492b-9528-6a126384086e',
  '067628e8-3ecd-4979-8501-6da61ca2f51a',
  '043406cd-0a96-45c5-8796-57c5cc4b276e',
  '7e77810b-ee7d-46a4-91af-f24d1adcfd4a',
  '2b8d122f-5830-4bc6-8e11-7e3ae594c9b2',
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = String(url.searchParams.get('product_id') || '').trim();

  if (!ALLOWED_PRODUCT_IDS.has(productId)) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_allowed',
      product_id: productId || null,
    }, { status: 403 });
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json({
      ok: false,
      status: 'missing_service_role_client',
      product_id: productId,
    }, { status: 503 });
  }

  const { data: existingDraft, error: existingDraftError } = await serviceClient
    .from('feya_commerce_seo_pack_drafts_v1')
    .select('id, canonical_product_id, status, review_status, source_mode, created_at')
    .eq('canonical_product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingDraftError) {
    return NextResponse.json({
      ok: false,
      status: 'existing_draft_check_failed',
      product_id: productId,
      error: existingDraftError.message,
    }, { status: 503 });
  }

  if (existingDraft?.id) {
    return NextResponse.json({
      ok: true,
      status: 'skipped_existing_draft',
      product_id: productId,
      existing_draft: existingDraft,
      writer_calls: 0,
      save_calls: 0,
    });
  }

  const generationRequest = new Request(
    new URL('/api/admin/seo-engine/catalog-draft-generate', request.url),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        enforce_portfolio_strategy: false,
      }),
    },
  );

  const generationResponse = await generateCatalogDraft(generationRequest);
  const generationPayload = await generationResponse.json();

  if (!generationResponse.ok || !generationPayload?.ok || !generationPayload?.generated_draft_output) {
    return NextResponse.json({
      ok: false,
      status: 'generation_not_saved',
      stage: 'generation',
      product_id: productId,
      generation_http_status: generationResponse.status,
      generation_status: generationPayload?.status || null,
      blockers: generationPayload?.blockers || [],
      validation: generationPayload?.generated_draft_validation || null,
      commercial_validation: generationPayload?.generated_draft_commercial_validation || null,
      keyword_placement_validation: generationPayload?.generated_draft_keyword_placement_validation || null,
      pipeline_telemetry: generationPayload?.pipeline_telemetry || null,
      writer_calls: generationPayload?.pipeline_telemetry?.normal_writer_calls ?? 1,
      save_calls: 0,
    }, { status: generationResponse.status });
  }

  const saveRequest = new Request(
    new URL('/api/admin/seo-engine/draft-save', request.url),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        dry_run: false,
        source_mode: 'openai_draft',
        agent_output: generationPayload.generated_draft_output,
      }),
    },
  );

  const saveResponse = await saveDraft(saveRequest);
  const savePayload = await saveResponse.json();

  if (!saveResponse.ok || !savePayload?.ok) {
    return NextResponse.json({
      ok: false,
      status: 'generated_but_save_failed',
      stage: 'save',
      product_id: productId,
      save_http_status: saveResponse.status,
      save_status: savePayload?.status || null,
      blockers: savePayload?.blockers || [],
      validation_result: savePayload?.validation_result || null,
      generated_draft_output: generationPayload.generated_draft_output,
      pipeline_telemetry: generationPayload?.pipeline_telemetry || null,
      writer_calls: generationPayload?.pipeline_telemetry?.normal_writer_calls ?? 1,
      save_calls: 1,
    }, { status: saveResponse.status });
  }

  return NextResponse.json({
    ok: true,
    status: 'batch14_draft_generated_and_saved',
    product_id: productId,
    saved_draft: savePayload.saved_draft || null,
    saved_event: savePayload.saved_event || null,
    generation_status: generationPayload.status || null,
    save_status: savePayload.status || null,
    pipeline_telemetry: generationPayload?.pipeline_telemetry || null,
    writer_calls: generationPayload?.pipeline_telemetry?.normal_writer_calls ?? 1,
    save_calls: 1,
    publish_calls: 0,
    apply_calls: 0,
  }, { status: 201 });
}
