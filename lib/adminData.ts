import 'server-only';
import { getAdminServiceClient } from '@/lib/adminServerData';
import { isAdminAuthRequired } from '@/lib/supabaseAuth';

export function getAdminReadClient() {
  return getAdminServiceClient();
}

export function getMissingAdminDataEnvMessage() {
  if (isAdminAuthRequired()) {
    return 'Защищённый режим FEYA Admin включён, но для серверного чтения не хватает SUPABASE_SERVICE_ROLE_KEY или NEXT_PUBLIC_SUPABASE_URL.';
  }

  return 'Доступ к данным админки закрыт до настройки обязательного входа владельца.';
}
