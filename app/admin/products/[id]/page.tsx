import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type {
  AdminProductBuilderDetail,
  ProductBuilderConfiguration,
  ProductBuilderContentItem,
  ProductBuilderMatchItem,
  ProductBuilderMediaItem,
  ProductBuilderPrice,
  SeoBriefReadiness,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getProduct(id: string): Promise<{
  product: AdminProductBuilderDetail | null;
  seoReadiness: SeoBriefReadiness | null;
  error?: string;
  warning?: string;
}> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { product: null, seoReadiness: null, error: getMissingAdminDataEnvMessage() };
  }

  const [productResult, seoReadinessResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_step6_product_builder_detail')
      .select('*')
      .eq('canonical_product_id', id)
      .maybeSingle(),
    supabase
      .from('feya_commerce_v_seo_product_brief_readiness_v1')
      .select('*')
      .eq('canonical_product_id', id)
      .maybeSingle(),
  ]);

  if (productResult.error) {
    return { product: null, seoReadiness: null, error: productResult.error.message };
  }

  return {
    product: productResult.data as AdminProductBuilderDetail | null,
    seoReadiness: seoReadinessResult.error ? null : (seoReadinessResult.data as SeoBriefReadiness | null),
    ...(seoReadinessResult.error ? { warning: `Не удалось загрузить готовность SEO: ${seoReadinessResult.error.message}` } : {}),
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toLowerCase();

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('matched') || normalized.includes('ok')) {
    return 'ok';
  }

  if (normalized.includes('block') || normalized.includes('missing') || normalized.includes('error') || normalized.includes('reject')) {
    return 'danger';
  }

  return 'warning';
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  if (value == null) return '—';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency || ''}`.trim();
  }
}

function getConfigurations(product: AdminProductBuilderDetail): ProductBuilderConfiguration[] {
  return Array.isArray(product.configurations) ? product.configurations : [];
}

function getMedia(product: AdminProductBuilderDetail): ProductBuilderMediaItem[] {
  return Array.isArray(product.media_items) ? product.media_items : [];
}

function getContent(product: AdminProductBuilderDetail): ProductBuilderContentItem[] {
  return Array.isArray(product.content_items) ? product.content_items : [];
}

function getMatches(product: AdminProductBuilderDetail): ProductBuilderMatchItem[] {
  return Array.isArray(product.match_items) ? product.match_items : [];
}

function getPrices(configuration: ProductBuilderConfiguration): ProductBuilderPrice[] {
  return Array.isArray(configuration.prices) ? configuration.prices : [];
}

function yesNo(value: boolean | null | undefined) {
  if (value == null) return '—';
  return value ? 'Да' : 'Нет';
}

function builderStatusLabel(value: unknown, fallback = '—') {
  const raw = asText(value, fallback);
  const key = raw.toLowerCase();
  const labels: Record<string, string> = {
    ready_candidate: 'Кандидат готов',
    ready: 'Готово',
    approved: 'Одобрено',
    draft: 'Черновик',
    blocked: 'Заблокировано',
    pending: 'Ожидает',
    not_reviewed: 'Не проверено',
    'not reviewed': 'Не проверено',
    not_started: 'Не начато',
    'not started': 'Не начато',
    matched: 'Сопоставлено',
    rejected: 'Отклонено',
    warning: 'Нужно проверить',
    pass: 'Проверка пройдена',
    fail: 'Проверка не пройдена',
  };
  return labels[key] || raw;
}

function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="card pdp-info-block">
      <h3>{label}</h3>
      <p>{asText(value)}</p>
    </div>
  );
}

export default async function AdminProductBuilderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { product, seoReadiness, error, warning } = await getProduct(id);

  if (error) {
    return (
      <main className="page-shell">
        <div className="container">
          <nav className="top-nav">
            <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
            <div className="nav-links">
              <Link href="/admin/products">Товары</Link>
              <Link href="/admin/review">Проверка</Link>
              <Link href="/admin/seo-keywords">SEO и ключевые слова</Link>
            </div>
          </nav>
          <div className="notice">{error}</div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="page-shell">
        <div className="container">
          <nav className="top-nav">
            <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
            <div className="nav-links"><Link href="/admin/products">Products</Link></div>
          </nav>
          <div className="notice">Товар не найден.</div>
        </div>
      </main>
    );
  }

  const configurations = getConfigurations(product);
  const media = getMedia(product);
  const content = getContent(product);
  const matches = getMatches(product);

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/review">Review</Link>
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Product Builder · только просмотр</div>
          <h1>{product.card_title || product.draft_site_title || product.h1 || 'Без названия'}</h1>
          <p>
            Страница показывает текущие данные Product Builder без редактирования фактов о товаре, цен, медиа, SEO или статуса публикации.
          </p>
          <div className="badge-row">
            <span className={`status-pill ${getStatusClass(product.readiness_status)}`}>{builderStatusLabel(product.readiness_status, 'Готовность не определена')}</span>
            <span className={`status-pill ${getStatusClass(product.publish_status)}`}>{builderStatusLabel(product.publish_status, 'Черновик')}</span>
            {product.do_not_publish_flag ? <span className="status-pill danger">Не публиковать</span> : null}
            {product.handmade_flag ? <span className="badge">Ручная работа</span> : null}
            {product.styled_imagery_flag ? <span className="badge">Стилизованные изображения</span> : null}
          </div>
        </section>

        {warning ? <div className="notice">{warning}</div> : null}

        <section className="section-head">
          <div>
            <h2>Идентификация и источник</h2>
            <p className="muted">Канонический товар хранится отдельно от идентификаторов Etsy и исходных данных.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Канонический ID товара" value={product.canonical_product_id} />
          <Fact label="Магазин-источник" value={product.source_shop_code} />
          <Fact label="Etsy listing ID" value={product.matched_etsy_listing_id} />
          <Fact label="Основной ID исходного листинга" value={product.primary_source_listing_id} />
        </section>

        {product.source_url ? (
          <div className="notice" style={{ marginTop: '18px' }}>
            Источник данных: <a href={product.source_url} target="_blank" rel="noreferrer">{product.source_url}</a>
          </div>
        ) : null}

        <section className="section-head">
          <div>
            <h2>Текущие факты о товаре</h2>
            <p className="muted">Факты, которые сейчас доступны системе и используются как основа дальнейшей работы.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Тип товара" value={product.product_type} />
          <Fact label="Материал" value={product.material} />
          <Fact label="Цвет" value={product.color} />
          <Fact label="Размерный режим" value={product.size_mode} />
          <Fact label="Производство" value={product.production_profile} />
          <Fact label="Доставка" value={product.shipping_profile} />
          <Fact label="Ручная работа" value={yesNo(product.handmade_flag)} />
          <Fact label="Стилизованные изображения" value={yesNo(product.styled_imagery_flag)} />
        </section>

        <section className="section-head">
          <div>
            <h2>Контент и SEO</h2>
            <p className="muted">Текущие черновики. На этой странице ничего не переписывается автоматически.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Черновой заголовок сайта" value={product.draft_site_title} />
          <Fact label="Заголовок карточки" value={product.card_title} />
          <Fact label="H1" value={product.h1} />
          <Fact label="SEO-заголовок" value={product.seo_title} />
          <Fact label="Meta description" value={product.meta_description} />
          <Fact label="Внутренние заметки" value={product.notes} />
        </section>

        <section className="section-head">
          <div>
            <h2>Готовность SEO-задания</h2>
            <p className="muted">Показатели готовности SEO-задания для этого товара.</p>
          </div>
        </section>

        {seoReadiness ? (
          <section className="grid pdp-section-grid">
            <Fact label="Статус SEO-задания" value={seoReadiness.seo_brief_readiness_status} />
            <Fact label="Очередность" value={seoReadiness.seo_brief_priority_order} />
            <Fact label="Медиа / публичные медиа" value={`${seoReadiness.media_count ?? 0} / ${seoReadiness.public_media_count ?? 0}`} />
            <Fact label="Покрытие ALT-текстами" value={seoReadiness.alt_text_count} />
            <Fact label="Варианты / публичные варианты" value={`${seoReadiness.sellable_configuration_count ?? 0} / ${seoReadiness.public_configuration_count ?? 0}`} />
            <Fact label="Черновики контента" value={seoReadiness.content_draft_count} />
            <Fact label="Черновики SEO-заголовков" value={seoReadiness.content_seo_title_count} />
            <Fact label="Черновики meta description" value={seoReadiness.content_meta_count} />
            <Fact label="Черновики полного описания" value={seoReadiness.content_full_description_count} />
          </section>
        ) : (
          <div className="notice">Для этого товара пока нет данных о готовности SEO-задания.</div>
        )}

        <section className="section-head">
          <div>
            <h2>Варианты и цены</h2>
            <p className="muted">{configurations.length} вариантов из текущего Product Builder.</p>
          </div>
        </section>

        {configurations.length ? (
          <div className="configuration-list">
            {configurations.map((configuration, index) => {
              const prices = getPrices(configuration);
              return (
                <div className="configuration-card" key={configuration.sellable_configuration_id || `configuration-${index}`}>
                  <div className="section-head" style={{ margin: 0 }}>
                    <div>
                      <h3>{configuration.configuration_name || configuration.normalized_key || `Вариант ${index + 1}`}</h3>
                      <p>{asText(configuration.normalized_key)}</p>
                    </div>
                    <span className={`status-pill ${getStatusClass(configuration.review_status)}`}>{builderStatusLabel(configuration.review_status, 'Не проверено')}</span>
                  </div>
                  <div className="badge-row">
                    {configuration.is_public_candidate ? <span className="badge">Кандидат для публикации</span> : <span className="badge">Не для публикации</span>}
                    {configuration.is_sampler ? <span className="status-pill warning">Пробник</span> : null}
                    {configuration.is_default_whole_product ? <span className="badge">Полный товар</span> : null}
                  </div>
                  <div className="configuration-list">
                    {prices.length ? prices.map((price, priceIndex) => (
                      <div className="configuration-card" key={price.configuration_price_id || `price-${priceIndex}`}>
                        <strong>{formatMoney(price.public_price_amount ?? price.manual_override_amount ?? price.source_amount, price.source_currency)}</strong>
                        <div className="badge-row">
                          <span className={`status-pill ${getStatusClass(price.review_status)}`}>{builderStatusLabel(price.review_status, 'Не проверено')}</span>
                          {price.fallback_flag ? <span className="status-pill warning">Резервная цена</span> : null}
                          {price.sampler_excluded_flag ? <span className="badge">Пробник исключён</span> : null}
                          {price.confidence != null ? <span className="badge">Уверенность {price.confidence}</span> : null}
                        </div>
                      </div>
                    )) : <div className="notice">Нет строк с ценами.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="notice">Нет доступных вариантов.</div>}

        <section className="section-head">
          <div>
            <h2>Медиа</h2>
            <p className="muted">{media.length} медиа-строк. Это проверка готовности, а не редактор медиа.</p>
          </div>
        </section>

        {media.length ? (
          <div className="configuration-list">
            {media.map((item, index) => (
              <div className="configuration-card" key={item.media_draft_id || `media-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>Изображение {item.source_image_order ?? index + 1}</h3>
                  <span className={`status-pill ${getStatusClass(item.readiness_status)}`}>{builderStatusLabel(item.readiness_status, 'Не начато')}</span>
                </div>
                <p>{item.alt_text_draft || 'ALT-текст пока отсутствует.'}</p>
                <div className="badge-row">
                  {item.assigned_role ? <span className="badge">{item.assigned_role}</span> : null}
                  {item.ai_styled_image_flag ? <span className="badge">Стилизовано / AI</span> : null}
                  {item.use_publicly_flag ? <span className="badge">Кандидат для публикации</span> : null}
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{builderStatusLabel(item.review_status, 'Не проверено')}</span>
                </div>
                {item.source_image_url ? (
                  <p style={{ marginTop: '12px' }}>
                    <a href={item.source_image_url} target="_blank" rel="noreferrer">Открыть исходное изображение</a>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : <div className="notice">Нет медиа.</div>}

        <section className="section-head">
          <div>
            <h2>Черновики контента</h2>
            <p className="muted">{content.length} строк контента по языкам.</p>
          </div>
        </section>

        {content.length ? (
          <div className="configuration-list">
            {content.map((item, index) => (
              <div className="configuration-card" key={item.content_draft_id || `content-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>{item.content_language || 'Язык не указан'}</h3>
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{builderStatusLabel(item.review_status, 'Не начато')}</span>
                </div>
                <p><strong>H1:</strong> {asText(item.h1)}</p>
                <p><strong>SEO-заголовок:</strong> {asText(item.seo_title)}</p>
                <p><strong>Meta description:</strong> {asText(item.meta_description)}</p>
                <div className="badge-row">
                  <span className="badge">AI: {builderStatusLabel(item.ai_content_status, 'Не начато')}</span>
                  <span className="badge">Сниппеты: {builderStatusLabel(item.snippet_status, 'Не начато')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="notice">Нет черновиков контента.</div>}

        <section className="section-head">
          <div>
            <h2>Сопоставление с исходными данными</h2>
            <p className="muted">{matches.length} строк доказательств, связывающих импортированные листинги и цены с этим товаром.</p>
          </div>
        </section>

        {matches.length ? (
          <div className="configuration-list">
            {matches.map((item, index) => (
              <div className="configuration-card" key={item.listing_match_id || `match-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>{builderStatusLabel(item.match_status, 'Сопоставление')}</h3>
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{builderStatusLabel(item.review_status, 'Не проверено')}</span>
                </div>
                <p>{asText(item.notes)}</p>
                <div className="badge-row">
                  {item.match_confidence != null ? <span className="badge">Уверенность {item.match_confidence}</span> : null}
                  {item.do_not_import_flag ? <span className="status-pill danger">Не импортировать</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="notice">Нет строк сопоставления с источником.</div>}

        <section className="section-head">
          <div>
            <h2>Защищённая SEO-диагностика</h2>
            <p className="muted">Эти данные не показываются через открытый режим просмотра админки.</p>
          </div>
        </section>

        <div className="notice">
          SEO Product Truth v4 уже существует в Supabase, но намеренно не загружается через открытый режим просмотра. Он будет подключён только после включения защищённого доступа владельца.
        </div>
      </div>
    </main>
  );
}
