import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

type UnknownRecord = Record<string, unknown>;

type RecordOpenAiInvocationArgs = {
  actionCode: string;
  domainOwner: string;
  sourceEndpoint: string;
  runId?: string | null;
  dryRun: boolean;
  itemCount: number;
  modelRequested: string;
  promptVersion?: string | null;
  httpStatus?: number | null;
  latencyMs?: number | null;
  payload?: unknown;
  invocationStatus?: 'RESPONSE_RECEIVED' | 'USAGE_UNAVAILABLE' | 'HTTP_ERROR';
  metadata?: UnknownRecord;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNonNegativeInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.trunc(value);
}

function extractUsage(payload: unknown) {
  const response = asRecord(payload);
  const usage = asRecord(response?.usage);
  const inputDetails = asRecord(usage?.input_tokens_details);
  const outputDetails = asRecord(usage?.output_tokens_details);

  return {
    responseId: asString(response?.id),
    modelResolved: asString(response?.model),
    inputTokens: asNonNegativeInteger(usage?.input_tokens),
    cachedInputTokens: asNonNegativeInteger(inputDetails?.cached_tokens),
    outputTokens: asNonNegativeInteger(usage?.output_tokens),
    reasoningOutputTokens: asNonNegativeInteger(outputDetails?.reasoning_tokens),
    totalTokens: asNonNegativeInteger(usage?.total_tokens),
  };
}

/**
 * Best-effort operational metering for model calls.
 *
 * This intentionally stores no prompt or response content and never throws back
 * into the business workflow after a model call has already happened. Retrying
 * a successful model call only because metering failed would increase cost.
 */
export async function recordOpenAiInvocation(args: RecordOpenAiInvocationArgs) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.warn('[ai-usage] service-role client unavailable; invocation usage was not persisted');
      return false;
    }

    const usage = extractUsage(args.payload);
    const invocationStatus =
      args.invocationStatus ||
      (usage.totalTokens == null ? 'USAGE_UNAVAILABLE' : 'RESPONSE_RECEIVED');

    const { error } = await supabase.rpc('feya_fn_record_ai_invocation_v1', {
      p_action_code: args.actionCode,
      p_domain_owner: args.domainOwner,
      p_source_endpoint: args.sourceEndpoint,
      p_run_id: args.runId || null,
      p_dry_run: args.dryRun,
      p_item_count: Math.max(0, Math.trunc(args.itemCount || 0)),
      p_model_requested: args.modelRequested,
      p_model_resolved: usage.modelResolved,
      p_prompt_version: args.promptVersion || null,
      p_response_id: usage.responseId,
      p_invocation_status: invocationStatus,
      p_http_status: args.httpStatus ?? null,
      p_input_tokens: usage.inputTokens,
      p_cached_input_tokens: usage.cachedInputTokens,
      p_output_tokens: usage.outputTokens,
      p_reasoning_output_tokens: usage.reasoningOutputTokens,
      p_total_tokens: usage.totalTokens,
      p_latency_ms:
        typeof args.latencyMs === 'number' && Number.isFinite(args.latencyMs)
          ? Math.max(0, Math.trunc(args.latencyMs))
          : null,
      p_metadata_json: {
        usage_schema: 'openai_responses_v1',
        deployment_environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        ...(args.metadata || {}),
      },
    });

    if (error) {
      console.warn('[ai-usage] failed to persist invocation usage:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      '[ai-usage] unexpected metering failure:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return false;
  }
}
