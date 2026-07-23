// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, ImageIcon, Layers3, PackageSearch, Save, Search, SearchCheck, SlidersHorizontal } from 'lucide-react';
import { recommendCatalogKeywords } from '@/lib/seoCatalogKeywordRecommendation';
import {
  buildListingMasterKeywordSnapshot,
  getListingMasterDecisionStatus,
  listingMasterKeywordIds,
} from '@/lib/seoListingMasterDecision';
import {
  productComponentAssertionScope,
  resolveSelectedComponentFamilies,
} from '@/lib/listingMasterComponentTruth';
import { getSeoProductTruthEvidenceBlockers } from '@/lib/seoPackContract';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import ConfirmCompositionButton from './ConfirmCompositionButton';
import VerifiedSaveButton from './VerifiedSaveButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRODUCT_LIMIT = 500;
const KEYWORD_LIMIT = 6000;
const DISPLAY_LIMIT = 180;
const KEYWORD_SNAPSHOT_LIMIT = 35;

const FAST_PRODUCT_VIEW = 'feya_commerce_v_seo_product_truth_v3';
const KEYWORD_VIEW = 'vw_seo_keyword_bank_v1_for_listing_master';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const SOURCE_LISTINGS_TABLE = 'feya_commerce_source_listings';
const FALLBACK_VIEW = 'feya_commerce_v_step6_product_catalog_overview';

const FAST_PRODUCT_SELECT = [
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'canonical_color_label',
  'category_label',
  'source_category_label',
  'operator_section_label',
  'world_label',
  'primary_image_url',
  'primary_image_alt',
  'parent_components_json',
  'child_components_json',
  'component_groups_json',
  'needs_component_review_count',
  'has_component_review_risk',
  'focus_text',
  'included_components',
  'optional_configurations',
  'available_variants',
  'known_non_components',
  'unresolved_component_facts',
  'component_evidence',
  'source_description_fragment',
  'source_variations_json',
  'option_price_rows_json',
  'component_review_blockers_json',
].join(',');
const FALLBACK_SELECT = 'canonical_product_id,matched_etsy_listing_id,draft_site_title,card_title,product_type';
const KW_SELECT = [
  'id',
  'keyword',
  'keyword_norm',
  'bank_bucket',
  'review_status',
  'source_clusters',
  'score',
  'avg_monthly_searches',
  'competition',
  'competition_index',
  'region',
  'language',
  'metric_source',
  'page_type',
  'role',
  'role_label',
  'last_checked',
  'duplicate_count',
  'reason',
  'notes',
  'source_files',
].join(',');

const KEYWORD_TYPES = ['all', 'product', 'product_or_alt', 'collection', 'commercial_collection', 'visual_collection', 'faq'];
const STRATEGIES = ['demand', 'opportunity', 'niche'];
const DEFAULT_STRATEGY = 'demand,opportunity,niche';
const DEFAULT_EXCLUDED_TERMS = ['lego', 'pokemon', 'pokémon', 'gatsby', 'saint patrick', 'st patrick', 'st. patrick', 'santa', 'my little pony', 'casual', 'dinosaur'];

const KW_LABELS = { all: 'Все типы использования', product: 'Товарные слова', product_or_alt: 'Товар / ALT', collection: 'Категории', commercial_collection: 'Коммерческие посадочные', visual_collection: 'Визуальный поиск', faq: 'FAQ / вопросы' };
const STRATEGY_LABELS = { demand: 'Больше спроса', opportunity: 'Перспективные', niche: 'Нишевые' };
const STRATEGY_NOTES = { demand: 'Сначала слова с большим средним спросом.', opportunity: 'Ненулевой спрос + ниже конкуренция.', niche: 'Узкие long-tail слова под конкретный товар.' };
const STATUS_LABELS = { all: 'Все товары', not_saved: 'Не сохранено', saved: 'Черновик сохранён' };

const COMPONENTS = ['shoulders', 'corset', 'bra', 'top', 'harness', 'bodysuit', 'skirt', 'panties', 'arms', 'legs', 'mask', 'headpiece', 'choker', 'wings', 'spine', 'tail'];
const MATERIALS = ['gold', 'silver', 'black', 'white', 'mirror', 'acrylic', 'leather', 'vegan leather', 'metallic', 'holographic', 'chain'];
const EVENTS = ['burning man', 'festival', 'rave', 'stage', 'edm', 'edc', 'coachella', 'halloween', 'cosplay', 'pride', 'drag', 'photoshoot'];
const STYLES = ['post apocalyptic', 'futuristic', 'cyberpunk', 'desert', 'glam', 'punk', 'goth', 'burlesque', 'cosmic', 'sci fi', 'steampunk', 'fantasy'];
const PERSONAS = ['warrior', 'goddess', 'queen', 'cleopatra', 'robot', 'alien', 'angel', 'demon', 'drag queen', 'dancer', 'performer', 'dj', 'showgirl', 'go go dancer', 'pole dancer', 'maleficent', 'cat', 'bunny', 'couple'];
const AUDIENCES = ['men', 'women', 'couples', 'drag'];
const FOCUS_FIELDS = ['component', 'material', 'event', 'style', 'persona', 'audience'];
const COLOR_VALUES = ['gold', 'silver', 'black', 'white', 'holographic'];
const HARD_COMPONENT_CONFLICTS = ['bodysuit', 'corset', 'bra', 'top', 'harness', 'skirt', 'panties', 'arms', 'legs', 'mask', 'headpiece', 'choker', 'wings', 'spine', 'tail'];

const LABELS = {
  corset: 'corset', bra: 'bra', top: 'top', harness: 'harness', bodysuit: 'bodysuit', skirt: 'skirt', panties: 'panties', shoulders: 'shoulders', arms: 'arms', legs: 'legs', mask: 'mask', headpiece: 'headpiece', choker: 'choker', wings: 'wings', spine: 'spine', tail: 'tail',
  gold: 'gold', silver: 'silver', black: 'black', white: 'white', mirror: 'mirror', acrylic: 'acrylic', leather: 'leather', 'vegan leather': 'vegan leather', metallic: 'metallic', holographic: 'holographic', chain: 'chain detail',
  rave: 'rave', festival: 'festival', 'burning man': 'Burning Man', stage: 'stage', edm: 'EDM', edc: 'EDC', coachella: 'Coachella', halloween: 'Halloween', cosplay: 'cosplay', pride: 'Pride', drag: 'drag', photoshoot: 'photoshoot',
  futuristic: 'futuristic', cyberpunk: 'cyberpunk', desert: 'desert', 'post apocalyptic': 'post-apocalyptic', glam: 'glam', punk: 'punk', goth: 'goth', burlesque: 'burlesque', cosmic: 'cosmic', 'sci fi': 'sci-fi', steampunk: 'steampunk', fantasy: 'fantasy',
  warrior: 'warrior', goddess: 'goddess', queen: 'queen', cleopatra: 'Cleopatra', robot: 'robot', alien: 'alien', angel: 'angel', demon: 'demon', 'drag queen': 'drag queen', dancer: 'dancer', performer: 'performer', dj: 'DJ', showgirl: 'showgirl', 'go go dancer': 'go-go dancer', 'pole dancer': 'pole dancer', maleficent: 'Maleficent', cat: 'cat', bunny: 'bunny', couple: 'couple',
  women: 'women', men: 'men', couples: 'couples'
};

const SYN = {
  shoulders: ['shoulder', 'shoulders', 'shoulder piece', 'shoulder armor', 'pauldron', 'pauldrons'],
  corset: ['corset', 'overbust', 'underbust', 'bodice'],
  bra: ['bra', 'bralette', 'bustier'],
  top: ['top', 'crop top', 'chest piece', 'breastplate'],
  harness: ['harness', 'body harness', 'chest harness', 'garter harness'],
  bodysuit: ['bodysuit', 'body suit', 'leotard'],
  skirt: ['skirt', 'mini skirt', 'open skirt'],
  panties: ['panties'],
  arms: ['arms', 'arm cuff', 'arm cuffs', 'armlet', 'bracer', 'bracers', 'forearm', 'bicep', 'glove', 'gloves'],
  legs: ['legs', 'leg', 'garter', 'garters', 'leg covers', 'leg harness', 'leg armor'],
  mask: ['mask', 'face mask'],
  headpiece: ['headpiece', 'head piece', 'horn', 'crown', 'halo', 'headdress', 'cleopatra'],
  choker: ['choker', 'collar', 'choke chain', 'choke chains'], wings: ['wings'], spine: ['spine', 'back piece'], tail: ['tail'],
  gold: ['gold', 'golden'], silver: ['silver', 'chrome'], black: ['black'], white: ['white'], mirror: ['mirror', 'mirrored', 'reflective'], acrylic: ['acrylic'], leather: ['leather', 'faux leather'], 'vegan leather': ['vegan leather', 'faux leather'], metallic: ['metallic', 'metal'], holographic: ['holographic', 'holo', 'iridescent'], chain: ['chain', 'chains', 'body chain'],
  'burning man': ['burning man', 'burningman'], festival: ['festival', 'coachella', 'tomorrowland', 'electric forest'], rave: ['rave', 'edm'], stage: ['stage', 'performance', 'performer', 'show'], edm: ['edm', 'rave'], edc: ['edc', 'electric daisy carnival'], coachella: ['coachella'], halloween: ['halloween'], cosplay: ['cosplay', 'costume'], pride: ['pride'], drag: ['drag', 'drag queen'], photoshoot: ['photoshoot', 'photo shoot'],
  'post apocalyptic': ['post apocalyptic', 'post-apocalyptic', 'apocalyptic', 'mad max', 'wasteland'], futuristic: ['futuristic', 'future', 'future fashion'], cyberpunk: ['cyberpunk', 'cyber'], desert: ['desert', 'dune', 'burning man'], glam: ['glam', 'glamorous', 'red carpet'], punk: ['punk'], goth: ['goth', 'gothic'], burlesque: ['burlesque'], cosmic: ['cosmic', 'space'], 'sci fi': ['sci fi', 'sci-fi', 'science fiction'], steampunk: ['steampunk'], fantasy: ['fantasy', 'fairy'],
  warrior: ['warrior', 'armor', 'armour', 'armored', 'armoured'], goddess: ['goddess'], queen: ['queen'], cleopatra: ['cleopatra', 'egyptian'], robot: ['robot'], alien: ['alien'], angel: ['angel'], demon: ['demon', 'devil'], 'drag queen': ['drag queen'], dancer: ['dancer', 'dance'], performer: ['performer', 'performance'], dj: ['dj'], showgirl: ['showgirl', 'show girl'], 'go go dancer': ['go go', 'gogo', 'go-go'], 'pole dancer': ['pole dancer', 'pole dance'], maleficent: ['maleficent', 'dark fairy'], cat: ['cat', 'kitty'], bunny: ['bunny', 'rabbit'], couple: ['couple', 'couples', 'matching'],
  men: ['men', 'male', 'mens', "men's"], women: ['women', 'woman', 'female', 'womens', "women's", 'ladies', 'lady'], couples: ['couple', 'couples', 'matching']
};

export default async function ListingMasterPage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const filters = readFilters(resolvedSearchParams);
  const productData = await loadProducts(filters);
  const selectedProduct = productData.allProducts.find((p) => p.id === filters.productId) || null;
  const active = applyAutoFocus(filters, selectedProduct);
  const keywordData = await loadKeywords(active, selectedProduct);
  const rows = keywordData.rows.slice(0, DISPLAY_LIMIT);
  const saved = savedMessage(filters.saved);
  const productStatus = productSeoStatus(selectedProduct, active, keywordData);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-14">
      <div className="grid gap-5 lg:grid-cols-[1fr_440px] lg:items-end border-b border-[rgba(216,214,211,.12)] pb-6 mb-6">
        <div>
          <div className="eyebrow-gold mb-2">Админка · Мастер листинга</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(42px,6vw,72px)' }}>Подбор SEO-слов</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Выбери товар, проверь авто-фокус, настрой фокус и нажми “Применить поиск слов”. Клики по chips теперь меняют только форму — выдача обновляется только после Apply.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-keywords" className="btn-ghost">SEO-ядро <ArrowUpRight size={13} /></Link>
          <Link href={selectedProduct ? `/admin/seo-storefront-preview?product_id=${selectedProduct.id}` : '/admin/seo-storefront-preview'} className="btn-ghost">Дальше: генерация и preview <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {saved ? <Notice tone={saved.tone}>{saved.text}</Notice> : null}
      {productData.error ? <Notice>Предупреждение по товарам: {productData.error}</Notice> : null}
      {keywordData.error ? <Notice tone="danger">Не удалось загрузить SEO-слова: {keywordData.error}</Notice> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Metric icon={Database} label="Одобренных слов" value={countLabel(keywordData.counts, 'all')} note="Источник: SEO-ядро." tone="success" />
        <Metric icon={PackageSearch} label="Товары" value={fmt(productData.visibleProducts)} note={`Из ${fmt(productData.totalProducts)}. ${productData.source}.`} tone="success" />
        <Metric icon={Save} label="Черновиков" value={fmt(productData.statusCounts.saved)} note={`Не сохранено: ${fmt(productData.statusCounts.not_saved)}.`} tone="warning" />
        <Metric icon={Layers3} label="Товар / ALT" value={countLabel(keywordData.counts, 'product_or_alt')} note="Для карточки и картинок." tone="success" />
        <Metric icon={SearchCheck} label="Слов сейчас" value={fmt(keywordData.totalCount ?? keywordData.rows.length)} note="После последнего Apply." tone="warning" />
      </div>

      <div className="grid xl:grid-cols-[470px_1fr] gap-6 mb-6">
        <ProductPicker data={productData} filters={filters} selectedProduct={selectedProduct} />
        <div className="space-y-5">
          <FocusSearchForm key={focusFormKey(selectedProduct, active)} product={selectedProduct} filters={active} status={productStatus} />
          <NextStepPanel product={selectedProduct} keywordCount={keywordData.totalCount ?? keywordData.rows.length} saved={Boolean(selectedProduct?.decision)} status={productStatus} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">{KEYWORD_TYPES.map((type) => <KeywordTypeLink key={type} type={type} filters={active} counts={keywordData.counts} />)}</div>
      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 mb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="eyebrow-dim">Активный подбор слов</div><h2 className="mt-1 text-bone text-[22px]">{KW_LABELS[active.type] || active.type}</h2></div>
          <div className="flex flex-wrap gap-2"><Chip tone="success">Показано {fmt(rows.length)}</Chip><Chip tone="warning">Найдено {fmt(keywordData.totalCount ?? keywordData.rows.length)}</Chip><Chip>Из выборки {fmt(keywordData.rawCount ?? keywordData.rows.length)}</Chip><Chip tone="gold">{strategyLabel(active.strategy)}</Chip><Chip tone="success">{selectedProduct ? 'Product Truth matcher' : 'обзор ядра'}</Chip></div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">Фильтры применяются только после кнопки “Применить поиск слов”. Для выбранного товара сначала отсекаются несовместимые компоненты, цвет, аудитория и чужие commerce-домены; спрос и конкуренция влияют на порядок только после Product Truth gate.</p>
      </div>
      <KeywordTable rows={rows} error={keywordData.error} />
    </section>
  </main>;
}

async function saveDecisionAction(formData) {
  'use server';
  const productId = val(formData.get('canonical_product_id')).trim();
  const supabase = getSupabaseServiceClient();
  const requestId = val(formData.get('save_request_id')).trim() || 'server-action';
  if (!productId) return saveFailure('missing_product', 'Не удалось определить выбранный товар.', requestId);
  if (!supabase) return saveFailure('missing_supabase', 'Серверное подключение к Supabase недоступно.', requestId);
  const canonicalProduct = await loadCanonicalProductTruthProduct(supabase, productId);
  if (!canonicalProduct) {
    return saveFailure(
      'missing_canonical_product_truth',
      'Сервер не нашёл канонический Product Truth выбранного товара.',
      requestId,
    );
  }
  const strategies = allowedFormValues(formData, 'strategy', STRATEGIES);
  const manualFocus = {
    component: allowedFormValues(formData, 'component', COMPONENTS),
    material: allowedFormValues(formData, 'material', MATERIALS),
    event: allowedFormValues(formData, 'event', EVENTS),
    style: allowedFormValues(formData, 'style', STYLES),
    persona: allowedFormValues(formData, 'persona', PERSONAS),
    audience: allowedFormValues(formData, 'audience', AUDIENCES),
    strategies: strategies.length ? strategies : [...STRATEGIES],
    q: norm(val(formData.get('q'))),
    exclude: excludeTerms(val(formData.get('exclude'))),
    keyword_type: val(formData.get('type')) || 'all',
    selection_verified: true,
    save_request_id: requestId,
  };
  const strategyString = joinValues(manualFocus.strategies);
  const decisionFilters = {
    type: manualFocus.keyword_type,
    strategy: strategyString,
    component: joinValues(manualFocus.component),
    material: joinValues(manualFocus.material),
    event: joinValues(manualFocus.event),
    style: joinValues(manualFocus.style),
    persona: joinValues(manualFocus.persona),
    audience: joinValues(manualFocus.audience),
    q: manualFocus.q,
    exclude: joinValues(manualFocus.exclude),
  };
  const keywordData = await loadKeywords(decisionFilters, canonicalProduct);
  const selectedKeywords = buildListingMasterKeywordSnapshot(
    keywordData.rows || [],
    KEYWORD_SNAPSHOT_LIMIT,
  );
  const truthBlockers = canonicalProduct.truthBlockers || [];
  const decisionStatus = getListingMasterDecisionStatus(truthBlockers, selectedKeywords);
  manualFocus.product_truth_status = truthBlockers.length ? 'blocked' : 'ready';
  manualFocus.product_truth_blockers = truthBlockers;
  manualFocus.keyword_recommendation_source = keywordData.source;
  manualFocus.keyword_recommendation_diagnostics = keywordData.diagnostics || null;
  const payload = {
    canonical_product_id: productId,
    product_slug: canonicalProduct.slug || null,
    matched_etsy_listing_id: canonicalProduct.etsyId || null,
    auto_focus_json: autoFocusSnapshot(canonicalProduct, inferFocus(canonicalProduct)),
    manual_focus_json: manualFocus,
    selected_strategy: strategyString,
    selected_keyword_ids_json: listingMasterKeywordIds(selectedKeywords),
    selected_keywords_json: selectedKeywords,
    rejected_keywords_json: manualFocus.exclude,
    decision_status: decisionStatus,
    decision_note: [
      'Сохранено из Мастера листинга перед генерацией SEO-текста',
      `status=${decisionStatus}`,
      `product_truth_blockers=${truthBlockers.join('|') || 'none'}`,
      `request_id=${requestId}`,
    ].join(' · '),
  };
  const { data: inserted, error } = await supabase
    .from(DECISIONS_TABLE)
    .insert(payload)
    .select('id,canonical_product_id,manual_focus_json,selected_strategy,created_at')
    .single();
  if (error || !inserted) {
    console.error('[listing-master-save] write_failed', {
      requestId,
      productId,
      code: error?.code || 'missing_inserted_row',
      message: error?.message || 'Insert returned no row',
      details: error?.details || null,
      hint: error?.hint || null,
    });
    return saveFailure(error?.code || 'write_failed', 'Supabase не подтвердил запись решения.', requestId);
  }
  if (String(inserted.canonical_product_id) !== productId || decisionFocusSignature(inserted.manual_focus_json) !== decisionFocusSignature(manualFocus)) {
    console.error('[listing-master-save] verification_failed', {
      requestId,
      productId,
      insertedId: inserted.id,
      submitted: manualFocus,
      persisted: inserted.manual_focus_json,
    });
    return saveFailure('verification_failed', 'Записанный фокус не совпал с выбранными кнопками.', requestId);
  }
  console.info('[listing-master-save] verified', {
    requestId,
    productId,
    insertedId: inserted.id,
    decisionStatus,
    truthBlockers,
    selectedKeywordCount: selectedKeywords.length,
  });
  const href = buildHref({ ...decisionFilters, productId, focusApplied: '1' });
  const savedState = decisionStatus === 'blocked_product_truth'
    ? 'blocked'
    : decisionStatus === 'needs_keyword_review'
      ? 'review'
      : 'ok';
  return {
    ok: true,
    href: `${href}${href.includes('?') ? '&' : '?'}saved=${savedState}`,
    requestId,
    decisionId: inserted.id,
  };
}

async function confirmCompositionAction(formData) {
  'use server';
  const productId = val(formData.get('canonical_product_id')).trim();
  const requestId = val(formData.get('composition_request_id')).trim() || 'server-action';
  const selectedComponents = allowedFormValues(formData, 'component', COMPONENTS);
  const supabase = getSupabaseServiceClient();

  if (!productId) return compositionFailure('missing_product', 'Не удалось определить выбранный товар.');
  if (!selectedComponents.length) {
    return compositionFailure('missing_components', 'Сначала выберите фактический состав товара.');
  }
  if (!supabase) {
    return compositionFailure('missing_supabase', 'Серверное подключение к Supabase недоступно.');
  }

  const canonicalProduct = await loadCanonicalProductTruthProduct(supabase, productId);
  if (!canonicalProduct) {
    return compositionFailure(
      'missing_canonical_product_truth',
      'Сервер не нашёл канонический Product Truth выбранного товара.',
    );
  }

  const { data: families, error: familyError } = await supabase
    .from('feya_commerce_component_families')
    .select('component_family_id,canonical_name,normalized_name')
    .eq('active_flag', true);
  if (familyError) {
    return compositionFailure('component_family_load_failed', familyError.message);
  }

  const evidenceFamilyNames = [
    ...(canonicalProduct.parentComponents || []),
    ...jsonArray(canonicalProduct.truth?.included_components),
  ];
  const resolutions = resolveSelectedComponentFamilies(
    selectedComponents,
    families || [],
    evidenceFamilyNames,
  );
  const resolutionErrors = resolutions
    .map((item) => item.error)
    .filter(Boolean);
  if (resolutionErrors.length) {
    return compositionFailure('ambiguous_component_family', resolutionErrors.join(' '));
  }

  const resolvedFamilies = resolutions.map((item) => item.family).filter(Boolean);
  const resolvedIds = resolvedFamilies.map((family) => family.component_family_id);
  const scope = productComponentAssertionScope(
    canonicalProduct.truth?.optional_configurations,
    canonicalProduct.truth?.source_variations,
  );
  const evidenceJson = {
    evidence_contract: scope === 'fixed_base'
      ? 'manual_fixed_base_v1'
      : 'manual_canonical_listing_v1',
    reviewer_action: scope === 'fixed_base'
      ? 'confirmed_always_included'
      : 'confirmed_advertised_listing_composition',
    source_route: '/admin/listing-master',
    request_id: requestId,
    selected_focus_components: selectedComponents,
    product_truth_component_evidence: evidenceFamilyNames,
    reviewed_product: {
      canonical_product_id: canonicalProduct.id,
      matched_etsy_listing_id: canonicalProduct.etsyId,
      product_slug: canonicalProduct.slug,
      card_title: canonicalProduct.title,
    },
    confirmed_components: resolvedFamilies.map((family) => ({
      component_family_id: family.component_family_id,
      canonical_name: family.canonical_name,
      normalized_name: family.normalized_name,
    })),
  };

  const reviewNote = scope === 'fixed_base'
    ? 'Confirmed from Listing Master as always included.'
    : 'Confirmed from Listing Master as part of the advertised page entity.';
  const { error: replaceError } = await supabase.rpc(
    'feya_commerce_replace_product_component_assertions_v1',
    {
      p_canonical_product_id: productId,
      p_presence_scope: scope,
      p_component_family_ids: resolvedIds,
      p_evidence_json: evidenceJson,
      p_reviewed_by: 'admin',
      p_review_note: reviewNote,
    },
  );
  if (replaceError) {
    return compositionFailure('composition_write_failed', replaceError.message);
  }

  const { data: verified, error: verifyError } = await supabase
    .from('feya_commerce_product_component_assertions_v1')
    .select('component_family_id')
    .eq('canonical_product_id', productId)
    .eq('presence_scope', scope)
    .eq('review_status', 'approved')
    .eq('active_flag', true);
  const verifiedIds = (verified || []).map((item) => item.component_family_id).sort();
  if (verifyError || JSON.stringify(verifiedIds) !== JSON.stringify([...resolvedIds].sort())) {
    return compositionFailure(
      'composition_verification_failed',
      verifyError?.message || 'Записанный состав не совпал с выбранными chips.',
    );
  }

  const strategies = allowedFormValues(formData, 'strategy', STRATEGIES);
  const href = buildHref({
    type: val(formData.get('type')) || 'all',
    strategy: joinValues(strategies.length ? strategies : STRATEGIES),
    component: joinValues(selectedComponents),
    material: joinValues(allowedFormValues(formData, 'material', MATERIALS)),
    event: joinValues(allowedFormValues(formData, 'event', EVENTS)),
    style: joinValues(allowedFormValues(formData, 'style', STYLES)),
    persona: joinValues(allowedFormValues(formData, 'persona', PERSONAS)),
    audience: joinValues(allowedFormValues(formData, 'audience', AUDIENCES)),
    q: norm(val(formData.get('q'))),
    exclude: joinValues(excludeTerms(val(formData.get('exclude')))),
    productId,
    productQ: norm(val(formData.get('product_q'))),
    productSection: norm(val(formData.get('product_section'))),
    productStatus: norm(val(formData.get('product_status'))),
    focusApplied: '1',
  });
  const savedState = scope === 'fixed_base' ? 'truth_fixed' : 'truth_listing';

  console.info('[listing-master-composition] verified', {
    requestId,
    productId,
    scope,
    selectedComponents,
    resolvedIds,
  });
  return {
    ok: true,
    href: `${href}${href.includes('?') ? '&' : '?'}saved=${savedState}`,
  };
}

async function loadCanonicalProductTruthProduct(supabase, productId) {
  const { data, error } = await supabase
    .from(FAST_PRODUCT_VIEW)
    .select(FAST_PRODUCT_SELECT)
    .eq('canonical_product_id', productId)
    .limit(1);
  if (error) {
    console.error('[listing-master-save] product_truth_load_failed', {
      productId,
      code: error.code || null,
      message: error.message,
    });
    return null;
  }
  const row = (data || [])[0] || null;
  return row ? normalizeProduct(row) : null;
}

async function loadProducts(filters) {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return emptyProducts(getMissingSupabaseEnvMessage());
  let result = await supabase.from(FAST_PRODUCT_VIEW).select(FAST_PRODUCT_SELECT).limit(PRODUCT_LIMIT);
  let source = 'canonical Product Truth v3';
  let warning = null;
  if (result.error) {
    warning = result.error.message;
    result = await supabase.from(FALLBACK_VIEW).select(FALLBACK_SELECT).limit(PRODUCT_LIMIT);
    source = result.error ? 'ошибка canonical Product Truth v3' : 'fallback step6 catalog';
  }
  if (result.error) return emptyProducts(`${warning || 'Canonical Product Truth v3'} / ${result.error.message}`);
  const sourceSignals = await loadProductSourceSignalMap(supabase, result.data || []);
  if (sourceSignals.error) warning = [warning, `Исходные Etsy-сигналы недоступны: ${sourceSignals.error}`].filter(Boolean).join(' / ');
  const decisions = await loadDecisionMap();
  const allProducts = (result.data || []).map((row) => {
    const product = normalizeProduct(row, sourceSignals.map.get(String(row.matched_etsy_listing_id || '')));
    product.decision = decisions.get(product.id) || null;
    return product;
  }).sort((a, b) => a.title.localeCompare(b.title));
  const sections = buildSections(allProducts);
  const statusCounts = buildStatusCounts(allProducts);
  const activeSection = filters.productSection && sections.some((x) => x.key === filters.productSection) ? filters.productSection : '';
  const activeStatus = STATUS_LABELS[filters.productStatus] ? filters.productStatus : 'all';
  const tokens = tokensOf(filters.productQ);
  const products = allProducts
    .filter((p) => !activeSection || p.sectionKey === activeSection)
    .filter((p) => activeStatus === 'all' || p.statusKey === activeStatus)
    .filter((p) => !tokens.length || tokens.every((t) => p.text.includes(t)));
  return { allProducts, products, visibleProducts: products.length, totalProducts: allProducts.length, sections, statusCounts, activeSection, activeStatus, source, error: warning ? `Canonical Product Truth v3 недоступен, включён fallback: ${warning}` : null };
}
function emptyProducts(error) { return { allProducts: [], products: [], visibleProducts: 0, totalProducts: 0, sections: [], statusCounts: { all: 0, not_saved: 0, saved: 0 }, activeSection: '', activeStatus: 'all', source: 'none', error }; }
async function loadProductSourceSignalMap(supabase, products) {
  const ids = products.map((row) => String(row.matched_etsy_listing_id || '')).filter(Boolean);
  if (!ids.length) return { map: new Map(), error: null };
  const { data, error } = await supabase.from(SOURCE_LISTINGS_TABLE).select('etsy_listing_id,raw_tags,raw_materials').in('etsy_listing_id', ids);
  const map = new Map();
  (data || []).forEach((row) => {
    const id = String(row.etsy_listing_id || '');
    if (id && !map.has(id)) map.set(id, row);
  });
  return { map, error: error?.message || null };
}
async function loadDecisionMap() { const supabase = getSupabaseServiceClient(); if (!supabase) return new Map(); const { data } = await supabase.from(DECISIONS_TABLE).select('canonical_product_id,decision_status,selected_strategy,manual_focus_json,auto_focus_json,selected_keywords_json,updated_at,created_at').limit(2000); const map = new Map(); (data || []).sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()).forEach((row) => { if (row?.canonical_product_id && !map.has(row.canonical_product_id)) map.set(row.canonical_product_id, row); }); return map; }
function normalizeProduct(row, sourceSignals = {}) {
  const parent = arr(row.parent_components_json);
  const child = arr(row.child_components_json);
  const groups = arr(row.component_groups_json);
  const included = jsonArray(row.included_components);
  const optionalConfigurations = jsonArray(row.optional_configurations);
  const availableVariants = jsonArray(row.available_variants);
  const knownNonComponents = jsonArray(row.known_non_components);
  const unresolvedFacts = jsonArray(row.unresolved_component_facts);
  const reviewBlockers = jsonArray(row.component_review_blockers_json);
  const sourceVariations = jsonArray(row.source_variations_json);
  const optionPriceRows = jsonArray(row.option_price_rows_json);
  const title = row.card_title || row.draft_site_title || row.h1 || row.seo_title || row.product_slug || row.canonical_product_id || '';
  const sectionLabel = row.operator_section_label || row.category_label || row.product_type || 'Other products';
  const sectionKey = keyOf(sectionLabel);
  const sourceCategory = row.source_category_label || row.category_label || row.product_type || '';
  const truth = {
    product_truth_source: row.included_components === undefined
      ? null
      : 'seo_product_truth_v1',
    canonical_product_id: row.canonical_product_id || null,
    matched_etsy_listing_id: row.matched_etsy_listing_id || null,
    title,
    slug: row.product_slug || row.canonical_product_id || '',
    product_type: row.product_type || '',
    category_label: row.category_label || '',
    source_category_label: row.source_category_label || '',
    operator_section_label: row.operator_section_label || '',
    world_label: row.world_label || '',
    material: row.material || '',
    color: row.color || '',
    canonical_color_label: row.canonical_color_label || '',
    card_title: row.card_title || '',
    h1: row.h1 || '',
    focus_text: row.focus_text || '',
    included_components: included,
    known_components: [],
    optional_configurations: optionalConfigurations,
    available_variants: availableVariants,
    known_non_components: knownNonComponents,
    unresolved_component_facts: unresolvedFacts,
    component_review_blockers: reviewBlockers,
    component_evidence: row.component_evidence || null,
    source_description_fragment: row.source_description_fragment || '',
    source_variations: sourceVariations,
    option_price_rows: optionPriceRows,
    parent_components_json: parent,
    child_components_json: child,
    component_groups_json: groups,
  };
  const truthBlockers = getSeoProductTruthEvidenceBlockers(truth);
  const text = [
    row.focus_text,
    title,
    sectionLabel,
    sourceCategory,
    row.world_label,
    row.material,
    row.canonical_color_label,
    row.color,
    row.primary_image_alt,
    parent.join(' '),
    child.join(' '),
    groups.join(' '),
    row.canonical_product_id,
    row.matched_etsy_listing_id,
  ].filter(Boolean).join(' ').toLowerCase();
  const sourceTagsText = [...arr(sourceSignals.raw_tags), ...arr(sourceSignals.raw_materials)].join(' ').toLowerCase();
  return {
    id: row.canonical_product_id,
    title,
    sectionLabel,
    sectionKey,
    sourceCategory,
    productType: row.product_type || '',
    worldLabel: row.world_label || '',
    materialRaw: row.material || '',
    colorRaw: row.canonical_color_label || row.color || '',
    imageUrl: row.primary_image_url || '',
    imageAlt: row.primary_image_alt || '',
    slug: row.product_slug || row.canonical_product_id,
    etsyId: row.matched_etsy_listing_id || '',
    parentComponents: parent,
    childComponents: child,
    componentGroups: groups,
    needsComponentReviewCount: Math.max(
      Number(row.needs_component_review_count || 0),
      unresolvedFacts.length,
      reviewBlockers.length,
    ),
    hasComponentReviewRisk: truthBlockers.length > 0,
    truth,
    truthBlockers,
    text,
    sourceTagsText,
  };
}

async function loadKeywords(filters, product = null) {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return { rows: [], counts: {}, totalCount: null, rawCount: null, error: getMissingSupabaseEnvMessage(), source: 'none' };
  const safeType = KEYWORD_TYPES.includes(filters.type) ? filters.type : 'all';
  const countEntries = await Promise.all(KEYWORD_TYPES.map(async (type) => [type, await countKeywords(supabase, type)]));
  const counts = Object.fromEntries(countEntries);
  let query = supabase.from(KEYWORD_VIEW).select(KW_SELECT, { count: 'exact' }).limit(KEYWORD_LIMIT);
  if (safeType !== 'all') query = query.eq('bank_bucket', safeType);
  const { data, error, count } = await query;
  if (error) return { rows: [], counts, totalCount: null, rawCount: count ?? null, error: error.message, source: 'keyword_bank' };
  const sourceRows = filters.q
    ? (data || []).filter((row) => tokensOf(filters.q).every((token) => termMatch(keywordCoreText(row), token)))
    : (data || []);
  if (!product) {
    const rows = applyLocalMatching(sourceRows, filters);
    return { rows, counts, totalCount: rows.length, rawCount: count ?? 0, error: null, source: 'keyword_bank_overview', diagnostics: null };
  }
  const recommendation = recommendCatalogKeywords({
    product: product.truth,
    approvedKeywords: sourceRows,
    focus: {
      ...Object.fromEntries(FOCUS_FIELDS.map((field) => [field, valuesOf(filters[field])])),
      exclude: excludeTerms(filters.exclude),
    },
    selectedStrategy: filters.strategy,
    limit: KEYWORD_SNAPSHOT_LIMIT,
  });
  const rows = recommendation.keywords.map((row) => ({
    ...row,
    match_label: Number(row.product_truth_fit_score || 0) >= 80
      ? 'точное'
      : Number(row.product_truth_fit_score || 0) >= 35
        ? 'доказанное'
        : 'поддержка',
    match_reasons: row.recommendation_reason,
  }));
  return {
    rows,
    counts,
    totalCount: rows.length,
    rawCount: count ?? 0,
    error: null,
    source: 'product_truth_recommender_v1',
    diagnostics: recommendation.diagnostics,
  };
}
async function countKeywords(supabase, type) { let query = supabase.from(KEYWORD_VIEW).select('keyword_norm', { count: 'exact', head: true }); if (type !== 'all') query = query.eq('bank_bucket', type); const { count, error } = await query; return { count: error ? null : count ?? 0, error: error?.message || null }; }

function ProductPicker({ data, filters, selectedProduct }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 xl:sticky xl:top-6 self-start">
    <div className="flex items-center gap-2 eyebrow-gold mb-4"><PackageSearch size={14} /> Выбрать товар</div>
    <form action="/admin/listing-master" className="mb-4 rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="grid gap-3"><input name="product_q" defaultValue={filters.productQ} placeholder="Поиск: gold, harness, Etsy ID, первые слова" className="field" /><div className="grid grid-cols-2 gap-3"><SelectBox name="product_section" label="Раздел товара" value={data.activeSection || ''}><option value="">All products · {data.totalProducts}</option>{data.sections.map((item) => <option key={item.key} value={item.key}>{item.label} · {item.count}</option>)}</SelectBox><SelectBox name="product_status" label="Статус работы" value={data.activeStatus || 'all'}>{Object.keys(STATUS_LABELS).map((key) => <option key={key} value={key}>{STATUS_LABELS[key]} · {fmt(data.statusCounts?.[key] || 0)}</option>)}</SelectBox></div><button type="submit" className="btn-ghost"><Search size={13} /> Найти / применить</button><div className="flex flex-wrap gap-2"><Link href="/admin/listing-master" className="text-[11px] text-[var(--gold-warm)] hover:underline">Сбросить всё</Link><span className="text-[11px] text-[var(--bone-dim)]">Найдено: {fmt(data.visibleProducts)}</span></div></div></form>
    <div className="max-h-[calc(100vh-330px)] min-h-[360px] space-y-2 overflow-auto pr-1">{data.products.slice(0, 160).map((product) => <ProductCard key={product.id} product={product} active={selectedProduct?.id === product.id} filters={filters} />)}{!data.products.length && !data.error ? <div className="text-[12px] text-[var(--bone-dim)]">По этим фильтрам товаров не найдено.</div> : null}</div>
  </div>;
}
function FocusSearchForm({ product, filters, status }) {
  const formKey = focusFormKey(product, filters);
  const compositionScope = productComponentAssertionScope(
    product?.truth?.optional_configurations,
    product?.truth?.source_variations,
  );
  return <form key={formKey} action="/admin/listing-master" className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <input type="hidden" name="product_id" value={product?.id || filters.productId || ''} /><input type="hidden" name="product_q" value={filters.productQ || ''} /><input type="hidden" name="product_section" value={filters.productSection || ''} /><input type="hidden" name="product_status" value={filters.productStatus || 'all'} /><input type="hidden" name="type" value={filters.type || 'all'} /><input type="hidden" name="focus_applied" value="1" />
    <input type="hidden" name="canonical_product_id" value={product?.id || ''} /><input type="hidden" name="product_slug" value={product?.slug || ''} /><input type="hidden" name="matched_etsy_listing_id" value={product?.etsyId || ''} /><input type="hidden" name="auto_focus_json" value={JSON.stringify(autoFocusSnapshot(product, filters.inferred || {}))} />
    <div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2 eyebrow-gold"><SlidersHorizontal size={14} /> Фокус товара</div><Chip tone={status.tone}>{status.label}</Chip></div>
    {product ? <div className="grid sm:grid-cols-[96px_1fr] gap-4 rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.055)] p-4 mb-4"><ProductImage product={product} size="lg" /><div><div className="text-bone text-[18px] leading-snug">{product.title}</div><div className="mt-1 text-[12px] text-[var(--bone-dim)]">{product.sectionLabel} · {product.worldLabel || '—'} · {product.colorRaw || '—'}</div><div className="mt-3 flex flex-wrap gap-2"><Chip tone="success">состав: {labelForMulti(filters.component)}</Chip><Chip tone="gold">материал/цвет: {labelForMulti(filters.material)}</Chip><Chip tone="warning">сценарий: {labelForMulti(filters.event)}</Chip><Chip tone="gold">стиль: {labelForMulti(filters.style)}</Chip><Chip tone="success">персона: {labelForMulti(filters.persona)}</Chip><Chip>аудитория: {labelForMulti(filters.audience)}</Chip>{decisionLabel(product.decision) ? <Chip tone={decisionLabel(product.decision).tone}>{decisionLabel(product.decision).text}</Chip> : null}{product.hasComponentReviewRisk ? <Chip tone="warning">ДНК требует проверки: {product.needsComponentReviewCount}</Chip> : null}</div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Source category: {product.sourceCategory || '—'} · components: {product.parentComponents.join(', ') || '—'} / {product.childComponents.join(', ') || '—'}. {status.note}</div></div></div> : <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mb-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Товар ещё не выбран. Слева можно фильтровать по разделу и статусу работы.</div>}
    <CheckboxChipGroup key={`component-${formKey}`} title="Состав / часть товара" items={COMPONENTS} field="component" filters={filters} />
    {product ? <div className="mb-4 rounded-2xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.05)] p-4">
      <div className="eyebrow-gold mb-2">Подтверждение Product Truth</div>
      <p className="text-[11px] leading-relaxed text-[var(--bone-dim)]">
        Chips управляют поиском, но сами по себе не меняют правду товара. Подтвердите выбранный состав явно.
        {compositionScope === 'canonical_listing'
          ? ' У товара есть варианты комплектации: состав будет записан для продаваемого листинга, а конкретные варианты останутся отдельной проверкой.'
          : ' У товара нет вариантов комплектации: выбранные части будут записаны как неизменный состав.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <ConfirmCompositionButton action={confirmCompositionAction} disabled={!product} scope={compositionScope} />
        <Link href={`/admin/review/components?product_id=${product.id}`} className="btn-ghost">Детальная проверка состава</Link>
      </div>
    </div> : null}
    <CheckboxChipGroup key={`material-${formKey}`} title="Материал / цвет / деталь" items={MATERIALS} field="material" filters={filters} />
    <CheckboxChipGroup key={`event-${formKey}`} title="Сценарий / событие" items={EVENTS} field="event" filters={filters} />
    <CheckboxChipGroup key={`style-${formKey}`} title="Стиль / визуальный мир" items={STYLES} field="style" filters={filters} />
    <CheckboxChipGroup key={`persona-${formKey}`} title="Персона / образ" items={PERSONAS} field="persona" filters={filters} />
    <CheckboxChipGroup key={`audience-${formKey}`} title="Аудитория / buyer angle" items={AUDIENCES} field="audience" filters={filters} />
    <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mt-2"><div className="eyebrow-gold mb-3">Режим подбора слов</div><div className="grid gap-3 md:grid-cols-3">{STRATEGIES.map((s) => <CheckboxCard key={`${s}-${formKey}`} name="strategy" value={s} checked={strategyValues(filters.strategy).includes(s)} title={STRATEGY_LABELS[s]} note={STRATEGY_NOTES[s]} />)}</div><div className="mt-3 text-[11px] text-[var(--bone-dim)]">По умолчанию включены все три режима. Повторный клик снимает режим; фильтр применится только после кнопки ниже.</div></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 mt-4"><div className="eyebrow-gold mb-3">Поиск и минус-слова внутри SEO-ядра</div><div className="grid gap-3 md:grid-cols-[1fr_1fr]"><label><div className="eyebrow-dim mb-1.5">Доп. поиск</div><input name="q" defaultValue={filters.q} placeholder="например: armor, price, shipping" className="field" /></label><label><div className="eyebrow-dim mb-1.5">Минус-слова</div><input name="exclude" defaultValue={valuesOf(filters.exclude).join(', ')} placeholder="dance, bodysuit, neon" className="field" /></label></div></div>
    <div className="mt-4 rounded-2xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.055)] p-4">
      <div className="text-[11px] leading-relaxed text-[var(--bone-dim)] mb-3">«Применить» обновляет выдачу для проверки. «Сохранить» одним действием записывает именно текущие chips и заново собирает под них снимок ключей.</div>
      <div className="flex flex-wrap gap-3"><button type="submit" className="btn-ghost"><SearchCheck size={13} /> Применить поиск слов</button><VerifiedSaveButton action={saveDecisionAction} disabled={!product} /><Link href={product ? productHref(product, filters) : '/admin/listing-master'} className="btn-ghost">Сбросить товар/ДНК</Link>{product ? <Link className="btn-ghost" href={`/admin/seo-storefront-preview?product_id=${product.id}`}>Дальше: генерация и preview <ArrowUpRight size={13} /></Link> : null}</div>
    </div>
  </form>;
}
function CheckboxChipGroup({ title, items, field, filters }) { const selected = valuesOf(filters[field]); return <div className="mb-4"><div className="eyebrow-dim mb-2">{title}</div><div className="flex flex-wrap gap-2">{items.map((item) => <label key={`${field}-${item}-${selected.includes(item) ? 'on' : 'off'}`} className="cursor-pointer"><input className="peer sr-only" type="checkbox" name={field} value={item} defaultChecked={selected.includes(item)} /><span className="inline-flex rounded-full border border-[rgba(216,214,211,.13)] bg-black/10 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-[var(--bone-dim)] peer-checked:border-[rgba(108,183,138,.55)] peer-checked:bg-[rgba(108,183,138,.11)] peer-checked:text-[#a9dfbd]">{labelFor(item)}</span></label>)}</div></div>; }
function CheckboxCard({ name, value, checked, title, note }) { return <label className="cursor-pointer"><input className="peer sr-only" type="checkbox" name={name} value={value} defaultChecked={checked} /><span className="block rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/15 p-3 peer-checked:border-[rgba(212,178,106,.60)] peer-checked:bg-[rgba(212,178,106,.11)]"><div className="text-bone text-[13px]">{title}</div><div className="mt-1.5 text-[10px] leading-relaxed text-[var(--bone-dim)]">{note}</div></span></label>; }
function NextStepPanel({ product, keywordCount, saved, status }) {
  const instruction = status?.code === 'blocked_product_truth'
    ? 'Фокус и кандидаты можно сохранить как рабочее решение. Генерация останется закрыта, пока в Product Truth не подтверждены состав и исходные варианты товара.'
    : status?.code === 'needs_keyword_review'
      ? 'Проверь кандидатов и выбери Primary, который описывает весь продаваемый товар. Затем сохрани решение и переходи в генерацию.'
      : 'Примени поиск слов, проверь Primary и Secondary, сохрани решение и переходи в генерацию и preview.';
  return <div className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.045)] p-4"><div className="eyebrow-gold mb-2">Следующий шаг</div><p className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{instruction}</p><div className="mt-3 flex flex-wrap gap-2"><Chip tone={product ? 'success' : 'warning'}>{product ? 'товар выбран' : 'выбери товар'}</Chip><Chip tone={keywordCount > 0 ? 'success' : 'warning'}>{keywordCount > 0 ? `${fmt(keywordCount)} слов` : 'нет слов'}</Chip><Chip tone={saved ? 'success' : 'warning'}>{saved ? 'решение сохранено' : 'нужно сохранить'}</Chip><Chip tone={status?.tone || 'neutral'}>{status?.label || 'статус не определён'}</Chip></div></div>;
}
function KeywordTable({ rows, error }) { return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.35fr_.42fr_.42fr_.52fr_.52fr_.70fr_.55fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]"><div>Ключ</div><div>Совпадение</div><div>SEO</div><div>Спрос</div><div>Конкуренция</div><div>Сигнал</div><div>Почему</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.map((row, i) => { const signal = strategySignal(row); return <div key={`${row.keyword_norm || row.keyword}-${i}`} className="grid grid-cols-[1.35fr_.42fr_.42fr_.52fr_.52fr_.70fr_.55fr] gap-4 px-5 py-3 items-center hover:bg-[rgba(212,178,106,.035)]"><div><div className="text-bone text-[13px] leading-snug">{displayKeyword(row)}</div><div className="mt-1 flex flex-wrap gap-1.5"><Chip tone={toneByType(row.bank_bucket)}>{keywordUse(row)}</Chip>{row.match_label ? <Chip tone={row.match_label === 'точное' ? 'success' : 'gold'}>{row.match_label}</Chip> : null}</div></div><div className="font-price text-[20px] text-[#a9dfbd]">{row.match_score == null ? '—' : row.match_score}</div><div className="font-price text-[20px] text-[var(--gold-warm)]">{asText(row.score)}</div><div className="text-[12px] text-[var(--bone-dim)]">{fmt(row.avg_monthly_searches)}</div><div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{competitionLabel(row.competition)}</Chip></div><div><Chip tone={signal.tone}>{signal.label}</Chip></div><details className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><summary className="cursor-pointer text-[var(--gold-warm)]">открыть</summary><div className="mt-2 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-2">{asText(row.match_reasons || row.source_clusters || row.source_files)}<br />Google: {fmt(row.avg_monthly_searches)} / {competitionLabel(row.competition)} · {asText(row.reason || row.notes, '')}</div></details></div>; })}{!rows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">По текущим фильтрам слов не найдено. Сними часть фокуса или минус-слова.</div> : null}</div></div>; }
function ProductCard({ product, active, filters }) { const focus = inferFocus(product); const hasFocus = Boolean(focus.component || focus.material || focus.event || focus.style || focus.persona || focus.audience); const decision = decisionLabel(product.decision); return <Link href={productHref(product, filters)} className={`grid grid-cols-[44px_1fr] gap-3 rounded-2xl border p-3 ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.10)]' : 'border-[rgba(216,214,211,.10)] bg-black/15 hover:border-[rgba(212,178,106,.35)]'}`}><ProductImage product={product} /><div className="min-w-0"><div className="truncate text-[12px] text-bone">{product.title}</div><div className="mt-1 truncate text-[10px] text-[var(--bone-dim)]">{product.sectionLabel} · {product.worldLabel || product.colorRaw || '—'}</div><div className="mt-2 flex flex-wrap gap-1.5">{active ? <Chip tone="gold">выбран</Chip> : null}<Chip tone={hasFocus ? 'success' : 'warning'}>{hasFocus ? 'авто-фокус' : 'ручной фокус'}</Chip>{decision ? <Chip tone={decision.tone}>{decision.text}</Chip> : <Chip>не сохранено</Chip>}{product.hasComponentReviewRisk ? <Chip tone="warning">ДНК: проверить</Chip> : null}</div></div></Link>; }
function ProductImage({ product, size = 'sm' }) { const cls = size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl'; return <div className={`${cls} overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/25 flex items-center justify-center`}>{product?.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon size={16} className="text-[var(--smoke)]" />}</div>; }
function SelectBox({ name, label, value, children }) { return <label className="block"><div className="eyebrow-dim mb-1.5">{label}</div><select name={name} defaultValue={value || ''} className="field">{children}</select></label>; }
function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) { const border = tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]'; return <div className={`rounded-2xl border ${border} p-4 min-h-[112px]`}><div className="flex items-center justify-between gap-4 mb-3"><div className="eyebrow-dim">{label}</div><Icon size={15} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[32px] leading-none">{value}</div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>; }
function KeywordTypeLink({ type, filters, counts }) { const active = filters.type === type; return <Link href={buildHref(filters, { type, focusApplied: '1' })} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] ${active ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)]'}`}>{KW_LABELS[type]} · {countLabel(counts, type)}</Link>; }
function Chip({ children, tone = 'neutral' }) { const cls = tone === 'success' ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]' : tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : tone === 'gold' ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'warning' }) { const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)]' : tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]'; return <div className={`rounded-2xl border ${cls} p-4 text-[var(--bone-dim)] mb-5`}>{children}</div>; }

function readFilters(sp) { const type = val(sp?.type || sp?.bucket || 'all'); const productStatus = norm(val(sp?.product_status)); return { type: KEYWORD_TYPES.includes(type) ? type : 'all', strategy: cleanStrategyMulti(sp?.strategy || DEFAULT_STRATEGY), component: cleanMulti(sp?.component), material: cleanMulti(sp?.material), event: cleanMulti(sp?.event), style: cleanMulti(sp?.style), persona: cleanMulti(sp?.persona), audience: cleanMulti(sp?.audience), focusApplied: val(sp?.focus_applied).trim() === '1', q: norm(val(sp?.q)), exclude: cleanMulti(sp?.exclude), productId: val(sp?.product_id).trim(), productQ: norm(val(sp?.product_q)), productSection: norm(val(sp?.product_section || sp?.product_category)), productStatus: STATUS_LABELS[productStatus] ? productStatus : 'all', saved: val(sp?.saved).trim() }; }
function val(value, fallback = '') { if (typeof value === 'string') return value; if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; return fallback; }
function norm(v) { return String(v || '').trim().toLowerCase(); }
function arr(v) { if (Array.isArray(v)) return v.map(String).filter(Boolean); if (typeof v === 'string') { try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch { return v ? [v] : []; } } return []; }
function jsonArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return v.trim() ? [v.trim()] : [];
  }
}
function parseJson(v, fallback) { try { return JSON.parse(v); } catch { return fallback; } }
function allowedFormValues(formData, field, allowed) { return valuesOf(formData.getAll(field)).filter((value) => allowed.includes(value)); }
function decisionFocusSignature(value) {
  const focus = recordOf(value) || {};
  return JSON.stringify({
    ...Object.fromEntries(FOCUS_FIELDS.map((field) => [field, valuesOf(focus[field]).sort()])),
    strategies: strategyValues(focus.strategies).sort(),
    q: norm(focus.q),
    exclude: valuesOf(focus.exclude).sort(),
    keyword_type: KEYWORD_TYPES.includes(val(focus.keyword_type)) ? val(focus.keyword_type) : 'all',
  });
}
function saveFailure(code, message, requestId) { return { ok: false, code: String(code || 'unknown'), message, requestId }; }
function compositionFailure(code, message) { return { ok: false, code: String(code || 'unknown'), message }; }
function recordOf(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = parseJson(value, null);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}
function keyOf(label) { return norm(label).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function tokensOf(q) { return norm(q).split(/\s+/).map((x) => x.trim()).filter((x) => x.length >= 2); }
function cleanMulti(value) { return joinValues(valuesOf(value)); }
function valuesOf(value) { if (Array.isArray(value)) return value.flatMap((x) => String(x || '').split(',')).map(norm).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); return String(value || '').split(',').map(norm).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); }
function joinValues(values) { return valuesOf(values).join(','); }
function strategyValues(value) { const values = valuesOf(value).filter((v) => STRATEGIES.includes(v)); return values.length ? values : [...STRATEGIES]; }
function cleanStrategyMulti(value) { return joinValues(strategyValues(value)); }
function strategyLabel(value) { return strategyValues(value).map((v) => STRATEGY_LABELS[v] || v).join(' + '); }
function excludeTerms(value) { return [...DEFAULT_EXCLUDED_TERMS, ...valuesOf(value)].filter((v, i, a) => a.indexOf(v) === i); }
function escapeRegex(value) { return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function literalTermMatch(text, value) { const cleanText = norm(text); const cleanValue = norm(value); if (!cleanValue) return false; return new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanValue)}([^a-z0-9]|$)`, 'i').test(cleanText); }
function termMatch(text, value) { if (!value) return true; const cleanText = norm(text); const terms = SYN[value] || [value]; return terms.some((term) => { const t = norm(term); if (!t) return false; const pattern = `(^|[^a-z0-9])${escapeRegex(t)}([^a-z0-9]|$)`; return new RegExp(pattern, 'i').test(cleanText); }); }
function firstMatch(text, values) { return values.find((v) => termMatch(text, v)) || ''; }
function literalMatches(text, values) { return values.filter((value) => literalTermMatch(text, value)); }
function inferFocus(product) { if (!product) return { component: '', material: '', event: '', style: '', persona: '', audience: '' }; const explicitPersonas = literalMatches(product.text, PERSONAS); return { component: joinValues(literalMatches(product.text, COMPONENTS)), material: firstMatch(product.text, MATERIALS), event: joinValues(literalMatches(product.text, EVENTS)), style: joinValues(literalMatches(product.text, STYLES)), persona: joinValues(explicitPersonas.length ? explicitPersonas : valuesOf(firstMatch(product.text, PERSONAS))), audience: firstMatch(`${product.text} ${product.sourceTagsText || ''}`, AUDIENCES) }; }
function applyAutoFocus(filters, product) {
  const inferred = inferFocus(product);
  const hasUrlFocus = FOCUS_FIELDS.some((field) => valuesOf(filters[field]).length) || filters.q || filters.exclude;
  if (filters.focusApplied || hasUrlFocus) return { ...filters, inferred, focusSource: 'url' };
  const savedFocus = recordOf(product?.decision?.manual_focus_json);
  if (savedFocus?.selection_verified === true && FOCUS_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(savedFocus, field))) {
    const savedStrategy = product?.decision?.selected_strategy || savedFocus.strategies || filters.strategy;
    return {
      ...filters,
      ...Object.fromEntries(FOCUS_FIELDS.map((field) => [field, joinValues(savedFocus[field])])),
      strategy: cleanStrategyMulti(savedStrategy),
      type: KEYWORD_TYPES.includes(val(savedFocus.keyword_type)) ? val(savedFocus.keyword_type) : filters.type,
      q: norm(savedFocus.q),
      exclude: joinValues(savedFocus.exclude),
      inferred,
      focusSource: 'saved',
    };
  }
  return { ...filters, component: inferred.component, material: inferred.material, event: inferred.event, style: inferred.style, persona: inferred.persona, audience: inferred.audience, inferred, focusSource: 'auto' };
}
function focusFormKey(product, filters) { return [product?.id || 'no-product', filters.focusApplied ? 'applied' : 'auto', ...FOCUS_FIELDS.map((field) => valuesOf(filters[field]).join('|')), filters.strategy || '', filters.type || '', filters.q || '', filters.exclude || ''].join('::'); }
function buildSections(products) { const map = new Map(); products.forEach((p) => { const key = p.sectionKey || 'other-products'; const current = map.get(key) || { key, label: p.sectionLabel || 'Other products', count: 0 }; current.count += 1; map.set(key, current); }); return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); }
function buildStatusCounts(products) { const counts = { all: products.length, not_saved: 0, saved: 0 }; products.forEach((p) => { if (p.decision) counts.saved += 1; else counts.not_saved += 1; p.statusKey = p.decision ? 'saved' : 'not_saved'; }); return counts; }
function keywordCoreText(row) { return `${row.keyword || ''} ${row.keyword_norm || ''}`.toLowerCase(); }
function keywordMetaText(row) { return `${row.source_clusters || ''} ${row.page_type || ''} ${row.bank_bucket || ''} ${row.reason || ''} ${row.notes || ''} ${row.source_files || ''}`.toLowerCase(); }
function hasExcluded(row, exclude) { const core = keywordCoreText(row); const meta = keywordMetaText(row); return excludeTerms(exclude).some((term) => term && (termMatch(core, term) || termMatch(meta, term))); }
function matchingValues(text, selected) { return valuesOf(selected).filter((value) => termMatch(text, value)); }
function matchScoreFrom(core, meta, selected, coreWeight, metaWeight, label) { const coreMatches = matchingValues(core, selected); const metaMatches = matchingValues(meta, selected).filter((value) => !coreMatches.includes(value)); const score = coreMatches.length * coreWeight + metaMatches.length * metaWeight; const bits = []; if (coreMatches.length) bits.push(`${label} keyword +${coreMatches.length * coreWeight}: ${coreMatches.map(labelFor).join(', ')}`); if (metaMatches.length) bits.push(`${label} meta +${metaMatches.length * metaWeight}: ${metaMatches.map(labelFor).join(', ')}`); return { coreMatches, metaMatches, score, reason: bits.join(' · ') }; }
function applyLocalMatching(rows, filters) { const active = Boolean(FOCUS_FIELDS.some((field) => valuesOf(filters[field]).length) || filters.q || filters.exclude); const mapped = rows.map((row) => { const match = matchKeyword(row, filters, active); return { ...row, match_score: match.score, match_label: match.label, match_reasons: match.reasons.join(' · '), strategy_rank: match.eligible ? rank({ ...row, match_score: match.score }, filters.strategy) + match.score * 5 : -999999, blocked_reason: match.blockedReason }; }); return mapped.filter((row) => row.strategy_rank > -999999).sort(sortRows); }
function matchKeyword(row, filters, active) {
  const core = keywordCoreText(row);
  const meta = keywordMetaText(row);
  const all = `${core} ${meta}`;
  if (hasExcluded(row, filters.exclude)) return block('минус-слово');
  if (filters.q && !tokensOf(filters.q).every((t) => termMatch(all, t))) return block('не совпал поиск');
  const selected = Object.fromEntries(FOCUS_FIELDS.map((field) => [field, valuesOf(filters[field])])) as any;
  const conflict = conflictReason(core, meta, selected);
  if (conflict) return block(conflict);
  const pieces = [
    matchScoreFrom(core, meta, selected.component, 70, 24, 'состав'),
    matchScoreFrom(core, meta, selected.material, 35, 12, 'материал/цвет'),
    matchScoreFrom(core, meta, selected.event, 40, 14, 'сценарий'),
    matchScoreFrom(core, meta, selected.style, 25, 8, 'стиль'),
    matchScoreFrom(core, meta, selected.persona, 25, 8, 'персона'),
    matchScoreFrom(core, meta, selected.audience, 10, 3, 'аудитория')
  ];
  let score = pieces.reduce((sum, p) => sum + p.score, 0);
  const commercial = /buy|price|cost|order|shop|for sale|shipping|delivery|website|websites/.test(core) || String(row.bank_bucket || '').includes('commercial');
  if (commercial) score += 12;
  if (row.bank_bucket === 'product_or_alt') score += 12;
  if (row.bank_bucket === 'product') score += 8;
  const coreScore = pieces.reduce((sum, p) => sum + p.coreMatches.length, 0);
  const metaScore = pieces.reduce((sum, p) => sum + p.metaMatches.length, 0);
  const eligible = !active || coreScore > 0 || metaScore >= 2 || Boolean(filters.q);
  if (!eligible) return block('только слабый metadata-сигнал');
  const strongCore = pieces[0].coreMatches.length && (pieces[1].coreMatches.length || pieces[2].coreMatches.length || pieces[3].coreMatches.length || pieces[4].coreMatches.length);
  const label = strongCore || score >= 110 ? 'точное' : score >= 55 ? 'хорошее' : 'широкое';
  return { eligible: true, score, label, reasons: pieces.map((p) => p.reason).filter(Boolean).concat(commercial ? ['commercial intent +12'] : []) };
}
function block(blockedReason) { return { eligible: false, score: 0, label: '', reasons: [], blockedReason }; }
function conflictReason(core, meta, selected) {
  if (selected.audience.includes('men') && termMatch(core, 'women')) return 'wrong gender: women';
  if (selected.audience.includes('women') && termMatch(core, 'men')) return 'wrong gender: men';
  const selectedColors = selected.material.filter((v) => COLOR_VALUES.includes(v));
  if (selectedColors.length && COLOR_VALUES.some((c) => !selectedColors.includes(c) && termMatch(core, c))) return 'wrong color';
  if (!selected.material.includes('holographic') && termMatch(core, 'neon')) return 'neon mismatch';
  if (termMatch(core, 'snake')) return 'snake mismatch';
  if (selected.component.length) {
    const keywordComponents = COMPONENTS.filter((c) => termMatch(core, c));
    if (keywordComponents.some((c) => !selected.component.includes(c) && HARD_COMPONENT_CONFLICTS.includes(c))) return `wrong component: ${keywordComponents.filter((c) => !selected.component.includes(c)).join(', ')}`;
  }
  const danceTerms = ['dancer', 'go go dancer', 'pole dancer'];
  if (!selected.persona.some((p) => danceTerms.includes(p)) && danceTerms.some((p) => termMatch(core, p))) return 'dance persona mismatch';
  if (!selected.style.includes('burlesque') && termMatch(core, 'burlesque')) return 'burlesque mismatch';
  return '';
}
function sortRows(a, b) { return Number(b.strategy_rank || 0) - Number(a.strategy_rank || 0) || Number(b.match_score || 0) - Number(a.match_score || 0) || Number(b.score || 0) - Number(a.score || 0) || Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0); }
function rank(row, strategy) { const values = strategyValues(strategy); const scores = values.map((s) => rankOne(row, s)); return Math.max(...scores) + scores.reduce((sum, item) => sum + item, 0) / Math.max(1, scores.length) * 0.08; }
function rankOne(row, strategy) { const match = Number(row.match_score || 0); const score = Number(row.score || 0); const volume = Number(row.avg_monthly_searches || 0); const comp = String(row.competition || '').toUpperCase(); const idx = Number(row.competition_index || 0); const keyword = String(row.keyword || '').toLowerCase(); const bucket = String(row.bank_bucket || ''); const volumeBoost = volume >= 3000 ? 45 : volume >= 1000 ? 35 : volume >= 500 ? 26 : volume >= 200 ? 18 : volume >= 50 ? 10 : volume > 0 ? 5 : -25; const compBoost = comp === 'LOW' ? 35 : comp === 'MEDIUM' ? 18 : comp === 'HIGH' ? -18 : 0; const idxBoost = idx > 0 ? Math.max(-20, 24 - Math.round(idx / 4)) : 0; const longTail = keyword.split(/\s+/).length >= 3 ? 22 : 0; const buyer = /buy|price|cost|order|shop|for sale|shipping|delivery|outfit|costume|set|wear|clothing|website|websites/.test(keyword) || bucket.includes('commercial') ? 16 : 0; if (strategy === 'demand') return match * 1.15 + score + volumeBoost * 2 + buyer * 0.35; if (strategy === 'niche') return match * 1.7 + score + longTail + compBoost + buyer * 0.25 - Math.max(0, volumeBoost - 30); return match * 1.35 + score + volumeBoost + compBoost + idxBoost + buyer * 0.4; }
function autoFocusSnapshot(product, inferred) { return { inferred, product: product ? { canonical_product_id: product.id, slug: product.slug, etsy_id: product.etsyId, title: product.title, operator_section: product.sectionLabel, source_category: product.sourceCategory, world_label: product.worldLabel, parent_components: product.parentComponents, child_components: product.childComponents, needs_component_review_count: product.needsComponentReviewCount } : null }; }
function savedMessage(value) {
  if (value === 'truth_listing') return { tone: 'success', text: 'Состав продаваемого листинга подтверждён в Product Truth. Кандидаты обновлены; варианты комплектации остаются отдельной проверкой.' };
  if (value === 'truth_fixed') return { tone: 'success', text: 'Неизменный состав товара подтверждён в Product Truth. Кандидаты обновлены на основе подтверждённого состава.' };
  if (value === 'blocked') return { tone: 'warning', text: 'Фокус и кандидаты сохранены. Генерация намеренно заблокирована: сначала нужно закрыть Product Truth этого товара.' };
  if (value === 'review') return { tone: 'warning', text: 'Фокус и кандидаты сохранены, но Primary ещё требует проверки перед генерацией.' };
  if (value === 'ok') return { tone: 'success', text: 'Проверяемое решение сохранено. Product Truth закрыт, Primary найден; можно переходить к генерации и preview.' };
  if (value === 'error') return { tone: 'warning', text: 'Решение не сохранилось. Нужно проверить серверный доступ к Supabase и журнал записи.' };
  return null;
}
function decisionLabel(decision) {
  if (!decision) return null;
  if (decision.decision_status === 'blocked_product_truth') return { text: 'Product Truth blocked', tone: 'warning' };
  if (decision.decision_status === 'needs_keyword_review') return { text: 'нужна проверка ключей', tone: 'warning' };
  return { text: 'черновик сохранён', tone: 'success' };
}
function productSeoStatus(product, filters, keywordData) {
  if (!product) return { code: 'no_product', label: 'товар не выбран', tone: 'neutral', note: 'выбери товар слева' };
  if (product.truthBlockers?.length) {
    return {
      code: 'blocked_product_truth',
      label: 'Product Truth не закрыт',
      tone: 'warning',
      note: `${product.truthBlockers.length} блокер(а): фокус сохраняется, OpenAI не запускается`,
    };
  }
  if (!FOCUS_FIELDS.some((field) => valuesOf(filters[field]).length)) {
    return { code: 'missing_focus', label: 'нужен фокус', tone: 'warning', note: 'авто-фокус не распознал ни одного направления' };
  }
  const rows = keywordData?.rows || [];
  if (!rows.length) return { code: 'no_keywords', label: 'нет слов', tone: 'warning', note: 'Product Truth matcher не нашёл совместимых кандидатов' };
  const hasPrimary = rows.some((row) => row.role === 'primary');
  const primaryScopeBlocked = keywordData?.diagnostics?.auto_primary_scope === 'blocked_no_whole_product_candidate';
  if (!hasPrimary || primaryScopeBlocked) {
    return { code: 'needs_keyword_review', label: 'нужен Primary', tone: 'warning', note: 'нет доказанного ключа, описывающего весь продаваемый товар' };
  }
  return { code: 'ready', label: 'ключи готовы к проверке', tone: 'success', note: 'кандидаты прошли Product Truth matcher; сохранение фиксирует provenance' };
}
function buildHref(filters, patch = {}) { const next = { ...filters, ...patch }; const params = new URLSearchParams(); if (next.type && next.type !== 'all') params.set('type', next.type); if (next.strategy && next.strategy !== DEFAULT_STRATEGY) params.set('strategy', next.strategy); FOCUS_FIELDS.forEach((field) => { if (next[field]) params.set(field, next[field]); }); if (next.focusApplied || next.focus_applied) params.set('focus_applied', '1'); if (next.q) params.set('q', next.q); if (next.exclude) params.set('exclude', next.exclude); if (next.productId || next.product_id) params.set('product_id', next.productId || next.product_id); if (next.productQ || next.product_q) params.set('product_q', next.productQ || next.product_q); if (next.productSection || next.product_section) params.set('product_section', next.productSection || next.product_section); if (next.productStatus || next.product_status) params.set('product_status', next.productStatus || next.product_status); const query = params.toString(); return query ? `/admin/listing-master?${query}` : '/admin/listing-master'; }
function productHref(product, filters = {}) { return buildHref(filters, { productId: product.id, component: '', material: '', event: '', style: '', persona: '', audience: '', q: '', exclude: '', focusApplied: '' }); }
function countLabel(counts, type) { const value = counts?.[type]?.count; return value == null ? '—' : fmt(value); }
function fmt(value) { if (value == null) return '—'; const n = Number(value); return Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : '—'; }
function labelFor(value) { return LABELS[value] || value || '—'; }
function labelForMulti(value) { const labels = valuesOf(value).map(labelFor); return labels.length ? labels.join(' · ') : '—'; }
function displayKeyword(row) { return asText(row.keyword, asText(row.keyword_norm, '—')); }
function asText(value, fallback = '—') { if (value == null || value === '') return fallback; if (Array.isArray(value)) return value.length ? value.join(', ') : fallback; return String(value); }
function competitionLabel(value) { const text = String(value || '').toUpperCase(); if (text === 'LOW') return 'Низкая'; if (text === 'MEDIUM') return 'Средняя'; if (text === 'HIGH') return 'Высокая'; if (text === 'UNKNOWN') return 'Нет данных'; return asText(value); }
function toneByType(value) { const text = asText(value, '').toLowerCase(); if (text.includes('product')) return 'success'; if (text.includes('commercial') || text.includes('visual') || text.includes('collection')) return 'gold'; if (text.includes('faq')) return 'warning'; return 'neutral'; }
function keywordUse(row) { const type = row.bank_bucket; if (type === 'product_or_alt') return 'Товар / ALT'; if (type === 'product') return 'Title / описание'; if (type === 'commercial_collection') return 'Посадочная / meta'; if (type === 'visual_collection') return 'ALT / картинки'; if (type === 'collection') return 'Категория'; if (type === 'faq') return 'FAQ'; return 'Проверить'; }
function strategySignal(row) { const volume = Number(row.avg_monthly_searches || 0); const comp = String(row.competition || '').toUpperCase(); const type = String(row.bank_bucket || ''); const keyword = String(row.keyword || '').toLowerCase(); if (/buy|price|cost|order|shop|for sale|shipping|delivery|website|websites/.test(keyword) || type.includes('commercial')) return { label: 'покупательский запрос', tone: 'gold' }; if (volume > 0 && comp === 'LOW') return { label: 'низкая конкуренция', tone: 'success' }; if (type.includes('product') && volume <= 500 && volume > 0 && comp !== 'HIGH') return { label: 'нишевая точка', tone: 'success' }; if (volume >= 1000 && comp === 'HIGH') return { label: 'большой спрос', tone: 'warning' }; if (type.includes('visual')) return { label: 'для картинок', tone: 'gold' }; if (type.includes('collection')) return { label: 'для посадочной', tone: 'gold' }; return { label: 'поддержка', tone: 'neutral' }; }
