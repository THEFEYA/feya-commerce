import {
  classifySeoProductPresentation,
  hasWholeProductEntity,
  mentionedConfirmedComponents,
} from './seoProductPresentation.ts';

export type SeoCommercialCopyIssue = {
  code: string;
  severity: 'warning' | 'blocker';
  message: string;
};

export type SeoCommercialCopyValidation = {
  ok: boolean;
  status: 'valid' | 'warning' | 'blocked';
  issues: SeoCommercialCopyIssue[];
  benefit_categories_found: string[];
  repetition_report?: {
    repeated_idea_groups: Array<{ idea: string; blocks: string[] }>;
    near_duplicate_sentence_pairs: Array<{ left: string; right: string; similarity: number }>;
  };
};

export type SeoCommercialCopyContext = {
  product_truth?: unknown;
  manual_focus?: unknown;
  keyword_roles?: unknown;
};

const WEAK_STYLING_FILLER = /\b(works? well as a focal (?:piece|point)|works? as a centerpiece|part of a complete look|over minimal clothing|pairs? with simple clothing|easy to build into (?:a|the) (?:look|outfit)|easy to style|can be a focal (?:piece|point)|works? with many looks|completes? the look|creates? a clear accent|without (?:additional|extra) (?:design )?(?:elements|details|pieces|accessories)|adds? an accent without)\b/i;
const AUDIT_OR_ADMIN_LANGUAGE = /\b(product truth|product truth confirms?|product truth indicates?|owner[- ]approved|story confirms?|confirmed|the product description (?:says|states|lists|mentions|indicates)|the source (?:says|states|lists|mentions|indicates)|official product data|source data|database fields?|safe wording|safest wording|material basis|final copy should|must be confirmed|should be confirmed|requires? verification|needs? verification|should be reviewed before publish|requires? review before publish|review before publish|before publication|before publish|listed as|is listed as|indicated as|specified as)\b/i;
const GUARANTEED_POPULARITY = /\b(guarantee(?:d|s)?|will get likes|will receive likes|will gain followers?|will make you popular|go viral|viral reach|more followers?|gain followers?|more likes|become popular|increase your popularity|guaranteed attention|everyone will notice|all eyes will be on you|guaranteed reactions?)\b/i;
const EMPTY_HYPE = /\b(premium|luxury|ultimate|perfect|best|must[- ]have|crafted to perfection|elevate your look)\b/i;
const EMPTY_OR_INTERNAL_BUYER_COPY = /\b(studio[- ]created from an original in[- ]house concept|studio[- ]created design based on an original in[- ]house concept|based on an original concept (?:created|developed) in[- ]house|buyers? looking for (?:a|an|this|the)|body[- ]friendly feel|studio styling|studio fit|statement piece|strong festival statement|structured (?:gold |metallic )?accent|bold (?:gold |metallic )?accent|TheFEYA gives us a way|TheFEYA\s+(?:we|our|us)\b|clean armored attitude|desert[- ]ready (?:mood|presence)|shoulder[- ]led|reads? fast|open light|direct choice for buyers?|holds? its presence|visually strong|deliberate high[- ]impact character|more considered than mass[- ]market|wear with confidence|visual noise|clarity (?:and|or) individuality|clarity of (?:the |your )?(?:look|outfit|image|style)|expressive accent|one[- ]and[- ]only (?:shoulder )?line|more (?:considered|thoughtful) (?:look|appearance) than mass[- ]produced|(?:original|distinctive) alternative to (?:a )?(?:standard|generic|mass[- ]produced) costume (?:look|piece|design))\b/i;
const AWKWARD_EDITORIAL_SHORTHAND = /\b(?:clear finish|strong visual finish|strong,?\s+sculpted feel|complete look with confidence|reads? clearly in photographs?|photos? (?:pick|picks) up more depth|photo moments?|bold appearance|themed nights?|shows? up (?:cleanly|clearly)|for (?:burning man|festival|rave) styling|visual expressiveness)\b|\bwithout (?:losing|sacrificing) (?:its |the |your )?(?:visual )?(?:impact|expressiveness|presence)\b/i;
const INTERNAL_TARGETING_LANGUAGE = /\b(?:persona|lean(?:s|ing)? into|dress(?:es|ing)? in (?:a |an )?[\w-]+ direction|(?:style|styling|creative|costume|warrior|festival) direction)\b/i;
const SEARCH_QUERY_AUDIENCE_PHRASING = /\b(?:(?:women|men|buyers|shoppers|customers)\s+(?:looking|searching)\s+for|buyers?\s+who\s+want)\b/i;
const COORDINATED_OUTFIT_JARGON = /\bcoordinated\b[^.!?\n]{0,35}\b(?:look|costume|outfit|set|base)\b/i;
const EMPTY_BOLD_FINISH = /\bbold(?:\s+\w+){0,2}\s+(?:color|colour|finish|event look)\b/i;
const STAGE_READY_GEOMETRY = /\bstage[- ]ready\s+(?:shape|silhouette)\b/i;
const PLUS_SIZE_CLAIM = /\bplus[- ]size\b/i;
const CODE_OWNED_PURCHASE_OPTION_COPY = /\b(?:available|sold|ordered|purchased|buy|bought)\b[^.!?\n]{0,55}\b(?:separately|together|individually|full set)\b|\b(?:separately|individually)\s+or\s+together\b|\bfull set\b|\b(?:separate|individual|separately selectable)\s+(?:pieces?|parts?|components?)\b|\b(?:pieces?|parts?|components?)\s+(?:are|remain|is)\s+(?:separate|available separately|separately selectable)\b|\b(?:pieces?|parts?|components?)\b[^.!?\n]{0,55}\b(?:wear|worn|style|styled|order|ordered|buy|bought)\b[^.!?\n]{0,35}\b(?:separately|together|individually)\b|\b(?:wear|style|order|buy)\b[^.!?\n]{0,55}\b(?:pieces?|parts?|components?)\b[^.!?\n]{0,35}\b(?:separately|together|individually)\b|\b(?:shoulders?|skirt|top|headpiece|leg covers?)\b[^.!?\n]{0,90}\b(?:restyle|separately|on its own)\b/i;
const DIRECTIONAL_VISUAL_AUDIT = /\b(?:(?:left|right)[- ](?:shoulder|side|arm|leg)|(?:positioned|placed|located|sits?) (?:high|low|on the (?:left|right))|(?:clearly |well )?visible from (?:the )?(?:front|back|side)|seen from (?:the )?(?:front|back|side))\b/i;
const ANATOMICAL_DESIGN_AUDIT = /\b(?:sculptural (?:profile|silhouette|line) of (?:the )?(?:left|right|one)?\s*shoulder|expressive upper[- ]body (?:form|line|profile|silhouette)|upper[- ]body (?:form|line|profile|silhouette|frame)|shoulder[- ]line|shoulder silhouette)\b/i;
const UNNATURAL_EVENT_ATMOSPHERE = /\b(?:desert light|open light|desert[- ]ready|ready for (?:the )?desert)\b/i;
const BRAND_STATUS_DIMINUTION = /\b(?:small|tiny) independent (?:team|studio|company|brand)\b/i;
const BRAND_INDEPENDENCE_PADDING = /\bindependent (?:design )?(?:team|studio|company|brand)\b/i;
const TEMPLATE_COMPARISON = /\b(?:(?:standard|generic|mass[- ]produced) costume template|(?:standard|generic) festival basics|generic festival dressing|standard template costume|(?:not\s+)?(?:a\s+)?(?:copy|replica)(?:\s+of\s+(?:a\s+)?(?:standard|generic|named|existing)?\s*(?:costume|character|template|look))?|without\s+(?:borrowing|copying)\b[^.!?\n]{0,65}\b(?:character|look|design|costume)\b|stands? apart from (?:a )?(?:basic|generic) (?:metallic )?(?:look|costume|outfit|design)|(?:generic|basic|ordinary|plain) (?:festival |costume |party )?(?:dressing|clothes?|outfits?|looks?)\b[^.!?\n]{0,55}\b(?:plain|basic|generic|ordinary|unfinished|on its own))\b/i;
const PRODUCT_COMPONENT_AS_BUYER_GOAL = /\b(?:buyers?|customers?|people) (?:who want|looking for|seeking) (?:to (?:buy|find) )?(?:a|an|this|the)?\s*(?:statement |expressive |gold |futuristic |cyberpunk |warrior )*(?:shoulder (?:piece|armor|armour)|shoulders?|pauldrons?)\b/i;
const SOCIAL_METRICS_BOILERPLATE = /\b(organic attention|reactions?, saves? (?:and|or) comments?|likes?, followers?|social (?:engagement|metrics?)|viral(?:ity| reach)?)\b/i;
const REDUNDANT_FAUX_LEATHER = /\b(?:vegan leather\s+(?:and|or|\/)\s+faux leather|faux leather\s+(?:and|or|\/)\s+vegan leather)\b/i;
const CUSTOMER_MATERIAL_TERM = /\b(?:vegan leather|faux leather)\b/i;
const REFLECTIVE_CLAIM = /\b(?:reflective|retroreflective|retro-reflective)\b/i;
const ABSTRACT_VISUAL_PSEUDO_BENEFIT = /\b(?:harder|stronger|more\s+(?:finished|intentional|individual)|intentional)\s+(?:warrior\s+|costume\s+)?(?:look|outfit|costume|appearance)\b|\b(?:turns?|helps?\s+turn)\b[^.!?\n]{0,70}\b(?:vision|idea|theme|direction|base look)\b[^.!?\n]{0,55}\b(?:look|outfit|costume)\b|\banchors?\b[^.!?\n]{0,65}\b(?:look|outfit|costume)\b|\b(?:skip|without building)\b[^.!?\n]{0,60}\b(?:full uniform|head[- ]to[- ]toe costume)\b|\bwithout building\b[^.!?\n]{0,70}\b(?:from separate finds|from scratch)\b|\bfeel(?:s|ing)? dressed for the occasion\b|\b(?:design|styling|shape)\b[^.!?\n]{0,45}\bmakes? it easier to choose\b|\bmakes? sense with (?:the )?outfit\b|\b(?:focal piece|focal point|photographs? well|wide shots?)\b|\bmatching\b[^.!?\n]{0,45}\b(?:pieces?|components?)\b[^.!?\n]{0,80}\b(?:same|repeat)\b[^.!?\n]{0,45}\b(?:color|colour|finish)\b|\bphotographs? as one outfit instead of separate (?:pieces?|add[- ]ons?)\b|\b(?:visible\s+)?(?:waist|belt|shoulder|skirt)\s+(?:detail|shape|line)\b[^.!?\n]{0,75}\b(?:natural break|changing tops?|restyle)\b/i;
const UNSUPPORTED_COMPONENT_COVERAGE = /\b(?:shoulders?|skirt|components?|pieces?)\b[^.!?\n]{0,65}\b(?:keep|keeps|leave|leaves)\s+(?:more\s+of\s+)?(?:your|the)\s+(?:clothing|outfit|body)\s+visible\b/i;
const ABSTRACT_VISUAL_BENEFIT = /\b(contrast and visual depth|adds? contrast|creates? visual depth|harder,? more dramatic line|firm armored presence|armored presence|individual feel|shape a look that feels deliberate|one bold detail to define|dramatic line|holds? its presence|visually strong|deliberate high[- ]impact character|more considered than mass[- ]market|wear with confidence|visual noise|clarity of (?:the |your )?(?:look|outfit|image|style)|expressive accent|more (?:considered|thoughtful) (?:look|appearance) than mass[- ]produced)\b/i;
const PILOT_ROBOTIC_LANGUAGE = /\b(?:clear visual depth|body[- ]facing feel|that is where TheFEYA lives|clear point of view|warrior presence|character[- ]first look|festival or cosplay wearer|the comfortable against the body feel|own story on arrival|multi[- ]component (?:outfit|costume|product|set)|for buyers? (?:building|creating|planning)|belongs at [^.!?\n]{0,60}\bcosplay)\b/i;
const BARE_FESTIVAL_SUFFIX = /\bfor festival\s*$/i;
const SHAPE_DURING_MOVEMENT = /\b(?:holds?|keeps?|maintains?|preserves?) (?:its |the |their )?(?:shape|form) (?:during|while|in) (?:movement|motion|moving)\b/i;
const CONSTRUCTION_TERM = /\b(?:construction|structure|structured|build quality|reinforced build|built to last)\b/i;
const USE_CASE_AS_BENEFIT = /\b(?:works?|ideal|made|suited) for\b.*\b(styling|looks?|warrior|futuristic|desert|festival|stage|performance|photoshoot|editorial|cosplay|party)\b/i;
const UNGROUNDED_STORE_PROMISE = /\b(best prices?|lowest prices?|competitive prices?|special prices?|bulk discounts?|volume discounts?|tax[- ]free|tax refund|excellent service|best service|wide assortment|large assortment|largest selection|fastest delivery)\b/i;
const BRAND_PATTERN = /\bTheFEYA\b/gi;
const GENERIC_EVENT_PATTERN = /\bevents?\b/gi;
const DESIGN_BENEFIT_PATTERN = /\b(studio[- ]created|studio[- ]designed|studio[- ]made|designed in our studio|designed by our (?:team|studio)|our original design ideas?|original design ideas?|original studio design|distinctive studio design|signature studio design|handmade|made[- ]to[- ]order|not mass[- ]produced|mass[- ]produced costume|mass production|designer studio)\b/i;
const SELF_EXPRESSION_PATTERN = /\b(self[- ]expression|individuality|visual identity|personal style|your own look|make (?:it|this|the (?:piece|set|outfit|design|look|character)) (?:your|their) own|feels? personal|feels? like (?:you|them)|made for your vision|designed for your vision|studio visual language|adapt(?:ed|able)|customi[sz](?:e|ed|ation))\b/i;
const REDUNDANT_SHOULDER_ENTITY_PATTERN = /\bshoulders?\s+(?:armor|armour|piece|pieces|pauldron|pauldrons)\b/gi;
const AWKWARD_FINISH_AND_SHAPE = /\b(?:glossy|mirror[- ]like|metallic|gold)\b[^.!?]{0,45}\b(?:finish|surface|coating)\s+and\s+(?:a\s+)?(?:silhouette|shape|profile)\b/i;
const DUPLICATE_STAGE_PERFORMANCE_FASHION = /\b(?:festival,?\s*)?stage,?\s+and\s+performance\s+fashion\b/i;
const IDEAL_FOR_PRODUCT_DETAIL = /\b(?:accent|silhouette|finish|surface|coating|construction|structured|structure|base layers?|statement piece|shoulder armor|shoulder armour|shoulder piece|harness(?:\s+and|\/|\s+with)?\s+skirt|component combination|built around|calls? for|when you want)\b/i;
const IDEAL_FOR_CONTEXT = /\b(?:performers?|dancers?|djs?|showgirls?|drag performers?|drag queens?|pole dancers?|go-go dancers?|cosplayers?|actors?|artists?|creators?|bloggers?|show ballets?|dance troupes?|event productions?|costume studios?|festivals?|burning man|raves?|stage shows?|dance performances?|theatrical productions?|theatre|theater|music videos?|video clips?|tv shows?|film costumes?|photoshoots?|editorial|costume parties?|nightclubs?|galas?|events?|performances?|productions?|women|woman|men|people)\b/i;
const CONTROLLED_EVENT_FOCUS_FAMILIES: Array<{ key: string; aliases: string[] }> = [
  { key: 'rave', aliases: ['rave', 'raves'] },
  { key: 'edm', aliases: ['edm'] },
  { key: 'edc', aliases: ['edc', 'electric daisy carnival'] },
  { key: 'coachella', aliases: ['coachella'] },
  { key: 'halloween', aliases: ['halloween'] },
  { key: 'cosplay', aliases: ['cosplay', 'cosplayer', 'cosplayers'] },
  { key: 'pride', aliases: ['pride'] },
  { key: 'drag', aliases: ['drag queen', 'drag queens', 'drag performer', 'drag performers'] },
  { key: 'costume party', aliases: ['costume party', 'costume parties'] },
];

const CONTROLLED_STYLE_FOCUS_FAMILIES: Array<{ key: string; aliases: string[] }> = [
  { key: 'fantasy', aliases: ['fantasy'] },
  { key: 'historical', aliases: ['historical', 'medieval', 'renaissance'] },
  { key: 'steampunk', aliases: ['steampunk'] },
  { key: 'cyberpunk', aliases: ['cyberpunk', 'cyber punk'] },
  { key: 'futuristic', aliases: ['futuristic'] },
  { key: 'post-apocalyptic', aliases: ['post-apocalyptic', 'post apocalyptic', 'apocalyptic'] },
  { key: 'goth', aliases: ['goth', 'gothic'] },
];

const ALT_STYLING_FAMILIES: Array<{ key: string; aliases: string[] }> = [
  { key: 'cape_or_cloak', aliases: ['cape', 'cloak'] },
  { key: 'goggles_or_glasses', aliases: ['goggles', 'safety glasses', 'protective glasses', 'eyewear'] },
  { key: 'mask_or_face_covering', aliases: ['mask', 'face mask', 'face covering', 'bandana'] },
  { key: 'footwear', aliases: ['shoes', 'boots', 'heels', 'sneakers', 'footwear'] },
  { key: 'underwear', aliases: ['underwear', 'briefs', 'boxers'] },
  { key: 'trousers_or_shorts', aliases: ['trousers', 'pants', 'shorts'] },
  { key: 'shirt', aliases: ['shirt', 't shirt', 't-shirt'] },
  { key: 'unsold_base_layer', aliases: ['base layer', 'base garment', 'bodysuit', 'leotard'] },
];

const IDEAL_BUYER_ROLE_FAMILIES: string[][] = [
  ['festival-goer', 'festival-goers'],
  ['burning man attendee', 'burning man attendees'],
  ['performer', 'performers'],
  ['dancer', 'dancers'],
  ['dj', 'djs'],
  ['show artist', 'show artists'],
  ['content creator', 'content creators', 'creator', 'creators'],
  ['costume stylist', 'costume stylists', 'stylist', 'stylists'],
  ['actor', 'actors'],
  ['cosplayer', 'cosplayers'],
  ['drag performer', 'drag performers', 'drag queen', 'drag queens'],
  ['showgirl', 'showgirls'],
];

const STYLING_FLEXIBILITY_PATTERN = /\b(?:choose|add|change|pair|wear|style)\s+(?:it\s+)?with\s+your\s+own\s+(?:makeup|jewelry|jewellery|accessories|bodysuit|footwear|headpiece)|\b(?:change|swap|switch)\s+(?:your\s+|the\s+)?base layers?\b|\b(?:restyle|restyled|restyling)\b[^.!?\n]{0,70}\b(?:different|another|your own)\s+(?:base layers?|tops?|clothing)\b|\b(?:wear|pair|style)\b[^.!?\n]{0,60}\b(?:different|another|your own)\s+(?:base layers?|tops?|clothing)\b[^.!?\n]{0,60}\b(?:restyle|change|swap|switch)\b|\b(?:separate|individual|separately selectable)\s+(?:parts?|pieces?|components?)\b[^.!?\n]{0,90}\b(?:change|swap|switch|restyle|wear|choose|order|buy|replace|reorder)\b|\b(?:parts?|pieces?|components?)\s+(?:are|remain|is)\s+(?:separate|available separately|separately selectable)\b[^.!?\n]{0,90}\b(?:change|swap|switch|restyle|wear|choose|order|buy|replace|reorder)\b|\b(?:skirt|shoulders?|top|harness|corset|helmet|mask|garters?|arm pieces?|leg pieces?)\s+(?:is|are)\s+(?:separate|available separately|separately selectable)\b[^.!?\n]{0,100}\b(?:change|swap|switch|restyle|wear|choose|order|buy|replace|reorder)\b|\bleaves?\s+(?:the\s+)?(?:face|neckline|rest of the outfit)\s+open\s+for\b/i;

const FOCUS_VALUE_ALIASES: Record<string, string[]> = {
  men: ['men', 'mens', "men's", 'male'],
  women: ['women', 'womens', "women's", 'woman', 'female', 'ladies'],
  performer: ['performer', 'performers', 'performance', 'stage artist'],
  dancer: ['dancer', 'dancers', 'dance'],
  dj: ['dj', 'djs'],
  showgirl: ['showgirl', 'showgirls', 'show artist'],
  'drag queen': ['drag queen', 'drag queens', 'drag performer', 'drag performers'],
  'pole dancer': ['pole dancer', 'pole dancers', 'pole dance'],
  'go-go dancer': ['go-go dancer', 'go-go dancers', 'gogo dancer', 'gogo dancers'],
  cosplayer: ['cosplayer', 'cosplayers', 'cosplay'],
  creator: ['creator', 'creators', 'blogger', 'bloggers'],
  warrior: ['warrior', 'warrior-inspired'],
  'burning man': ['burning man'],
  festival: ['festival', 'festivals'],
  rave: ['rave', 'raves'],
  stage: ['stage', 'stage show', 'stage shows'],
  edm: ['edm'],
  edc: ['edc', 'electric daisy carnival'],
  coachella: ['coachella'],
  halloween: ['halloween'],
  cosplay: ['cosplay', 'cosplayer', 'cosplayers'],
  pride: ['pride'],
  photoshoot: ['photoshoot', 'photoshoots', 'photo shoot', 'photo shoots'],
};

const BENEFIT_CATEGORIES: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'studio_design_and_craft',
    pattern: DESIGN_BENEFIT_PATTERN,
  },
  {
    key: 'easy_dressing_and_adjustment',
    pattern: /\b(quick|easy|easier) to (?:put on|take off|adjust|wear)|\b(adjustable|adjusts|straps?|body shapes?)\b/i,
  },
  {
    key: 'fit_flexibility',
    pattern: /\b(custom fit|custom sizing|custom measurements?|body shape|body shapes|secure fit|closer fit|fit around|room to adjust|flexible fit)\b/i,
  },
  {
    key: 'comfort',
    pattern: /\b(soft against the body|soft body[- ]facing|comfortable|comfort|body[- ]facing|gentle on the body|easy to wear)\b/i,
  },
  {
    key: 'durability_structure',
    pattern: /\b(durable|durability|reinforced|doubled|strong construction|structured (?:material|construction|build)|shape retention|holds? its (?:shape|form)|keeps? its (?:shape|form)|long[- ]lasting|between wears|resists? creasing|structured without feeling rigid)\b/i,
  },
  {
    key: 'verified_finish_behavior',
    pattern: /\b(reflective|mirror[- ]like finish|mirror finish|metallic finish|glossy finish|gold finish|silver finish|catches? (?:(?:available|ambient|stage) )?(?:day)?light|picks? up (?:available |ambient |stage )?light|light[- ]catching|metal[- ]like appearance)\b/i,
  },
  {
    key: 'styling_flexibility',
    pattern: STYLING_FLEXIBILITY_PATTERN,
  },
  {
    key: 'movement_in_wear',
    pattern: /\b(?:skirt|panels?|fringe|draping|fabric)\b[^.!?\n]{0,90}\b(?:moves?|swings?|flows?)\b|\b(?:moves?|swings?|flows?)\b[^.!?\n]{0,90}\b(?:walk|dance|turn|motion|photographs?|photos?|stage)\b/i,
  },
  {
    key: 'wearer_framing',
    pattern: /\b(?:frames?|draws? attention to)\b[^.!?\n]{0,70}\b(?:face|neckline|shoulders?|upper body)\b/i,
  },
];
const PRACTICAL_BENEFIT_CATEGORIES = new Set([
  'easy_dressing_and_adjustment',
  'fit_flexibility',
  'comfort',
  'durability_structure',
  'verified_finish_behavior',
  'styling_flexibility',
  'movement_in_wear',
  'wearer_framing',
]);
const BENEFIT_OUTCOME_PATTERNS: Record<string, RegExp> = {
  studio_design_and_craft: /\b(original|distinctive|recognizable|recognisable|feels? (?:like you|personal|true to (?:you|your style))|your own (?:style|look)|designed by our (?:team|studio))\b/i,
  easy_dressing_and_adjustment: /\b(quick|easy|easier) to (?:put on|take off|adjust|wear)|\b(stays? in place|sits? securely|more secure|secure fit|room to adjust|different body shapes?)\b/i,
  fit_flexibility: /\b(secure fit|closer fit|fit around|room to adjust|different body shapes?|custom measurements?|flexible fit)\b/i,
  comfort: /\b(comfortable|comfort|soft against the body|soft body[- ]facing|gentle on the body|easier to wear)\b/i,
  durability_structure: /\b(holds? its (?:shape|form)|keeps? its (?:shape|form)|shape retention|between wears|resists? creasing|long[- ]lasting|less likely to (?:crease|collapse|lose its shape)|ready for repeat (?:wear|use)|repeat (?:wear|use)|future wears?)\b/i,
  verified_finish_behavior: /\b(catches? (?:(?:available|ambient|stage) )?(?:day)?light|picks? up (?:available |ambient |stage )?light|light[- ]catching|shows? clearly in photos?|looks? brighter in photos?|photographs? brighter(?: outdoors| in daylight)?|visible under (?:stage |event )?lighting|keeps? details? visible|helps? (?:product )?details? (?:stay|remain) visible|details? (?:stay|remain) visible)\b/i,
  styling_flexibility: STYLING_FLEXIBILITY_PATTERN,
  movement_in_wear: /\b(?:moves?|swings?|flows?)\b[^.!?\n]{0,90}\b(?:walk|dance|turn|motion|photographs?|photos?|stage)\b/i,
  wearer_framing: /\b(?:frames?|draws? attention to)\b[^.!?\n]{0,70}\b(?:face|neckline|shoulders?|upper body)\b/i,
};

const CROSS_BLOCK_IDEAS: Array<{ key: string; pattern: RegExp }> = [
  {
    key: 'studio_authorship',
    pattern: /\b(studio[- ]created|original in[- ]house|signature studio|young independent team|designers and makers|handmade|made[- ]to[- ]order|mass[- ]market|mass[- ]produced)\b/i,
  },
  {
    key: 'reflective_finish',
    pattern: /\b(reflective|mirror[- ]like|glossy|metallic|catches? light|reads? clearly in photos?|camera[- ]friendly)\b/i,
  },
  {
    key: 'silhouette_shape',
    pattern: /\b(sculptural|silhouette|structured shape|defined shape|warrior profile|futuristic profile|upper[- ]body frame)\b/i,
  },
  {
    key: 'stage_camera_visibility',
    pattern: /\b(camera[- ]friendly|reads? clearly in photos?|visible (?:from a distance|under (?:stage |event )?lighting)|strong visual presence|memorable (?:on stage|in photos?|visual identity))\b/i,
  },
  {
    key: 'fit_and_adjustability',
    pattern: /\b(adjustable|strap|fit|secure|comfortable|body shape|custom measurements?)\b/i,
  },
  {
    key: 'durability_and_structure',
    pattern: /\b(durable|reinforced|shape retention|keeps? its shape|strong construction|supportive feel)\b/i,
  },
  {
    key: 'self_expression',
    pattern: /\b(self[- ]expression|individuality|visual identity|personal style|your own look|distinctive studio style)\b/i,
  },
  {
    key: 'base_layer_styling',
    pattern: /\b(?:base|basic|simple|underlying)\s+layers?\b|\bwhat (?:you|the wearer) wear(?:s)? underneath\b|\blayer underneath\b|\b(?:swap|change|keep|show|leave)[^.!?\n]{0,80}\b(?:sleeves?|bodysuit|boots?|briefs?|leggings?|jewelry|jewellery|footwear)\b|\b(?:boots?|briefs?|leggings?)\b[^.!?\n]{0,55}\b(?:layer|underneath|skin|fabric)\b/i,
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'been', 'being', 'but', 'by', 'can', 'created', 'designed',
  'for', 'from', 'has', 'have', 'helps', 'in', 'into', 'is', 'it', 'its', 'made', 'more', 'of', 'on', 'or', 'our',
  'piece', 'product', 'that', 'the', 'their', 'this', 'to', 'we', 'while', 'with', 'you', 'your', 'look', 'looks',
]);

export function validateSeoCommercialCopy(
  draft: unknown,
  context: SeoCommercialCopyContext = {},
): SeoCommercialCopyValidation {
  const issues: SeoCommercialCopyIssue[] = [];
  const record = isRecord(draft) ? draft : {};
  const blocks = Array.isArray(record.pdp_blocks) ? record.pdp_blocks.filter(isRecord) : [];
  const leftBlocks = blocks.filter((block) => block.placement === 'left_description');
  const customerText = [
    record.seo_title,
    record.h1,
    record.meta_description,
    record.intro,
    ...leftBlocks.map((block) => block.heading),
    ...leftBlocks.map((block) => block.body),
    ...(Array.isArray(record.bullet_highlights) ? record.bullet_highlights : []),
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join('\n');
  const altText = (Array.isArray(record.image_alt_candidates) ? record.image_alt_candidates : [])
    .filter(isRecord)
    .map((candidate) => typeof candidate.alt_text === 'string' ? candidate.alt_text : '')
    .filter(Boolean)
    .join('\n');

  if (AUDIT_OR_ADMIN_LANGUAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_internal_audit_language',
      'Customer-facing copy contains source, Product Truth, verification, database, review, or pre-publication language.',
    ));
  }

  if (GUARANTEED_POPULARITY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_guarantees_popularity_or_reactions',
      'Customer-facing copy must not guarantee likes, followers, popularity, viral reach, press, sales, or audience reactions.',
    ));
  }

  if (EMPTY_OR_INTERNAL_BUYER_COPY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_robotic_or_tautological_value',
      'Customer-facing copy contains an internal-process phrase, tautology, or vague pseudo-benefit that does not help a buyer decide.',
    ));
  }

  if (ABSTRACT_VISUAL_PSEUDO_BENEFIT.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_abstract_visual_pseudobenefit',
      'Customer-facing copy uses a comparative visual adjective or an idea-to-look transformation without a concrete, supported buyer result.',
    ));
  }

  if (PILOT_ROBOTIC_LANGUAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_pilot_robotic_language',
      'Customer-facing copy repeats abstract wording found in the failed pilot. State the product fact or buyer result in plain, idiomatic English.',
    ));
  }

  if (CODE_OWNED_PURCHASE_OPTION_COPY.test(customerText)) {
    issues.push(blocker(
      'customer_copy_repeats_code_owned_purchase_options',
      'Purchase combinations belong only to the selector and deterministic What’s Included block. Generated copy must use this space for a different buyer value.',
    ));
  }

  if (UNSUPPORTED_COMPONENT_COVERAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_infers_unsupported_component_coverage',
      'Do not infer coverage or how much clothing or body remains visible from a component shape. State only an explicitly verified wear or styling outcome.',
    ));
  }

  if (
    AWKWARD_EDITORIAL_SHORTHAND.test(customerText)
    || COORDINATED_OUTFIT_JARGON.test(customerText)
    || EMPTY_BOLD_FINISH.test(customerText)
    || STAGE_READY_GEOMETRY.test(customerText)
  ) {
    issues.push(blocker(
      'customer_copy_contains_robotic_editorial_jargon',
      'Customer-facing copy contains abstract fashion shorthand without a concrete buyer benefit. Describe the real product, use case, fit, comfort, material, or design value instead.',
    ));
  }

  if (INTERNAL_TARGETING_LANGUAGE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_uses_internal_targeting_language',
      'Customer-facing copy uses persona or direction as an internal targeting label. Turn the selected focus into a natural occasion, role, or outfit need.',
    ));
  }

  if (SEARCH_QUERY_AUDIENCE_PHRASING.test(customerText)) {
    issues.push(blocker(
      'customer_copy_reads_like_search_query',
      'Audience copy reads like a pasted search query. Address a real use case or buyer need in natural editorial language.',
    ));
  }

  if (DIRECTIONAL_VISUAL_AUDIT.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_alt_only_directional_detail',
      'Left/right position, viewing angle and visibility coordinates belong only in image ALT or internal visual truth, not commercial product copy.',
    ));
  }

  if (ANATOMICAL_DESIGN_AUDIT.test(customerText)) {
    issues.push(blocker(
      'customer_copy_uses_anatomical_geometry_as_value',
      'Anatomical geometry such as a shoulder line or upper-body form is not a buyer benefit. Start from the complete event or style look instead.',
    ));
  }

  if (UNNATURAL_EVENT_ATMOSPHERE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_forces_event_into_unnatural_atmosphere',
      'Event focus must describe a real use case. Desert light, open light and desert-ready are unnatural keyword-driven atmosphere phrases.',
    ));
  }

  if (BRAND_STATUS_DIMINUTION.test(customerText)) {
    issues.push(blocker(
      'customer_copy_minimizes_brand_status',
      'Do not describe TheFEYA as small or tiny. Company size is not a buyer benefit.',
    ));
  }

  if (BRAND_INDEPENDENCE_PADDING.test(customerText)) {
    issues.push(blocker(
      'customer_copy_uses_independence_as_padding',
      'Independent is generic brand padding here. Explain original studio design and what it gives the wearer instead.',
    ));
  }

  if (TEMPLATE_COMPARISON.test(customerText)) {
    issues.push(blocker(
      'customer_copy_uses_invented_template_comparison',
      'Do not compare the design with an undefined standard costume template. Explain how original design helps the buyer build a personal look.',
    ));
  }

  if (PRODUCT_COMPONENT_AS_BUYER_GOAL.test(customerText)) {
    issues.push(blocker(
      'customer_copy_reverses_buyer_goal_to_product_component',
      'Buyers are seeking a complete event, style or performance look. Present the product component as the means, not as the buyer’s final goal.',
    ));
  }

  if (SOCIAL_METRICS_BOILERPLATE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_social_metrics_boilerplate',
      'Product copy must not discuss organic attention, reactions, saves, comments, followers, virality, or other social-performance metrics.',
    ));
  }

  if (REDUNDANT_FAUX_LEATHER.test(customerText)) {
    issues.push(blocker(
      'customer_copy_stacks_vegan_and_faux_leather_synonyms',
      'Vegan leather and faux leather are customer-facing synonyms here and must not be presented as two separate materials.',
    ));
  }

  if (UNGROUNDED_STORE_PROMISE.test(customerText)) {
    issues.push(blocker(
      'customer_copy_contains_ungrounded_store_promise',
      'Price, tax, discount, service, assortment, or delivery-superiority claims require a separate approved store policy and must not be invented in product copy.',
    ));
  }

  const productTruthText = flattenText(context.product_truth).join(' ');
  if (
    context.product_truth != null
    && PLUS_SIZE_CLAIM.test(customerText)
    && !PLUS_SIZE_CLAIM.test(productTruthText)
  ) {
    issues.push(blocker(
      'unsupported_plus_size_claim',
      'Plus-size positioning must be explicitly confirmed as such by Product Truth. A selected keyword or an inferred interpretation of size codes is not product evidence.',
    ));
  }
  if (
    context.product_truth != null
    && REFLECTIVE_CLAIM.test(`${customerText}\n${altText}`)
    && !REFLECTIVE_CLAIM.test(productTruthText)
  ) {
    issues.push(blocker(
      'unsupported_reflective_finish_claim',
      'Reflective or retroreflective behavior is not confirmed by Product Truth. Glossy, mirror-like, metallic, and light-catching are different claims.',
    ));
  }

  if (context.product_truth != null && altText) {
    const includedComponentText = includedProductComponentText(context.product_truth);
    const unsupportedAltItems = ALT_STYLING_FAMILIES
      .filter((family) => family.aliases.some((alias) => containsPhrase(altText, alias)))
      .filter((family) => !family.aliases.some((alias) => containsPhrase(includedComponentText, alias)))
      .map((family) => family.key);
    if (unsupportedAltItems.length) {
      issues.push(blocker(
        'image_alt_mentions_unsold_styling_item',
        `ALT mentions styling that is not confirmed in the sold Product DNA (${unsupportedAltItems.join(', ')}). Lead with the sold component and omit model accessories, base clothing and props.`,
      ));
    }
  }

  ['seo_title', 'h1', 'meta_description'].forEach((field) => {
    const value = typeof record[field] === 'string' ? record[field] : '';
    if (/\bTheFEYA\b/i.test(value)) {
      issues.push(blocker(
        `${field}_uses_brand_padding`,
        `${field} must describe the product and must not use TheFEYA as repeated brand padding.`,
      ));
    }
  });
  const approvedKeywordText = flattenText(context.keyword_roles).join(' ');
  if (!CUSTOMER_MATERIAL_TERM.test(approvedKeywordText)) {
    (['seo_title', 'h1'] as const).forEach((field) => {
      const value = typeof record[field] === 'string' ? record[field] : '';
      if (CUSTOMER_MATERIAL_TERM.test(value)) {
        issues.push(blocker(
          `${field}_uses_unselected_material_padding`,
          `${field} adds a material qualifier that is not present in the approved keyword roles. Keep the customer’s selected product and occasion intent primary; the fixed material panel already carries this fact.`,
        ));
      }
    });
  }

  ['h1', 'meta_description'].forEach((field) => {
    const value = typeof record[field] === 'string' ? record[field] : '';
    const repeatedShoulderEntities = value.match(REDUNDANT_SHOULDER_ENTITY_PATTERN) || [];
    if (repeatedShoulderEntities.length > 1) {
      issues.push(blocker(
        `${field}_restates_same_product_entity`,
        `${field} names the shoulder product twice through equivalent terms. Use the product entity once and add only a different verified attribute or use case.`,
      ));
    }
  });

  const metaDescription = typeof record.meta_description === 'string' ? record.meta_description : '';
  if (AWKWARD_FINISH_AND_SHAPE.test(metaDescription)) {
    issues.push(blocker(
      'meta_description_coordinates_finish_with_shape',
      'Meta description grammatically joins a surface finish with silhouette or shape as if they were one attribute. State the complete product identity and use case, then add one clear differentiator.',
    ));
  }

  (['seo_title', 'h1'] as const).forEach((field) => {
    const value = typeof record[field] === 'string' ? record[field].trim() : '';
    if (BARE_FESTIVAL_SUFFIX.test(value)) {
      issues.push(blocker(
        `${field}_uses_bare_festival_suffix`,
        `${field} ends with the unnatural phrase “for Festival”. Use an idiomatic plural or modifier such as “for festivals” or “festival costume”.`,
      ));
    }
  });

  if (DUPLICATE_STAGE_PERFORMANCE_FASHION.test(customerText)) {
    issues.push(blocker(
      'customer_copy_duplicates_stage_and_performance_fashion',
      'Stage fashion and performance fashion are redundant in this brand sentence. Use the approved phrase “festival and stage fashion”.',
    ));
  }

  validateWholeProductPresentation(record, context.product_truth, blocks, issues);

  const selectedEventFocus = focusEventValues(context.manual_focus);
  const h1 = typeof record.h1 === 'string' ? record.h1 : '';
  if (selectedEventFocus.length && !selectedEventFocus.some((event) => focusValueAppears(h1, event))) {
    issues.push(blocker(
      'h1_missing_operator_event_focus',
      `H1 must use one operator-selected event focus naturally (${selectedEventFocus.join(', ')}). Prefer the product entity for the selected event over a low-intent construction detail.`,
    ));
  }
  if (selectedEventFocus.length) {
    const selected = new Set(selectedEventFocus.map((value) => value.toLowerCase()));
    const leaked = CONTROLLED_EVENT_FOCUS_FAMILIES
      .filter((family) => !selected.has(family.key))
      .filter((family) => family.aliases.some((alias) => containsPhrase(customerText, alias)))
      .map((family) => family.key);
    if (leaked.length) {
      issues.push(blocker(
        'customer_copy_uses_unselected_event_focus',
        `Customer copy introduces an unselected high-intent event or subculture (${[...new Set(leaked)].join(', ')}). Use only the operator-selected event focus (${selectedEventFocus.join(', ')}) unless Product Truth is deliberately re-reviewed.`,
      ));
    }
  }
  const selectedStyleFocus = focusValues(context.manual_focus, 'style');
  const selectedStyles = new Set(selectedStyleFocus.map((value) => value.toLowerCase()));
  const leakedStyles = CONTROLLED_STYLE_FOCUS_FAMILIES
    .filter((family) => (
      !selectedStyles.has(family.key)
      && !selectedStyleFocus.some((value) => family.aliases.some((alias) => containsPhrase(value, alias)))
    ))
    .filter((family) => family.aliases.some((alias) => containsPhrase(customerText, alias)))
    .map((family) => family.key);
  if (leakedStyles.length) {
    issues.push(blocker(
      'customer_copy_uses_unselected_style_focus',
      `Customer copy introduces an unselected high-intent style (${[...new Set(leakedStyles)].join(', ')}). Use only the operator-selected style focus (${selectedStyleFocus.join(', ') || 'none selected'}) unless Product Truth is deliberately re-reviewed.`,
    ));
  }

  const aboutBlock = blocks.find((block) => String(block.block_key || '') === 'about_this_piece');
  const aboutBody = typeof aboutBlock?.body === 'string' ? aboutBlock.body.trim() : '';
  splitSentences(aboutBody).forEach((sentence, index) => {
    const repeatedTerms = repeatedMeaningfulWords(sentence);
    if (repeatedTerms.length) {
      issues.push(blocker(
        `about_this_piece_sentence_${index + 1}_repeats_same_term`,
        `About this piece sentence ${index + 1} repeats the same content term (${repeatedTerms.join(', ')}). Rewrite the sentence once in plain buyer language instead of restating the product, persona, or component.`,
      ));
    }
  });

  const idealForBlock = blocks.find((block) => String(block.block_key || '') === 'ideal_for');
  const idealForBody = typeof idealForBlock?.body === 'string' ? idealForBlock.body.trim() : '';
  const idealForLines = splitBenefitLines(idealForBody);
  if (idealForBody && (idealForLines.length < 4 || idealForLines.length > 5)) {
    issues.push(blocker(
      'ideal_for_wrong_use_case_count',
      'Ideal for must contain 4-5 distinct, useful buyer profiles or use cases rather than a shortened keyword list.',
    ));
  }
  idealForLines.forEach((line, index) => {
    const lineWords = wordCount(line);
    if (lineWords < 7) {
      issues.push(blocker(
        `ideal_for_${index + 1}_too_thin`,
        `Ideal for bullet ${index + 1} is too thin. Name a real person or professional role and a concrete approved situation or buying need in natural language.`,
      ));
    }
    if (lineWords > 22) {
      issues.push(warning(
        `ideal_for_${index + 1}_too_long`,
        `Ideal for bullet ${index + 1} is longer than needed. Keep one clear customer portrait or use case per bullet.`,
      ));
    }
    if (countIdealBuyerRoles(line) > 2) {
      issues.push(blocker(
        `ideal_for_${index + 1}_stacks_buyer_roles`,
        `Ideal for bullet ${index + 1} stacks too many customer roles. Split them across separate bullets so each audience receives a useful, readable scenario.`,
      ));
    }
    if (IDEAL_FOR_PRODUCT_DETAIL.test(line)) {
      issues.push(blocker(
        `ideal_for_${index + 1}_describes_product_detail_instead_of_use_case`,
        `Ideal for bullet ${index + 1} describes an accent, silhouette, finish, construction, base layer, component combination, or styling mechanism. Name a supported person, occasion, production, or selected style context instead.`,
      ));
    }
    if (!idealForLineHasContext(line, context.manual_focus)) {
      issues.push(blocker(
        `ideal_for_${index + 1}_has_no_person_or_use_case`,
        `Ideal for bullet ${index + 1} does not identify a person, professional role, occasion, production, or selected style context.`,
      ));
    }
    const repeatedTerms = repeatedMeaningfulWords(line);
    if (repeatedTerms.length) {
      issues.push(blocker(
        `ideal_for_${index + 1}_repeats_same_term`,
        `Ideal for bullet ${index + 1} repeats the same content term (${repeatedTerms.join(', ')}). State the person and use once in natural language.`,
      ));
    }
  });
  const repeatedWhoNeedFrame = idealForLines.filter((line) => /\bwho need\b/i.test(line)).length;
  if (repeatedWhoNeedFrame >= 3) {
    issues.push(blocker(
      'ideal_for_repeats_who_need_template',
      'Ideal for repeats the same “who need” template. Vary the sentence rhythm while keeping each approved person and situation.',
    ));
  }
  const repeatedOriginalModifier = countMatches(idealForBody, /\boriginal\b/gi);
  if (repeatedOriginalModifier > 2) {
    issues.push(blocker(
      'ideal_for_overuses_original_modifier',
      `Ideal for repeats “original” ${repeatedOriginalModifier} times. Keep the authorial-design idea where it matters most and let the other portraits describe distinct people and situations.`,
    ));
  }
  const repeatedIdealFocus = [...new Set(
    (['event', 'style', 'persona', 'audience'] as const)
      .flatMap((axis) => focusValues(context.manual_focus, axis)),
  )].filter((value) => countFocusValueAppearances(idealForBody, value) > 2);
  if (repeatedIdealFocus.length) {
    issues.push(blocker(
      'ideal_for_repeats_operator_focus',
      `Ideal for repeats the same selected context more than twice instead of adding distinct buyer roles or use cases (${repeatedIdealFocus.join(', ')}). Keep every bullet different and never repeat the same focus twice inside one bullet.`,
    ));
  }
  (['event', 'style', 'persona', 'audience'] as const).forEach((axis) => {
    const selectedValues = focusValues(context.manual_focus, axis);
    if (selectedValues.length && !selectedValues.some((value) => focusValueAppears(idealForBody, value))) {
      issues.push(blocker(
        `ideal_for_missing_operator_${axis}_focus`,
        `Ideal for must naturally represent at least one operator-selected ${axis} value (${selectedValues.join(', ')}). Product Truth remains the veto; do not invent an incompatible context.`,
      ));
    }
  });

  const brandMentions = countMatches(customerText, BRAND_PATTERN);
  if (brandMentions > 1) {
    issues.push(blocker(
      'brand_name_overused_in_customer_copy',
      `TheFEYA appears ${brandMentions} times in visible generated copy. Maximum allowed is one.`,
    ));
  }

  const genericEventMentions = countMatches(customerText, GENERIC_EVENT_PATTERN);
  if (genericEventMentions > 2) {
    issues.push(blocker(
      'generic_event_term_overused',
      `The generic word event/events appears ${genericEventMentions} times in visible generated copy. Maximum allowed is two; keep the product entity primary and use one specific approved occasion only where it helps the buyer.`,
    ));
  }

  const whyBlock = blocks.find((block) => String(block.block_key || '') === 'why_youll_love_it');
  const whyBody = typeof whyBlock?.body === 'string' ? whyBlock.body.trim() : '';
  const benefitLines = splitBenefitLines(whyBody);
  const benefitCategoryMap = benefitLines.map((line) => ({
    line,
    categories: BENEFIT_CATEGORIES.filter((category) => category.pattern.test(line)).map((category) => category.key),
  }));
  const benefitCategories = [...new Set(benefitCategoryMap.flatMap((item) => item.categories))];

  if (!whyBody) {
    issues.push(blocker('missing_commercial_benefit_block', 'Why you’ll love it is required for commercial review.'));
  } else {
    if (WEAK_STYLING_FILLER.test(whyBody)) {
      issues.push(blocker(
        'why_youll_love_it_uses_weak_styling_filler',
        'Why you’ll love it uses empty styling filler instead of a concrete purchase benefit.',
      ));
    }
    if (EMPTY_HYPE.test(whyBody)) {
      issues.push(warning(
        'why_youll_love_it_uses_empty_hype',
        'Why you’ll love it contains an unsupported generic quality claim.',
      ));
    }
    if (SHAPE_DURING_MOVEMENT.test(whyBody)) {
      issues.push(blocker(
        'why_youll_love_it_uses_nonsensical_shape_during_movement',
        'Shape retention must explain keeping shape between wears, resisting creasing, storage or reuse. Keeping shape during movement is not a meaningful buyer benefit.',
      ));
    }
    const constructionBulletCount = benefitLines.filter((line) => CONSTRUCTION_TERM.test(line)).length;
    if (constructionBulletCount > 1) {
      issues.push(blocker(
        'why_youll_love_it_repeats_construction_as_multiple_benefits',
        'Construction, structure and build are one feature family. Use them in at most one Why bullet and spend the other bullets on different buyer value.',
      ));
    }
    if (benefitLines.length < 3 || benefitLines.length > 4) {
      issues.push(blocker(
        'why_youll_love_it_wrong_benefit_count',
        'Why you’ll love it must present 3-4 concise, non-duplicative purchase reasons. Use supported studio, purchase, fit, comfort, durability, or finish facts; never add filler.',
      ));
    }
    const requiredBenefitFamilies = 3;
    if (benefitCategories.length < requiredBenefitFamilies) {
      issues.push(blocker(
        'why_youll_love_it_lacks_benefit_diversity',
        `Why you’ll love it must cover at least ${requiredBenefitFamilies} genuinely different value families, including studio design and practical buyer value.`,
      ));
    }
    if (!benefitCategories.some((category) => PRACTICAL_BENEFIT_CATEGORIES.has(category))) {
      issues.push(blocker(
        'why_youll_love_it_missing_practical_buyer_value',
        'Why you’ll love it must include at least one supported practical value such as easier dressing, adjustment, comfort, fit, shape retention, durability, or verified finish behavior.',
      ));
    }

    benefitCategoryMap.forEach((item, index) => {
      if (!item.categories.length) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_has_no_concrete_buyer_value`,
          `Benefit ${index + 1} does not connect a supported feature or studio truth to a recognized buyer outcome.`,
        ));
      } else if (!item.categories.some((category) => BENEFIT_OUTCOME_PATTERNS[category]?.test(item.line))) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_has_feature_but_no_buyer_outcome`,
          `Benefit ${index + 1} mentions a feature but does not explain a concrete, supported result for the buyer.`,
        ));
      }
      if (ABSTRACT_VISUAL_BENEFIT.test(item.line)) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_is_abstract_visual_commentary`,
          `Benefit ${index + 1} is abstract visual commentary, not a useful reason to choose the product.`,
        ));
      }
      if (USE_CASE_AS_BENEFIT.test(item.line)) {
        issues.push(blocker(
          `why_youll_love_it_benefit_${index + 1}_belongs_in_ideal_for`,
          `Benefit ${index + 1} is a style or use-case list and belongs in Ideal for.`,
        ));
      }
    });

    const designBenefitLines = benefitLines.filter((line) => DESIGN_BENEFIT_PATTERN.test(line));
    if (designBenefitLines.length === 0) {
      issues.push(blocker(
        'why_youll_love_it_missing_studio_design_value',
        'Why you’ll love it must contain one concrete studio-design differentiation benefit tied to buyer value.',
      ));
    } else if (designBenefitLines.length > 1) {
      issues.push(blocker(
        'why_youll_love_it_repeats_design_authorship',
        'Studio design, handmade production and not-mass-produced wording are one value idea. Use it only once and spend the other bullets on supported wearability, fit, comfort, durability, shape retention, or finish behavior.',
      ));
    }

    const duplicateBenefitPairs = findNearDuplicatePairs(
      benefitLines.map((text, index) => ({ label: `why_youll_love_it.${index + 1}`, text })),
      0.76,
    );
    if (duplicateBenefitPairs.length) {
      issues.push(blocker(
        'why_youll_love_it_contains_near_duplicate_benefits',
        'Why you’ll love it repeats nearly the same benefit in more than one bullet.',
      ));
    }
  }

  const closingBlock = blocks.find((block) => String(block.block_key || '') === 'main_description');
  const closingBody = typeof closingBlock?.body === 'string' ? closingBlock.body.trim() : '';
  if (!closingBody) {
    issues.push(blocker(
      'missing_self_expression_close',
      'The generated left description must end with a concise Designed for self-expression conversion paragraph.',
    ));
  } else {
    if (!SELF_EXPRESSION_PATTERN.test(closingBody)) {
      issues.push(warning(
        'self_expression_close_lacks_clear_buyer_value',
        'The final paragraph should connect the product to self-expression, visual identity, studio authorship, or supported customization.',
      ));
    }
    const closingWords = wordCount(closingBody);
    const closingSentences = splitSentences(closingBody).length;
    if (closingWords < 45) {
      issues.push(blocker(
        'self_expression_close_too_thin',
        'Designed for self-expression must contain 45-75 useful words: our original studio perspective, design purpose, a supported product connection and an honest buyer outcome.',
      ));
    }
    if (closingWords > 75) {
      issues.push(warning(
        'self_expression_close_too_long',
        'Designed for self-expression is longer than 75 words. Remove generic biography or repeated product facts.',
      ));
    }
    if (closingSentences < 3 || closingSentences > 4) {
      issues.push(blocker(
        'self_expression_close_wrong_sentence_count',
        'Designed for self-expression must use 3-4 natural sentences with one clear job each.',
      ));
    }
  }

  const repetitionReport = buildRepetitionReport(record, leftBlocks);
  repetitionReport.repeated_idea_groups.forEach((item) => {
    if (item.blocks.length >= 3) {
      issues.push(blocker(
        `repeated_idea_${item.idea}`,
        `The idea “${item.idea.replaceAll('_', ' ')}” appears across ${item.blocks.join(', ')}. Keep the strongest version once and use the other blocks for different buyer value.`,
      ));
    }
  });

  if (repetitionReport.near_duplicate_sentence_pairs.some((pair) => pair.similarity >= 0.82)) {
    issues.push(blocker(
      'cross_block_near_duplicate_copy',
      'Two customer-facing sentences in different sections express almost the same thought. Rewrite one section to add a different buyer benefit.',
    ));
  } else if (repetitionReport.near_duplicate_sentence_pairs.length) {
    issues.push(warning(
      'cross_block_repetition_warning',
      'Some sentences across the intro and left-description blocks are too similar and should be differentiated.',
    ));
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
    benefit_categories_found: benefitCategories,
    repetition_report: repetitionReport,
  };
}

function buildRepetitionReport(record: Record<string, any>, leftBlocks: Record<string, any>[]) {
  const blockTexts = [
    typeof record.meta_description === 'string' && record.meta_description.trim()
      ? { key: 'meta_description', text: record.meta_description.trim() }
      : null,
    typeof record.intro === 'string' && record.intro.trim() ? { key: 'intro', text: record.intro.trim() } : null,
    Array.isArray(record.bullet_highlights) && record.bullet_highlights.length
      ? {
        key: 'bullet_highlights',
        text: record.bullet_highlights.filter((item: unknown) => typeof item === 'string').join(' '),
      }
      : null,
    ...leftBlocks.map((block) => ({
      key: String(block.block_key || 'left_block'),
      text: typeof block.body === 'string' ? block.body.trim() : '',
    })),
  ].filter((item): item is { key: string; text: string } => Boolean(item?.text));

  const repeatedIdeaGroups = CROSS_BLOCK_IDEAS.map((idea) => ({
    idea: idea.key,
    blocks: blockTexts.filter((block) => idea.pattern.test(block.text)).map((block) => block.key),
  })).filter((item) => item.blocks.length >= 2);

  const sentences = blockTexts.flatMap((block) => splitSentences(block.text).map((text, index) => ({
    label: `${block.key}.${index + 1}`,
    text,
    block: block.key,
  })));

  const nearDuplicateSentencePairs: Array<{ left: string; right: string; similarity: number }> = [];
  for (let i = 0; i < sentences.length; i += 1) {
    for (let j = i + 1; j < sentences.length; j += 1) {
      if (sentences[i].block === sentences[j].block) continue;
      const similarity = tokenJaccard(sentences[i].text, sentences[j].text);
      if (similarity >= 0.62) {
        nearDuplicateSentencePairs.push({
          left: sentences[i].label,
          right: sentences[j].label,
          similarity: Number(similarity.toFixed(3)),
        });
      }
    }
  }

  return {
    repeated_idea_groups: repeatedIdeaGroups,
    near_duplicate_sentence_pairs: nearDuplicateSentencePairs.sort((a, b) => b.similarity - a.similarity).slice(0, 12),
  };
}

function findNearDuplicatePairs(items: Array<{ label: string; text: string }>, threshold: number) {
  const pairs: Array<{ left: string; right: string; similarity: number }> = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const similarity = tokenJaccard(items[i].text, items[j].text);
      if (similarity >= threshold) pairs.push({ left: items[i].label, right: items[j].label, similarity });
    }
  }
  return pairs;
}

function tokenJaccard(left: string, right: string) {
  const a = meaningfulTokens(left);
  const b = meaningfulTokens(right);
  if (a.size < 4 || b.size < 4) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function meaningfulTokens(value: string) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/^-+|-+$/g, ''))
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  );
}

function repeatedMeaningfulWords(value: string) {
  const counts = new Map<string, number>();
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 5 && !STOPWORDS.has(token))
    .forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([token]) => token);
}

function splitSentences(value: string) {
  return String(value || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.replace(/^[-*•]\s*/, '').trim())
    .filter((item) => wordCount(item) >= 5);
}

function splitBenefitLines(value: string) {
  return String(value || '')
    .split(/\n|•/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...value.matchAll(new RegExp(pattern.source, flags))].length;
}

function blocker(code: string, message: string): SeoCommercialCopyIssue {
  return { code, severity: 'blocker', message };
}

function warning(code: string, message: string): SeoCommercialCopyIssue {
  return { code, severity: 'warning', message };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function flattenText(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(flattenText);
  if (isRecord(value)) return Object.values(value).flatMap(flattenText);
  return [];
}

function includedProductComponentText(value: unknown): string {
  if (!isRecord(value)) return '';
  return flattenText([
    value.included_components,
    value.known_components,
    value.parent_components_json,
    value.child_components_json,
    value.component_groups_json,
  ]).join(' ');
}

function validateWholeProductPresentation(
  record: Record<string, any>,
  productTruth: unknown,
  blocks: Record<string, any>[],
  issues: SeoCommercialCopyIssue[],
) {
  const presentation = classifySeoProductPresentation(productTruth);
  if (!presentation.requires_whole_product_entity) return;

  (['seo_title', 'h1', 'meta_description'] as const).forEach((field) => {
    const value = typeof record[field] === 'string' ? record[field] : '';
    if (!hasWholeProductEntity(value)) {
      issues.push(blocker(
        `${field}_reduces_multi_component_product_to_one_piece`,
        `${field} must identify the confirmed ${presentation.component_count}-component product as an outfit, set, costume, ensemble, or attire. One included component cannot replace the whole product entity.`,
      ));
    }
  });

  const aboutBlock = blocks.find((block) => String(block.block_key || '') === 'about_this_piece');
  const aboutBody = typeof aboutBlock?.body === 'string' ? aboutBlock.body : '';
  if (!hasWholeProductEntity(aboutBody)) {
    issues.push(blocker(
      'about_this_piece_missing_whole_product_entity',
      'About this piece must describe the complete outfit or set before explaining individual components.',
    ));
  }

  const intro = typeof record.intro === 'string' ? record.intro : '';
  const metaDescription = typeof record.meta_description === 'string' ? record.meta_description : '';
  [
    { key: 'meta_description', text: metaDescription },
    { key: 'intro', text: intro },
    { key: 'about_this_piece', text: aboutBody },
  ].forEach(({ key, text }) => {
    const mentioned = mentionedConfirmedComponents(text, presentation.components);
    const genericRecap = /\b(?:design|product|costume|outfit|set|ensemble)\b[^.!?\n]{0,45}\b(?:combines?|pairs?|brings?\s+together|includes?|contains?|consists?\s+of|comes?\s+with)\b[^.!?\n]{0,90}\b(?:shoulders?|skirt|tops?|bottoms?|upper\s+pieces?|lower\s+pieces?|components?)\b[^.!?\n]{0,50}\b(?:and|with)\b[^.!?\n]{0,50}\b(?:shoulders?|skirt|tops?|bottoms?|upper\s+pieces?|lower\s+pieces?|components?)\b/i.test(text);
    const recapsComposition = (
      mentioned.length >= Math.min(2, presentation.component_count)
      || genericRecap
    );
    if (recapsComposition) {
      issues.push(blocker(
        `${key}_repeats_deterministic_composition`,
        `${key} re-narrates the component inventory already shown by configuration and What’s Included. Use this space for a distinct buyer job, supported product value, wearability, finish behavior, or design reason.`,
      ));
    }
  });
}

function idealForLineHasContext(line: string, manualFocus: unknown) {
  if (IDEAL_FOR_CONTEXT.test(line)) return true;
  return (['event', 'style', 'persona', 'audience'] as const)
    .flatMap((axis) => focusValues(manualFocus, axis))
    .some((value) => focusValueAppears(line, value));
}

function countIdealBuyerRoles(line: string) {
  return IDEAL_BUYER_ROLE_FAMILIES.filter((aliases) => (
    aliases.some((alias) => containsPhrase(line, alias))
  )).length;
}

function focusValues(value: unknown, axis: 'event' | 'style' | 'persona' | 'audience'): string[] {
  if (!isRecord(value)) return [];
  const selected = value[axis];
  if (Array.isArray(selected)) {
    return [...new Set(selected.map((item) => String(item || '').trim()).filter(Boolean))];
  }
  const single = String(selected || '').trim();
  return single ? [single] : [];
}

function focusValueAppears(text: string, value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = FOCUS_VALUE_ALIASES[normalized] || [value];
  return aliases.some((alias) => containsPhrase(text, alias));
}

function countFocusValueAppearances(text: string, value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = FOCUS_VALUE_ALIASES[normalized] || [value];
  return Math.max(0, ...aliases.map((alias) => countNormalizedPhrase(text, alias)));
}

function countNormalizedPhrase(text: string, phrase: string) {
  const normalizeWords = (value: string) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const haystack = normalizeWords(text);
  const needle = normalizeWords(phrase);
  if (!needle.length || needle.length > haystack.length) return 0;
  let count = 0;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    if (needle.every((word, offset) => haystack[index + offset] === word)) count += 1;
  }
  return count;
}

function focusEventValues(value: unknown): string[] {
  return focusValues(value, 'event');
}

function containsPhrase(text: string, phrase: string) {
  const normalize = (value: string) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const haystack = ` ${normalize(text)} `;
  const needle = normalize(phrase);
  return Boolean(needle) && haystack.includes(` ${needle} `);
}
