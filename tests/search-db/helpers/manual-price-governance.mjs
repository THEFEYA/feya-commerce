import {readFile} from 'node:fs/promises';
export {variantDependenciesSQL,ensureExecutionReceiptDependency,repairMigrationSQL,seedManualRepairFixture,ids} from './manual-configuration-repair.mjs';
export const manualPriceGovernanceMigrationSQL=()=>readFile(new URL('../../../supabase/migrations/20260925200000_manual_price_lane_governance_v1.sql',import.meta.url),'utf8');
