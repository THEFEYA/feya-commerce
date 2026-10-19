/**
 * Owner-facing presentation of eight 18 Sep 2026 CANONICAL FEYA Growth OS roles.
 * Visual organization is a PASSPORT POSSIBILITY, never a saved handoff, workflow
 * or approval. No runtime permissions are granted from this module.
 */
import type {MissionRoleCode} from './missionControlProjection';

export type MissionParticipant=MissionRoleCode|'OWNER';

export const missionRolePresentation:Record<MissionRoleCode,{
  name:string;section:string;mission:string;scope:string;
}>={
  GROWTH_DIRECTOR:{
    name:'Директор роста',section:'Стратегия',
    mission:'Сопоставляет подтверждённые возможности и предлагает приоритеты роста владельцу.',
    scope:'Не меняет стратегию или Production самостоятельно.',
  },
  OSPM:{
    name:'Портфель поиска',section:'Органический поиск',
    mission:'Определяет задачи страниц, поисковые намерения и возможности органического роста.',
    scope:'Не публикует страницы и не меняет утверждённые Product Truth.',
  },
  SCO:{
    name:'SEO-контент',section:'Контент',
    mission:'Создаёт предложения текстов в рамках утверждённого SEO-задания.',
    scope:'Не публикует изменения и передаёт их на независимую проверку.',
  },
  CQA:{
    name:'Качество контента',section:'Независимая проверка',
    mission:'Проверяет факты, соответствие заданиям и безопасность SEO-предложений.',
    scope:'Не пишет и не одобряет собственную замену текста.',
  },
  TSEO:{
    name:'Техническое SEO',section:'Техническое состояние',
    mission:'Сверяет ожидаемое состояние поиска с наблюдаемым состоянием сайта.',
    scope:'Предлагает исправления; выпуск возможен только через утверждённый шлюз.',
  },
  GMEL:{
    name:'Измерения и обучение',section:'Результаты',
    mission:'Заранее определяет измерение, ограничения доказательств и результат изменений.',
    scope:'Не объявляет причинный эффект без достаточных данных.',
  },
  GDAE:{
    name:'Данные и аналитика',section:'Инфраструктура данных',
    mission:'Проверяет источники, свежесть, сопоставимость и происхождение данных.',
    scope:'Не выбирает бизнес-стратегию и не придумывает отсутствующие значения.',
  },
  CPIM:{
    name:'Коммерческая аналитика',section:'Товары и воронка',
    mission:'Интерпретирует коммерческие сигналы товаров и вариантов при достаточных данных.',
    scope:'Не меняет цены, продукт и коммерческую политику самостоятельно.',
  },
};

/**
 * Approved ORGANIZATIONAL interaction map — dashed schematic links only.
 * A particular event must still come from the persisted canonical handoff log.
 */
export const missionOrganizationalLinks:readonly {
  source:MissionParticipant;target:MissionParticipant;
}[]=[
  {source:'OWNER',target:'GROWTH_DIRECTOR'},
  {source:'GROWTH_DIRECTOR',target:'OSPM'},
  {source:'GROWTH_DIRECTOR',target:'CPIM'},
  {source:'GROWTH_DIRECTOR',target:'GMEL'},
  {source:'OSPM',target:'SCO'},
  {source:'SCO',target:'CQA'},
  {source:'OSPM',target:'TSEO'},
  {source:'GDAE',target:'OSPM'},
  {source:'GDAE',target:'GMEL'},
  {source:'CPIM',target:'GMEL'},
  {source:'TSEO',target:'GMEL'},
];

export const missionAutonomyLabel:Record<string,string>={
  OBSERVE_ONLY:'Только наблюдение',
  PROPOSE_ONLY:'Может предлагать',
  SHADOW_ACTIONS:'Тестовые действия',
  CONTROLLED_ACTIONS:'Разрешённые ограниченные действия',
};
