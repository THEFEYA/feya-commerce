import {readFile} from 'node:fs/promises';
export const accessBoundarySQL=()=>readFile(new URL('../../../supabase/migrations/20260924081403_keyword_metric_access_boundary_v1.sql',import.meta.url),'utf8');
export const accessBoundaryRollbackSQL=()=>readFile(new URL('../fixtures/rollback-metric-access-boundary.sql',import.meta.url),'utf8');
