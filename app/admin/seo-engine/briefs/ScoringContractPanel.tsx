import type { SeoScoringContract, SeoScoringDecisionRule, SeoScoringFactor } from '@/lib/seoPilotDraft';

export function ScoringContractPanel({ contract }: { contract: SeoScoringContract }) {
  const roleLabel: Record<SeoScoringDecisionRule['role'], string> = {
    primary: 'главный',
    secondary: 'вторичный',
    supporting: 'поддержка',
    long_tail: 'long-tail',
    image_alt: 'alt-фото',
    faq: 'FAQ',
    collection: 'коллекция',
    hold: 'удержать',
    reject: 'исключить',
  };

  const pill = (value: string) => (
    <span key={value} className="rounded-full border border-[rgba(216,214,211,.10)] bg-black/20 px-2 py-1 text-[10px] text-[var(--bone-dim)]">
      {value}
    </span>
  );

  const chip = (value: string, danger = false) => (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${danger ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'}`}>
      {value}
    </span>
  );

  return <div className="space-y-4">
    <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-4">
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-bone text-[14px]">Формула будущего scoring</div>
            <div className="mt-1 text-[10px] leading-relaxed text-[var(--smoke)]">Сейчас баллы не считаются, потому что реальные метрики ещё не вернулись.</div>
          </div>
          {chip('ожидает метрики')}
        </div>
        <div className="mt-3 rounded-lg border border-[rgba(216,214,211,.08)] bg-black/30 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">{contract.formula}</div>
        <div className="mt-3 text-[11px] text-[var(--bone-dim)]">Максимум: <span className="text-bone">{contract.totalMaxScore}</span> баллов. Финальный ключ появляется только после метрик и hard gates.</div>
      </div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
        <div className="text-bone text-[14px] mb-2">Обязательные поля метрик</div>
        <div className="flex flex-wrap gap-1.5">{contract.requiredMetricFields.map(pill)}</div>
      </div>
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
      {contract.factors.map((factor: SeoScoringFactor) => <div key={factor.id} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3"><div className="text-bone text-[13px] leading-snug">{factor.label}</div><div className="text-[13px] text-[var(--gold-warm)]">{factor.maxPoints}</div></div>
        <div className="mt-2 text-[10px] leading-relaxed text-[var(--bone-dim)]">{factor.purpose}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{factor.requiredInputs.map(pill)}</div>
      </div>)}
    </div>

    <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-4">
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
        <div className="text-bone text-[14px] mb-2">Жёсткие стоп-правила</div>
        <div className="space-y-2">{contract.hardGates.map((gate: string) => <div key={gate} className="rounded-lg border border-[rgba(196,64,88,.20)] bg-[rgba(160,32,56,.05)] p-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{gate}</div>)}</div>
      </div>
      <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
        <div className="text-bone text-[14px] mb-2">Правила распределения в портфель</div>
        <div className="grid md:grid-cols-2 gap-2">{contract.decisionRules.map((rule: SeoScoringDecisionRule) => <div key={rule.role} className="rounded-lg border border-[rgba(216,214,211,.08)] bg-black/20 p-2">
          <div className="flex items-center justify-between gap-2"><div className="text-[12px] text-bone">{rule.label}</div>{chip(roleLabel[rule.role], rule.role === 'reject')}</div>
          <div className="mt-1 text-[10px] leading-relaxed text-[var(--bone-dim)]">{rule.rule}</div>
        </div>)}</div>
      </div>
    </div>
  </div>;
}
