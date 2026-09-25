import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import {
  getAdminAuthConfigStatus,
  getSupabaseAuthServerClient,
  isAdminAuthRequired,
} from '@/lib/supabaseAuth';
import { isOwnerActionAuthRequired } from '@/lib/ownerActionStepUpPolicy';

function parseCsv(value: string | undefined) {
  return new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type OwnerActionConfigStatus = ReturnType<typeof getOwnerActionConfigStatus>;

export function getOwnerActionConfigStatus() {
  const auth = getAdminAuthConfigStatus();
  const serviceRoleConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const actionSwitchEnabled = process.env.FEYA_OWNER_ACTIONS_ENABLED === 'true';
  const actionAuthRequired = isOwnerActionAuthRequired(process.env);

  const blockers: string[] = [];
  if (!actionAuthRequired) blockers.push('защищённая авторизация owner actions ещё не включена');
  if (!auth.allowlistConfigured) blockers.push('allowlist владельца не настроен');
  if (!auth.supabaseUrlConfigured || !auth.publicKeyConfigured) blockers.push('Supabase Auth настроен не полностью');
  if (!serviceRoleConfigured) blockers.push('серверный защищённый исполнитель не настроен');
  if (!actionSwitchEnabled) blockers.push('переключатель owner actions остаётся выключенным');

  return {
    ...auth,
    serviceRoleConfigured,
    actionSwitchEnabled,
    actionAuthRequired,
    fullAdminAuthRequired: isAdminAuthRequired(),
    ready: blockers.length === 0,
    blockers,
  };
}

export async function requireOwnerActionActor() {
  const config = getOwnerActionConfigStatus();

  if (!isOwnerActionAuthRequired(process.env)) {
    return { ok: false as const, status: 423, code: 'owner_action_auth_disabled', error: 'Owner actions are locked until protected step-up authentication is enabled.' };
  }

  if (!config.actionSwitchEnabled) {
    return { ok: false as const, status: 423, code: 'owner_actions_disabled', error: 'Owner actions are intentionally disabled.' };
  }

  if (!config.allowlistConfigured) {
    return { ok: false as const, status: 403, code: 'owner_allowlist_missing', error: 'Owner allowlist is not configured.' };
  }

  const authClient = await getSupabaseAuthServerClient();
  if (!authClient) {
    return { ok: false as const, status: 503, code: 'auth_client_unavailable', error: 'Supabase Auth server client is unavailable.' };
  }

  const { data, error } = await authClient.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims) {
    return { ok: false as const, status: 401, code: 'authentication_required', error: 'Authentication required.' };
  }

  const userId = typeof claims.sub === 'string' ? claims.sub.trim().toLowerCase() : '';
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  const allowedUserIds = parseCsv(process.env.FEYA_ADMIN_ALLOWED_USER_IDS);
  const allowedEmails = parseCsv(process.env.FEYA_ADMIN_ALLOWED_EMAILS);

  if (!userId || (!allowedUserIds.has(userId) && !allowedEmails.has(email))) {
    return { ok: false as const, status: 403, code: 'owner_not_allowed', error: 'Authenticated account is not authorized for FEYA owner actions.' };
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return { ok: false as const, status: 503, code: 'service_role_unavailable', error: 'Protected server executor is unavailable.' };
  }

  return {
    ok: true as const,
    userId,
    email,
    service,
    config,
  };
}
