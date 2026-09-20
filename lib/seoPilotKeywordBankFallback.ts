// Compatibility export. The controlled pilot now scans the approved Keyword Bank
// and ranks trusted metric rows against the pilot Product Truth instead of relying
// on a tiny hard-coded exact-phrase list.
export { buildPilotKeywordBankAutoBundle as buildPilotKeywordBankFallbackBundle } from '@/lib/seoPilotKeywordBankAuto';
