import { getSupabaseReadClient } from '@/lib/supabase';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

export function getAdminReadClient() {
  if (isAdminAuthRequired()) {
    return getSupabaseServiceRoleClient();
  }

  return getSupabaseReadClient();
}

export function getMissingAdminDataEnvMessage() {
  if (isAdminAuthRequired()) {
    return 'Защищённый режим FEYA Admin включён, но для серверного чтения не хватает SUPABASE_SERVICE_ROLE_KEY или NEXT_PUBLIC_SUPABASE_URL.';
  }

  return 'Для текущего режима просмотра админки не настроены переменные Supabase для чтения.';
}
