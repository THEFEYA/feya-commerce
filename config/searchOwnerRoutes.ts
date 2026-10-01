import type {SearchLandingCandidate} from './searchLandingCandidates.ts';

export type SearchOwnerRouteCode = Extract<
  SearchLandingCandidate['code'],
  | 'SHOULDER_ARMOR'
  | 'FESTIVAL_OUTFITS'
  | 'RAVE_OUTFITS'
  | 'BURNING_MAN_OUTFITS'
  | 'PERFORMANCE_COSTUMES'
  | 'COSTUME_BODYSUITS'
  | 'COSTUME_MASKS'
  | 'COSTUME_HEADPIECES'
  | 'FESTIVAL_SKIRTS'
  | 'COSTUME_BELTS'
>;

export type SearchOwnerRoute = {
  code: SearchOwnerRouteCode;
  currentPath: `/collections/${string}`;
  preferredPath: `/collections/${string}`;
  renameDecision: 'not_required' | 'owner_pending';
};

export const SEARCH_OWNER_ROUTES: readonly SearchOwnerRoute[] = [
  {code:'SHOULDER_ARMOR',currentPath:'/collections/shoulder-armor',preferredPath:'/collections/shoulder-armor',renameDecision:'not_required'},
  {code:'FESTIVAL_OUTFITS',currentPath:'/collections/festival-outfits',preferredPath:'/collections/festival-outfits',renameDecision:'not_required'},
  {code:'RAVE_OUTFITS',currentPath:'/collections/rave-outfits',preferredPath:'/collections/rave-outfits',renameDecision:'not_required'},
  {code:'BURNING_MAN_OUTFITS',currentPath:'/collections/burning-man-looks',preferredPath:'/collections/burning-man-outfits',renameDecision:'owner_pending'},
  {code:'PERFORMANCE_COSTUMES',currentPath:'/collections/stage-outfits',preferredPath:'/collections/performance-costumes',renameDecision:'owner_pending'},
  {code:'COSTUME_BODYSUITS',currentPath:'/collections/bodysuits',preferredPath:'/collections/bodysuits',renameDecision:'not_required'},
  {code:'COSTUME_MASKS',currentPath:'/collections/costume-masks',preferredPath:'/collections/costume-masks',renameDecision:'not_required'},
  {code:'COSTUME_HEADPIECES',currentPath:'/collections/costume-headpieces',preferredPath:'/collections/costume-headpieces',renameDecision:'not_required'},
  {code:'FESTIVAL_SKIRTS',currentPath:'/collections/festival-skirts',preferredPath:'/collections/festival-skirts',renameDecision:'not_required'},
  {code:'COSTUME_BELTS',currentPath:'/collections/costume-belts',preferredPath:'/collections/costume-belts',renameDecision:'not_required'},
] as const;

export const PENDING_SEARCH_OWNER_RENAMES = SEARCH_OWNER_ROUTES.filter(
  (route)=>route.renameDecision==='owner_pending',
);
