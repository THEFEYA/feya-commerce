# FEYA Owner UI — Russian Terminology Canon v1

Status: CANONICAL OWNER-FACING COPY BASELINE
Scope: normal Owner UI only
Date: 2026-09-18

## 1. Core rule

Normal FEYA Owner UI is Russian-first.

Do not display raw backend enums, acronyms or internal codes as primary labels.

Examples:
- `OWNER_ATTENTION` -> **Требует вашего решения**
- `AVAILABLE_WITH_LIMITATIONS` -> **Работает с ограничениями**
- `READY_FOR_INDEPENDENT_CQA` -> **Готово к независимой проверке качества**
- `DEFER_UNTIL_ACTIVE_OBJECTIVE` -> **Отложено до появления активной цели**

Canonical code may be shown only under **Технические детали**.

## 2. Main navigation

- Today -> **Сегодня**
- Work -> **Работа**
- Growth -> **Рост**
- Products -> **Товары**
- Results -> **Результаты**
- System -> **Система**
- Advanced -> **Технические детали**
- Search -> **Поиск**
- Team FEYA -> **Команда FEYA**

Do not expose English navigation labels in normal owner mode.

## 3. Canonical role names

Backend role -> Owner-facing Russian:

- Growth Director -> **Директор по росту**
- OSPM -> **Стратег органического поиска**
- CPIM -> **Аналитик товаров и продаж**
- GMEL -> **Аналитик результатов и экспериментов**
- SCO -> **Редактор SEO-контента**
- CQA -> **Контроль качества контента**
- TSEO -> **Специалист по техническому SEO**
- GDAE -> **Инженер данных и аналитики**

Acronyms may appear only in Technical details.

Natural sentence:
**Передано контролю качества контента**

Not:
**Handoff -> CQA**

## 4. Runtime / workflow states

- INACTIVE -> **Не активирован**
- SHADOW -> **Режим наблюдения**
- ACTIVE -> **Активен**
- PAUSED -> **Приостановлен**

- OPEN -> **Открыто**
- ACKNOWLEDGED -> **Принято к рассмотрению**
- QUEUED -> **В очереди**
- RUNNING -> **В работе**
- WAITING -> **Ожидает**
- WAITING_FOR_DATA -> **Ждёт данных**
- WAITING_FOR_CONDITION -> **Ждёт условия**
- WAITING_FOR_OWNER -> **Ждёт вашего решения**
- BLOCKED -> **Заблокировано**
- COMPLETED -> **Работа завершена**
- MEASURING -> **Измеряем результат**
- LEARNING -> **Формируем вывод**
- CLOSED -> **Закрыто**
- CANCELLED -> **Отменено**

## 5. Capability / health states

- AVAILABLE -> **Работает**
- AVAILABLE_WITH_LIMITATIONS -> **Работает с ограничениями**
- DEGRADED -> **Работает нестабильно**
- UNAVAILABLE -> **Недоступно**
- NOT_OBSERVABLE -> **Недостаточно данных**
- STALE -> **Данные устарели**

Prefer an explanation below the state.

Example:
**Работает с ограничениями**
Google Ads подключён, но исторические данные по ключевым словам пока недоступны из-за внешнего ограничения доступа.

## 6. Check states

- NOT_RUN -> **Ещё не проверено**
- PASS -> **Проверка пройдена**
- WARN -> **Нужно проверить**
- FAIL -> **Проверка не пройдена**
- ERROR -> **Ошибка проверки**

## 7. Attention language

Do not mix severity, owner requirement and workflow status.

Owner requirement:
- HUMAN_REQUIRED -> **Нужно ваше решение**
- SAFE_DELEGATION -> **Можно поручить FEYA**
- OBSERVATION -> **Наблюдаем**
- FYI -> **Для сведения**

Severity:
- CRITICAL -> **Критично**
- IMPORTANT / material P1-P2 -> **Важно**
- normal -> no severity badge unless it helps.

Opportunity is not a green severity. It is a separate type:
**Возможность**

## 8. Owner actions

Preferred:
- Approve -> **Утвердить** / **Подтвердить** depending on object
- Reject -> **Отклонить**
- Investigate -> **Исследовать**
- Defer -> **Отложить**
- Snooze -> **Напомнить позже**
- Assign -> **Поручить команде FEYA**
- Create task -> **Создать задачу**
- Follow -> **Следить**
- Hide -> **Скрыть**
- Mute type -> **Не показывать такой тип**
- No action -> **Оставить без изменений**
- Add note -> **Добавить заметку**
- View evidence -> **Посмотреть данные**
- Advanced -> **Технические детали**
- Check rollback -> **Проверить возможность отката**

Dangerous actions must describe the actual consequence.

Prefer:
**Опубликовать 12 изменений**

Not:
**Подтвердить**

## 9. Signal structure

Visible headings:
- **Что произошло**
- **Почему это важно**
- **Что предлагает FEYA**
- **Что требуется от вас**
- **Что будет дальше**
- **Данные и доказательства**
- **Возможные объяснения**
- **Ограничения данных**

Do not say a hypothesis is a cause.

Prefer:
**Возможное объяснение: две страницы начали показываться по одним и тем же запросам.**

Then:
**Данных пока недостаточно, чтобы считать это установленной причиной.**

## 10. Evidence language

Do not display invented AI confidence percentages.

Use:
- **Надёжность высокая**
- **Надёжность средняя**
- **Надёжность низкая**
- **Недостаточно данных для вывода**

Always explain why when relevant.

## 10.1 Data quality language

- current/fresh -> **Данные актуальны**
- delayed -> **Данные обновлены с задержкой**
- partial -> **Показатель временно неполный**
- unavailable for conclusion -> **Недостаточно данных для вывода**

Show this beside the affected metric/signal when it changes interpretation.

## 10.2 Evidence type language

- fact from authoritative source -> **Подтверждено данными**
- system inference -> **Вероятное объяснение**
- recommended next step -> **FEYA предлагает**
- unverified possibility -> **Нужно проверить**

Never present **Вероятное объяснение** as a confirmed cause.

## 11. Product workspace vocabulary

Tabs:
- **Обзор**
- **Факты**
- **Контент и поиск**
- **Медиа**
- **Цены и варианты**
- **История**
- **Технические детали**

Until real commerce/order truth exists, do not label the current price/configuration tab as a full **Продажи** analytics surface.

## 12. Growth workspace vocabulary

- Opportunities -> **Возможности**
- Demand -> **Спрос**
- Pages -> **Страницы**
- Technical SEO -> **Техническое SEO**
- Query cluster -> primary copy **Группа поисковых запросов**
  - short table label may be **Группа запросов**
  - canonical term `query_cluster` only in Technical details
- Page ownership -> **Ответственность страницы за запросы**
- Indexability -> **Допуск к индексации**
- Protected winner -> **Защищённая успешная страница** or shorter contextual copy **Защищена от лишних изменений**

## 13. Results vocabulary

- Outcome -> **Результат**
- Experiment -> **Эксперимент**
- Change -> **Изменение**
- Learning -> **Вывод**
- Measurement -> **Измерение результата**
- Evidence ceiling -> **Уровень надёжности вывода**

State sequence:
**Работа завершена -> Измеряем результат -> Результат получен -> Вывод сохранён**

Never equate completed execution with business success.

## 14. System vocabulary

- Readiness -> **Готовность**
- Data sources -> **Источники данных**
- Data health -> **Состояние данных**
- Permissions -> **Права и автоматизация**
- AI usage -> **Использование AI**
- Incidents -> **Сбои и критические проблемы**
- Capability Registry -> normal summary **Возможности системы**
- Metric Registry -> Technical details only
- Source-of-Truth Registry -> Technical details only
- Execution Gateway -> Technical details only
- Scenario Tests -> **Проверки надёжности** under Technical details

## 15. Copy style

Owner-facing copy:
- short;
- factual;
- actionable;
- no corporate filler;
- no agent role acronym unless the user asks;
- no raw JSON;
- no unexplained percentages;
- no "AI decided";
- distinguish fact / hypothesis / recommendation.

Preferred pattern:
**Что произошло**
**Почему важно**
**Что предлагает FEYA**
**Нужно ли ваше решение**

Avoid long explanatory paragraphs on cards.
Use drawers/full detail for depth.


## 16. What must stay in the original language

Russian-first applies to interface semantics, not to the business data itself.

Keep original language for:
- product titles;
- keyword/query text;
- H1/SEO title/meta content targeted to a non-Russian market;
- slugs and URLs;
- marketplace source text where translation would change evidence;
- canonical technical IDs in Technical details.

Translate the surrounding UI.

Example:
- **Ключевой запрос:** `silver harness`
- **Название товара:** `Metallic Fringe Harness Set Top & Skirt...`
- **Статус:** **Готово к проверке**

Never translate a search query merely to make the UI visually Russian.
