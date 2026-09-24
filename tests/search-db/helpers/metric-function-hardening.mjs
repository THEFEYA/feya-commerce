import {readFile} from 'node:fs/promises';
export const functionHardeningSQL=()=>readFile(new URL('../../../supabase/migrations/20260924005636_keyword_metric_function_search_path_v1.sql',import.meta.url),'utf8');
export const functionHardeningRollbackSQL=()=>readFile(new URL('../fixtures/rollback-metric-function-hardening.sql',import.meta.url),'utf8');
